'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft, Loader2, Send, Users, Clock, CheckCircle2,
  Star, Building2, MessageCircle, UserCheck
} from 'lucide-react'
import { toast } from 'sonner'
import { fetchTask } from '@/lib/queries/tasks'
import { useAuthStore } from '@/lib/store/auth.store'

export default function TaskDetailPage() {
  const params = useParams()
  const taskId = params.id as string
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const supabase = createClient()

  const [proposal, setProposal] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [showApplyForm, setShowApplyForm] = useState(false)

  const { data: task, isLoading, error } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => fetchTask(taskId),
    staleTime: 10 * 1000,
  })

  const isPoster = user?.id === task?.poster_id
  const isWorker = user?.id === task?.hired_worker_id
  const myApplication = task?.applications?.find((a: any) => a.worker_id === user?.id)
  const hasApplied = !!myApplication

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!proposal || proposal.length < 20) throw new Error('Proposal must be at least 20 characters')
      const res = await fetch(`/api/tasks/${taskId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal, estimated_hours: estimatedHours ? Number(estimatedHours) : undefined }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Failed to apply')
      return json.data
    },
    onSuccess: () => {
      toast.success('Application submitted!')
      setShowApplyForm(false)
      qc.invalidateQueries({ queryKey: ['task', taskId] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const hireMutation = useMutation({
    mutationFn: async (workerId: string) => {
      const res = await fetch(`/api/tasks/${taskId}/hire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker_id: workerId }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Failed to hire worker')
      return json.data
    },
    onSuccess: (_, workerId) => {
      toast.success('Worker hired successfully!')
      qc.setQueryData(['task', taskId], (old: any) => ({
        ...old,
        status: 'in_progress',
        hired_worker_id: workerId,
      }))
      qc.invalidateQueries({ queryKey: ['task', taskId] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-8 w-32 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-muted animate-pulse rounded-2xl" />
        <div className="h-48 bg-muted animate-pulse rounded-2xl" />
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Task not found</p>
        <Link href="/tasks"><Button className="mt-4" variant="outline">Browse Tasks</Button></Link>
      </div>
    )
  }

  const deadline = new Date(task.deadline)
  const now = new Date()
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const deadlineColor = daysLeft < 1 ? 'text-red-500' : daysLeft <= 3 ? 'text-amber-500' : 'text-emerald-500'

  const statusColors: Record<string, string> = {
    open: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    hired: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    in_progress: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
    under_review: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    disputed: 'bg-red-500/10 text-red-600 border-red-500/20',
    cancelled: 'bg-muted text-muted-foreground border-border',
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <Link href="/tasks" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to tasks
      </Link>

      <Card className="p-6 border-border bg-card rounded-2xl shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">{task.category}</span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-lg border capitalize ${statusColors[task.status] ?? statusColors.open}`}>{task.status.replace('_', ' ')}</span>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-primary">{task.budget?.toLocaleString()}৳</p>
            <p className={`text-xs font-medium mt-0.5 flex items-center gap-1 justify-end ${deadlineColor}`}>
              <Clock className="w-3 h-3" />
              {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left` : 'Expired'}
            </p>
          </div>
        </div>

        <h1 className="text-xl font-bold mt-4 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{task.title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {(task.required_skills ?? []).map((s: string) => (
            <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">{s}</span>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm overflow-hidden shrink-0">
              {task.poster?.profile_photo_url
                ? <img src={task.poster.profile_photo_url} alt={task.poster.full_name} className="w-full h-full object-cover" />
                : task.poster?.full_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div>
              <p className="text-sm font-semibold">{task.poster?.full_name ?? 'Unknown'}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {task.poster?.university_name} · <Star className="w-3 h-3 text-amber-500 inline" /> {task.poster?.trust_score ?? 0}
              </p>
            </div>
          </div>

          {!isPoster && task.status === 'open' && (
            hasApplied ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-emerald-600 font-medium">
                  Applied — {myApplication?.status === 'pending' ? 'Under review' : myApplication?.status}
                </span>
              </div>
            ) : (
              <Button
                onClick={() => setShowApplyForm(!showApplyForm)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
              >
                Apply Now
              </Button>
            )
          )}

          {(isWorker || task.status === 'in_progress' || task.status === 'under_review') && (
            <Link href={`/chat/${taskId}`}>
              <Button variant="outline" className="rounded-xl gap-2">
                <MessageCircle className="w-4 h-4" /> Open Chat
              </Button>
            </Link>
          )}

          {isPoster && task.applicant_count > 0 && task.status === 'open' && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{task.applicant_count} applicant{task.applicant_count !== 1 ? 's' : ''} — see below</span>
            </div>
          )}
        </div>
      </Card>

      {showApplyForm && !isPoster && !hasApplied && (
        <Card className="p-6 border-border bg-card rounded-2xl shadow-sm">
          <h3 className="font-semibold mb-4 text-base">Submit Your Application</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">
                Proposal <span className="text-muted-foreground text-xs">(min 20 characters)</span>
              </label>
              <Textarea
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                placeholder="Explain why you're the right person for this task, your relevant experience, and how you plan to approach it..."
                className="min-h-[120px] rounded-xl resize-none"
              />
              <p className={`text-xs mt-1 ${proposal.length < 20 ? 'text-muted-foreground' : 'text-emerald-500'}`}>
                {proposal.length}/20 minimum characters
              </p>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Estimated Hours <span className="text-muted-foreground text-xs">(optional)</span></label>
              <Input
                type="number"
                min="0.5"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="e.g., 5"
                className="rounded-xl"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending || proposal.length < 20}
                className="bg-primary text-primary-foreground rounded-xl gap-2"
              >
                {applyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Application
              </Button>
              <Button variant="outline" onClick={() => setShowApplyForm(false)} className="rounded-xl">Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {isPoster && (
        <Card className="p-6 border-border bg-card rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-base">
              Applications
              {task.applications?.length > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({task.applications.length} total)
                </span>
              )}
            </h3>
          </div>

          {!task.applications || task.applications.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No applications yet</p>
              <p className="text-xs mt-1">Share your task link to get applicants faster</p>
            </div>
          ) : (
            <div className="space-y-4">
              {task.applications.map((app: any) => (
                <div
                  key={app.id}
                  className="p-4 rounded-xl border border-border bg-background hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm overflow-hidden shrink-0">
                        {app.worker?.profile_photo_url
                          ? <img src={app.worker.profile_photo_url} alt={app.worker.full_name} className="w-full h-full object-cover" />
                          : app.worker?.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{app.worker?.full_name ?? 'Unknown Worker'}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {app.worker?.university_name ?? '—'}
                          <span className="mx-1">·</span>
                          <Star className="w-3 h-3 text-amber-500 inline" />
                          {app.worker?.trust_score ?? 0} TS
                        </p>
                        {app.worker?.skills?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {app.worker.skills.slice(0, 4).map((s: string) => (
                              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground">{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {app.status === 'pending' && task.status === 'open' && (
                        <Button
                          size="sm"
                          onClick={() => hireMutation.mutate(app.worker_id)}
                          disabled={hireMutation.isPending}
                          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg gap-1.5"
                        >
                          {hireMutation.isPending && hireMutation.variables === app.worker_id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <UserCheck className="w-3.5 h-3.5" />}
                          Hire
                        </Button>
                      )}
                      {app.status === 'accepted' && (
                        <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Hired
                        </span>
                      )}
                      {app.status === 'rejected' && (
                        <span className="text-xs text-muted-foreground">Declined</span>
                      )}
                      {app.estimated_hours && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> ~{app.estimated_hours}h
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Proposal</p>
                    <p className="text-sm text-foreground leading-relaxed">{app.proposal}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
