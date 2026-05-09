'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Send, CheckCircle, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ChatRoomPage() {
  const params = useParams()
  const supabase = createClient()
  const taskId = params.taskId as string

  const [task, setTask] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)

      const [{ data: taskData }, { data: msgData }] = await Promise.all([
        supabase.from('tasks').select('*, poster:users!tasks_poster_id_fkey(name), worker:users!tasks_hired_worker_id_fkey(name)').eq('id', taskId).single(),
        supabase.from('messages').select('*, sender:users!messages_sender_id_fkey(name)').eq('task_id', taskId).order('created_at', { ascending: true }),
      ])

      setTask(taskData)
      setMessages(msgData ?? [])
      setLoading(false)
    }
    init()
  }, [supabase, taskId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!newMessage.trim() || !userId) return
    const content = newMessage.trim()
    setNewMessage('')

    const { data, error } = await supabase.from('messages').insert({
      task_id: taskId,
      sender_id: userId,
      content,
      is_system_message: false,
      flagged: false,
    }).select('*, sender:users!messages_sender_id_fkey(name)').single()

    if (error) { toast.error(error.message); return }
    setMessages((prev) => [...prev, data])
  }

  const submitWork = async () => {
    const { error } = await supabase.from('tasks').update({ status: 'under_review', submitted_at: new Date().toISOString() }).eq('id', taskId)
    if (error) { toast.error(error.message); return }
    toast.success('Work submitted for review!')
    setTask((t: any) => ({ ...t, status: 'under_review' }))
  }

  const acceptWork = async () => {
    if (!task) return
    const { error: updateError } = await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', taskId)
    if (updateError) { toast.error(updateError.message); return }

    // Release escrow
    await supabase.from('users').update({ escrow_balance: (task.poster?.escrow_balance ?? 0) - task.budget }).eq('id', task.poster_id)
    const workerEarns = Math.round(task.budget * 0.92)
    await supabase.from('users').update({
      wallet_balance: (task.worker?.wallet_balance ?? 0) + workerEarns,
      total_earned: (task.worker?.total_earned ?? 0) + workerEarns,
      completed_tasks: (task.worker?.completed_tasks ?? 0) + 1,
    }).eq('id', task.hired_worker_id)

    toast.success('Payment released to worker!')
    setTask((t: any) => ({ ...t, status: 'completed' }))
  }

  const requestRevision = async () => {
    if (!task || task.revisions_used >= 2) { toast.error('Max 2 revisions'); return }
    const { error } = await supabase.from('tasks').update({ status: 'in_progress', revisions_used: (task.revisions_used ?? 0) + 1 }).eq('id', taskId)
    if (error) { toast.error(error.message); return }
    toast.success('Revision requested')
    setTask((t: any) => ({ ...t, status: 'in_progress', revisions_used: (t.revisions_used ?? 0) + 1 }))
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  if (!task) {
    return <div className="text-center py-20 text-muted-foreground">Task not found</div>
  }

  const isPoster = userId === task.poster_id
  const isWorker = userId === task.hired_worker_id

  return (
    <div className="space-y-4 max-w-3xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      <div className="flex items-center gap-3">
        <Link href="/chat">
          <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground" />
        </Link>
        <div>
          <h1 className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{task.title}</h1>
          <p className="text-xs text-muted-foreground">Budget: {task.budget?.toLocaleString()}৳ · Status: <span className="capitalize font-medium text-primary">{task.status}</span></p>
        </div>
      </div>

      {task.status === 'under_review' && isPoster && (
        <Card className="p-4 border-border bg-amber-50/50">
          <p className="text-sm font-medium mb-3">Work has been submitted. Please review:</p>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={acceptWork} className="bg-emerald-500 text-white hover:bg-emerald-600"><CheckCircle className="w-4 h-4 mr-1" /> Accept & Pay</Button>
            <Button size="sm" variant="outline" onClick={requestRevision} disabled={task.revisions_used >= 2}><RotateCcw className="w-4 h-4 mr-1" /> Request Revision ({task.revisions_used ?? 0}/2)</Button>
          </div>
        </Card>
      )}

      {task.status === 'hired' && isWorker && (
        <Card className="p-4 border-border bg-primary/5">
          <p className="text-sm mb-2">You have been hired for this task. Complete the work and submit when ready.</p>
          <Button size="sm" onClick={submitWork} className="bg-primary text-primary-foreground">Submit Work for Review</Button>
        </Card>
      )}

      <Card className="flex-1 border-border overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-10">No messages yet. Start the conversation!</div>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender_id === userId
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                  isMe ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted text-foreground rounded-bl-md'
                }`}>
                  <p>{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {msg.sender?.name ?? 'Unknown'} · {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        <div className="p-3 border-t border-border flex gap-2">
          <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." className="flex-1" />
          <Button onClick={sendMessage} disabled={!newMessage.trim()} className="bg-primary text-primary-foreground"><Send className="w-4 h-4" /></Button>
        </div>
      </Card>
    </div>
  )
}
