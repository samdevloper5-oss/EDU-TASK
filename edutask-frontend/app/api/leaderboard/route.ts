import { apiErr, apiOk } from '@/lib/api-route'
import { createClient } from '@/utils/supabase/server'

export const revalidate = 60

const LEADERBOARD_FIELDS =
  'id, full_name, profile_photo_url, university_name, trust_score, completed_tasks, average_rating, total_reviews'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('users')
    .select(LEADERBOARD_FIELDS)
    .eq('is_banned', false)
    .eq('profile_complete', true)
    .order('trust_score', { ascending: false })
    .order('completed_tasks', { ascending: false })
    .limit(20)

  if (error) return apiErr('Failed to load leaderboard', 500)

  const ranked = (data ?? []).map((entry, index) => ({
    rank: index + 1,
    ...entry,
  }))

  return apiOk(ranked)
}

