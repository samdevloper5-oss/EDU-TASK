'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const taskId = params.id as string

  const [task, setTask] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [applied, setApplied] = useState(false)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [proposal, setProposal] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchTask = async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*, poster:users!tasks_poster_id_fkey(name, university, trust_score, email)')
        .eq('id', taskId)
        .single()
      setTask(data)
      setLoading(false)

      const { data: { user } } = await supabase.auth.getUser()
      if (user && data) {
        const { data: appData } = await supabase
          .from('applications')
          .select('id')
          .eq('task_id', taskId)
          .eq('worker_id', user.id)
          .single()
        if (appData) setApplied(true)
      }
    }
    fetchTask()
  }, [supabase, taskId])

  const handleApply = async () => {
    if (!proposal || proposal.length < 20) { toast.error('Proposal must be at least 20 characters'); return }
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Please sign in'); setSubmitting(false); return }

    const { error } = await supabase.from('applications').insert({
      task_id: taskId,
      worker_id: user.id,
      proposal,
      estimated_hours: estimatedHours ? Number(estimatedHours) : null,
      status: 'pending',
    })

    if (error) { toast.error(error.message); setSubmitting(false); return }

    toast.success('Application submitted!')
    setApplied(true)
    setShowApplyModal(false)
    setSubmitting(false)
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  if (!task) {
    return <div className="text-center py-20 text-muted-foreground">Task not found</div>
  }

  const deadline = new Date(task.deadline)
  const now = new Date()
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const deadlineColor = daysLeft < 1 ? 'text-red-500' : daysLeft <= 3 ? 'text-amber-500' : 'text-emerald-500'

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link href="/tasks" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to tasks
      </Link>

      <Card className="p-6 border-border">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary">{task.category}</span>
              <span className="text-xs text-muted-foreground">{task.task_mode}</span>
            </div>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{task.title}</h1>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl font-bold text-primary">{task.budget?.toLocaleString()}৳</p>
            <p className={`text-xs font-medium ${deadlineColor}`}>{daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{task.description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(task.required_skills ?? []).map((s: string) => (
            <span key={s} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">{s}</span>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Posted by {task.poster?.name ?? 'Unknown'}</p>
            <p className="text-xs text-muted-foreground">{task.poster?.university} · ⭐ {task.poster?.trust_score ?? 0}</p>
          </div>
          {applied ? (
            <Button disabled variant="outline" className="text-emerald-500 border-emerald-500/30">Applied ✓</Button>
          ) : (
            <Button onClick={() => setShowApplyModal(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">Apply Now</Button>
          )}
        </div>
      </Card>

      {showApplyModal && (
        <Card className="p-6 border-border">
          <h3 className="font-semibold mb-4">Apply to this task</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Proposal (min 20 chars)</label>
              <Textarea value={proposal} onChange={(e) => setProposal(e.target.value)} placeholder="Explain why you're a good fit..." className="mt-1 min-h-[100px]" />
            </div>
            <div>
              <label className="text-sm font-medium">Estimated Hours (optional)</label>
              <Input type="number" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} placeholder="e.g., 5" className="mt-1" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApply} disabled={submitting} className="bg-primary text-primary-foreground">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1" /> Submit</>}
              </Button>
              <Button variant="outline" onClick={() => setShowApplyModal(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
