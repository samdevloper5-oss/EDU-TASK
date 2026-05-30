import { apiErr, apiOk } from '@/lib/api-route'
import { createClient } from '@/utils/supabase/server'

const PROFILE_PUBLIC =
  'id, full_name, profile_photo_url, bio, location, skills, university_name, department, trust_score, completed_tasks, total_reviews, average_rating, student_id_verified, created_at'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const supabase = await createClient()

  const { data: user, error } = await supabase
    .from('users')
    .select(PROFILE_PUBLIC)
    .eq('id', userId)
    .eq('is_banned', false)
    .single()

  if (error || !user) {
    return apiErr('Profile not found', 404)
  }

  const { data: reviews } = await supabase
    .from('reviews')
    .select(
      `id, rating, comment, created_at, reviewer:users!reviews_reviewer_id_fkey(id, full_name, profile_photo_url)`
    )
    .eq('reviewed_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  return apiOk({
    profile: user,
    reviews: reviews ?? [],
  })
}

