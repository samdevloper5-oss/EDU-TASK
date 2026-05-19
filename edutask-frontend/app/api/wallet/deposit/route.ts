import { requireAuth } from '@/lib/api-auth'
import { apiErr, apiOk, parseJsonBody, roundMoney } from '@/lib/api-route'
import { rateLimitByIP } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { depositSchema } from '@/lib/validations/task.schema'

export async function POST(request: Request) {
  if (!rateLimitByIP(request, 'wallet-deposit', 5, 15 * 60 * 1000).ok) {
    return apiErr('Too many deposit attempts. Please try again later.', 429)
  }

  const { user, profile } = await requireAuth()
  if (!user) return apiErr('Unauthorized', 401)
  if (profile?.is_banned) return apiErr('Your account is suspended', 403)

  const parsedBody = await parseJsonBody(request)
  if (!parsedBody.ok) return parsedBody.response

  const parsed = depositSchema.safeParse(parsedBody.body)
  if (!parsed.success) {
    return apiErr(parsed.error.errors[0].message, 400)
  }

  const amount = roundMoney(parsed.data.amount)
  const newBalance = roundMoney(Number(profile?.wallet_balance ?? 0) + amount)

  const { data: updatedUser, error: userError } = await supabaseAdmin
    .from('users')
    .update({ wallet_balance: newBalance })
    .eq('id', user.id)
    .select('wallet_balance, escrow_balance, total_earned')
    .single()

  if (userError || !updatedUser) {
    return apiErr('Failed to update balance', 500)
  }

  const { data: transaction, error: txError } = await supabaseAdmin
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'deposit',
      amount,
      fee: 0,
      net_amount: amount,
      method: parsed.data.method,
      status: 'completed',
      notes:
        parsed.data.method === 'demo'
          ? 'Demo deposit'
          : `${parsed.data.method} deposit (simulated)`,
    })
    .select('*')
    .single()

  if (txError) {
    await supabaseAdmin
      .from('users')
      .update({ wallet_balance: profile?.wallet_balance ?? 0 })
      .eq('id', user.id)
    return apiErr('Failed to record deposit', 500)
  }

  return apiOk({
    wallet_balance: Number(updatedUser.wallet_balance),
    escrow_balance: Number(updatedUser.escrow_balance),
    total_earned: Number(updatedUser.total_earned),
    transaction,
  })
}
