export async function fetchTasks(params: { category?: string; search?: string; limit?: number } = {}) {
  const p = new URLSearchParams({ limit: String(params.limit ?? 50) })
  if (params.category && params.category !== 'All') p.set('category', params.category)
  if (params.search?.trim()) p.set('search', params.search.trim())
  const res = await fetch(`/api/tasks?${p}`)
  const json = await res.json()
  if (!json.success) throw new Error(json.error ?? 'Failed to load tasks')
  return json.data ?? []
}

export async function fetchTask(id: string) {
  const res = await fetch(`/api/tasks/${id}`)
  const json = await res.json()
  if (!json.success) throw new Error(json.error ?? 'Task not found')
  return json.data
}

export async function fetchMyTasks(userId: string, supabase: any) {
  const [{ data: posted }, { data: apps }, { data: active }] = await Promise.all([
    supabase.from('tasks').select('*, applications(count)').eq('poster_id', userId).order('created_at', { ascending: false }),
    supabase.from('applications').select('*, task:tasks(*)').eq('worker_id', userId).order('created_at', { ascending: false }),
    supabase.from('tasks').select('*').or(`poster_id.eq.${userId},hired_worker_id.eq.${userId}`).in('status', ['hired', 'in_progress', 'under_review']).order('created_at', { ascending: false }),
  ])
  return { posted: posted ?? [], applications: apps ?? [], active: active ?? [] }
}
