'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClipboardList, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function MyTasksPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'posted' | 'applied' | 'active'>('posted')
  const [tasks, setTasks] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [activeTasks, setActiveTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [{ data: posted }, { data: apps }, { data: active }] = await Promise.all([
        supabase.from('tasks').select('*, applications(count)').eq('poster_id', user.id).order('created_at', { ascending: false }),
        supabase.from('applications').select('*, task:tasks(*)').eq('worker_id', user.id).order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').or(`poster_id.eq.${user.id},hired_worker_id.eq.${user.id}`).in('status', ['hired', 'in_progress', 'under_review']).order('created_at', { ascending: false }),
      ])

      setTasks(posted ?? [])
      setApplications(apps ?? [])
      setActiveTasks(active ?? [])
      setLoading(false)
    }
    fetchData()
  }, [supabase, tab])

  const handleHire = async (taskId: string, workerId: string) => {
    const { error } = await supabase.from('tasks').update({ status: 'hired', hired_worker_id: workerId }).eq('id', taskId)
    if (error) { toast.error(error.message); return }
    toast.success('Worker hired!')
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: 'hired', hired_worker_id: workerId } : t))
  }

  const tabs = [
    { key: 'posted', label: `Posted (${tasks.length})` },
    { key: 'applied', label: `Applied (${applications.length})` },
    { key: 'active', label: `Active (${activeTasks.length})` },
  ] as const

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>My Tasks</h1>

      <div className="flex gap-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : tab === 'posted' ? (
        tasks.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>You haven&apos;t posted any tasks yet</p>
            <Link href="/post-task"><Button className="mt-4 bg-primary text-primary-foreground">Post a Task</Button></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <Card key={task.id} className="p-5 border-border">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm">{task.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Status: <span className="capitalize font-medium text-primary">{task.status}</span></p>
                    <p className="text-xs text-muted-foreground mt-1">{task.applicant_count ?? 0} applicants</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary">{task.budget?.toLocaleString()}৳</p>
                    {task.status === 'open' && (
                      <Link href={`/tasks/${task.id}`}>
                        <Button size="sm" variant="outline" className="mt-2">View</Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : tab === 'applied' ? (
        applications.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No applications yet</p>
            <Link href="/tasks"><Button className="mt-4 bg-primary text-primary-foreground">Browse Tasks</Button></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <Card key={app.id} className="p-5 border-border">
                <h3 className="font-semibold text-sm">{app.task?.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">Status: <span className="capitalize font-medium">{app.status}</span></p>
              </Card>
            ))}
          </div>
        )
      ) : (
        activeTasks.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No active tasks</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeTasks.map((task) => (
              <Card key={task.id} className="p-5 border-border">
                <h3 className="font-semibold text-sm">{task.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">Status: <span className="capitalize font-medium text-primary">{task.status}</span></p>
                <Link href={`/chat/${task.id}`}>
                  <Button size="sm" variant="outline" className="mt-3">Open Chat</Button>
                </Link>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  )
}
