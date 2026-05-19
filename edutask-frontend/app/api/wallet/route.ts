import { requireAuth } from '@/lib/api-auth'
import { apiErr, apiOk } from '@/lib/api-route'

export async function GET() {
  const { user, profile } = await requireAuth()
  if (!user) return apiErr('Unauthorized', 401)

  if (!profile) return apiErr('Profile not found', 404)

  return apiOk({
    wallet_balance: Number(profile.wallet_balance),
    escrow_balance: Number(profile.escrow_balance),
    total_earned: Number(profile.total_earned),
  })
}
