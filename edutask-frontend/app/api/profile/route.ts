import { requireAuth } from '@/lib/api-auth'
import { apiErr, apiOk, parseJsonBody } from '@/lib/api-route'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sanitizeText } from '@/lib/utils'
import { rateLimitByIP } from '@/lib/rate-limit'
import type { Database } from '@/types'
import { updateProfileSchema } from '@/lib/validations/task.schema'

const PROFILE_SELECT =
  'id, email, full_name, phone, university_name, department, student_id_text, student_id_verified, profile_photo_url, bio, location, skills, trust_score, completed_tasks, total_reviews, average_rating, wallet_balance, escrow_balance, total_earned, referral_code, bkash_number, nagad_number, profile_complete, email_verified, created_at'

const ALLOWED_KEYS = [
  'full_name',
  'bio',
  'location',
  'skills',
  'profile_photo_url',
  'bkash_number',
  'nagad_number',
] as const

type ProfileUpdatePayload = Pick<
  Database['public']['Tables']['users']['Update'],
  (typeof ALLOWED_KEYS)[number]
>

export async function PATCH(request: Request) {
  const { user, profile } = await requireAuth()
  if (!user) return apiErr('Unauthorized', 401)
  if (profile?.is_banned) return apiErr('Your account is suspended', 403)

  const rateLimit = rateLimitByIP(request, 'profile-update', 20, 60 * 1000)
  if (!rateLimit.ok) return apiErr('Too many updates. Slow down.', 429)

  const parsedBody = await parseJsonBody(request)
  if (!parsedBody.ok) return parsedBody.response

  const parsed = updateProfileSchema.safeParse(parsedBody.body)
  if (!parsed.success) {
    return apiErr(parsed.error.errors[0].message, 400)
  }

  const updates: ProfileUpdatePayload = {}

  if (parsed.data.full_name !== undefined) updates.full_name = parsed.data.full_name
  if (parsed.data.bio !== undefined) updates.bio = sanitizeText(parsed.data.bio)
  if (parsed.data.location !== undefined) updates.location = sanitizeText(parsed.data.location)
  if (parsed.data.skills !== undefined) {
    updates.skills = parsed.data.skills.map((skill) => sanitizeText(skill))
  }
  if (parsed.data.profile_photo_url !== undefined) {
    updates.profile_photo_url = parsed.data.profile_photo_url
  }
  if (parsed.data.bkash_number !== undefined) updates.bkash_number = parsed.data.bkash_number
  if (parsed.data.nagad_number !== undefined) updates.nagad_number = parsed.data.nagad_number

  const { data: updated, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select(PROFILE_SELECT)
    .single()

  if (error || !updated) {
    return apiErr('Failed to update profile', 500)
  }

  return apiOk(updated)
}
