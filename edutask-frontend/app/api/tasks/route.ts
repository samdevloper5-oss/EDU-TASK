import { requireAuth } from '@/lib/api-auth'
import { apiErr, apiOk, parseJsonBody, parsePagination, paginationFrom } from '@/lib/api-route'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TaskCategory } from '@/types'
import { sanitizeText } from '@/lib/utils'
import { createTaskSchema } from '@/lib/validations/task.schema'

export const revalidate = 15

const POSTER_FIELDS =
  'id, full_name, profile_photo_url, trust_score, average_rating, university_name, student_id_verified'

const TASK_CATEGORIES: TaskCategory[] = [
  'Design',
  'Coding',
  'Research',
  'Writing',
  'Data Entry',
  'Translation',
  'Media',
  'Academic Help',
  'Other',
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')?.trim()
  const { page, limit, from, to } = parsePagination(searchParams)

  const supabase = await createClient()
  let query = supabase
    .from('tasks')
    .select(`*, poster:users!tasks_poster_id_fkey(${POSTER_FIELDS})`, { count: 'exact' })
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (category) {
    if (!TASK_CATEGORIES.includes(category as TaskCategory)) {
      return apiErr('Invalid category filter', 400)
    }
    query = query.eq('category', category as TaskCategory)
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  }

  const { data, error, count } = await query
  if (error) {
    return apiErr('Failed to load tasks', 500)
  }

  return apiOk(data ?? [], {
    pagination: paginationFrom(page, limit, count ?? 0),
  })
}

export async function POST(request: Request) {
  const { user, profile } = await requireAuth()
  if (!user) return apiErr('Unauthorized', 401)
  if (profile?.is_banned) return apiErr('Your account is suspended', 403)
  if (!profile?.profile_complete) {
    return apiErr('Complete your profile before posting tasks', 403)
  }

  const parsedBody = await parseJsonBody(request)
  if (!parsedBody.ok) return parsedBody.response

  const parsed = createTaskSchema.safeParse(parsedBody.body)
  if (!parsed.success) {
    return apiErr(parsed.error.errors[0].message, 400)
  }

  const deadline = new Date(parsed.data.deadline)
  if (Number.isNaN(deadline.getTime()) || deadline <= new Date()) {
    return apiErr('Deadline must be in the future', 400)
  }

  const title = sanitizeText(parsed.data.title)
  const description = sanitizeText(parsed.data.description)
  const location = parsed.data.location ? sanitizeText(parsed.data.location) : null
  const requiredSkills = parsed.data.required_skills.map((skill) => sanitizeText(skill))

  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      poster_id: user.id,
      title,
      description,
      category: parsed.data.category,
      task_mode: parsed.data.task_mode,
      budget: parsed.data.budget,
      deadline: parsed.data.deadline,
      required_skills: requiredSkills,
      location,
      status: 'open',
    })
    .select(`*, poster:users!tasks_poster_id_fkey(${POSTER_FIELDS})`)
    .single()

  if (error || !task) {
    return apiErr('Failed to create task', 500)
  }

  return apiOk(task, { status: 201 })
}

