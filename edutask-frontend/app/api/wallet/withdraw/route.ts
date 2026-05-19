import { requireAuth } from '@/lib/api-auth'
import { apiErr, apiOk, parseJsonBody, roundMoney } from '@/lib/api-route'
import { rateLimitByIP } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Database } from '@/types'
import { withdrawSchema } from '@/lib/validations/task.schema'

export async function POST(request: Request) {
  if (!rateLimitByIP(request, 'wallet-withdraw', 5, 15 * 60 * 1000).ok) {
    return apiErr('Too many withdrawal attempts. Please try again later.', 429)
  }

  const { user, profile } = await requireAuth()
  if (!user) return apiErr('Unauthorized', 401)
  if (profile?.is_banned) return apiErr('Your account is suspended', 403)

  const parsedBody = await parseJsonBody(request)
  if (!parsedBody.ok) return parsedBody.response

  const parsed = withdrawSchema.safeParse(parsedBody.body)
  if (!parsed.success) {
    return apiErr(parsed.error.errors[0].message, 400)
  }

  const amount = roundMoney(parsed.data.amount)
  const currentBalance = Number(profile?.wallet_balance ?? 0)

  if (currentBalance < amount) {
    return apiErr('Insufficient wallet balance', 400)
  }

  const newBalance = roundMoney(currentBalance - amount)

  const payoutField =
    parsed.data.method === 'bkash' ? 'bkash_number' : 'nagad_number'

  const userUpdates: Pick<
    Database['public']['Tables']['users']['Update'],
    'wallet_balance' | 'bkash_number' | 'nagad_number'
  > = {
    wallet_balance: newBalance,
    [payoutField]: parsed.data.phone,
  }

  const { data: updatedUser, error: userError } = await supabaseAdmin
    .from('users')
    .update(userUpdates)
    .eq('id', user.id)
    .select('wallet_balance, escrow_balance, total_earned')
    .single()

  if (userError || !updatedUser) {
    return apiErr('Failed to process withdrawal', 500)
  }

  const { data: transaction, error: txError } = await supabaseAdmin
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'withdrawal',
      amount,
      fee: 0,
      net_amount: -amount,
      method: parsed.data.method,
      status: 'completed',
      external_ref: parsed.data.phone,
      notes: `Demo withdrawal to ${parsed.data.method} ${parsed.data.phone}`,
    })
    .select('*')
    .single()

  if (txError) {
    await supabaseAdmin
      .from('users')
      .update({ wallet_balance: currentBalance })
      .eq('id', user.id)
    return apiErr('Failed to record withdrawal', 500)
  }

  return apiOk({
    wallet_balance: Number(updatedUser.wallet_balance),
    escrow_balance: Number(updatedUser.escrow_balance),
    total_earned: Number(updatedUser.total_earned),
    transaction,
  })
}
