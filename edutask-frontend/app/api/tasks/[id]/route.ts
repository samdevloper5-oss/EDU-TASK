import { requireAuth } from '@/lib/api-auth'
import { apiErr, apiOk } from '@/lib/api-route'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Application, Task, User } from '@/types'

const USER_PUBLIC =
  'id, full_name, profile_photo_url, trust_score, average_rating, university_name, department, bio, skills, completed_tasks, student_id_verified'

type PublicUser = Pick<
  User,
  | 'id'
  | 'full_name'
  | 'profile_photo_url'
  | 'trust_score'
  | 'average_rating'
  | 'university_name'
  | 'department'
  | 'bio'
  | 'skills'
  | 'completed_tasks'
  | 'student_id_verified'
>

type TaskDetails = Task & {
  poster: PublicUser | null
  worker: PublicUser | null
}

type TaskApplication = Application & {
  worker: PublicUser | null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('tasks')
    .select(
      `*,
      poster:users!tasks_poster_id_fkey(${USER_PUBLIC}),
      worker:users!tasks_hired_worker_id_fkey(${USER_PUBLIC})`
    )
    .eq('id', id)
    .single()

  const task = data as TaskDetails | null

  if (error || !task) {
    return apiErr('Task not found', 404)
  }

  const { user, profile } = await requireAuth()
  const isPoster = user?.id === task.poster_id
  const isWorker = user?.id === task.hired_worker_id
  const isAdmin = profile?.is_admin === true

  let applications: TaskApplication[] = []

  if (isPoster || isAdmin) {
    const { data: applicationData } = await supabaseAdmin
      .from('applications')
      .select(`*, worker:users!applications_worker_id_fkey(${USER_PUBLIC})`)
      .eq('task_id', id)
      .order('created_at', { ascending: false })
    applications = (applicationData ?? []) as TaskApplication[]
  } else if (user) {
    const { data: applicationData } = await supabase
      .from('applications')
      .select(`*, worker:users!applications_worker_id_fkey(${USER_PUBLIC})`)
      .eq('task_id', id)
      .eq('worker_id', user.id)
    applications = (applicationData ?? []) as TaskApplication[]
  }

  return apiOk({ ...task, applications })
}
