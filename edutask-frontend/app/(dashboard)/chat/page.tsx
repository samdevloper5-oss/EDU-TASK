'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { MessageCircle, Loader2 } from 'lucide-react'

export default function ChatListPage() {
  const supabase = useMemo(() => createClient(), [])
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchConversations = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Fetch tasks where user is poster or hired worker
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, status, poster_id, hired_worker_id, poster:users!tasks_poster_id_fkey(name), worker:users!tasks_hired_worker_id_fkey(name)')
        .or(`poster_id.eq.${user.id},hired_worker_id.eq.${user.id}`)
        .neq('status', 'open')
        .order('updated_at', { ascending: false })

      setConversations(tasks ?? [])
      setLoading(false)
    }
    fetchConversations()
  }, [supabase])

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Messages</h1>

      {conversations.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No active conversations</p>
          <p className="text-sm mt-1">Conversations appear when you hire or get hired</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((task) => (
            <Link key={task.id} href={`/chat/${task.id}`}>
              <Card className="p-4 border-border hover:bg-muted/30 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-sm">{task.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {task.status === 'hired' ? 'Waiting for work submission' :
                       task.status === 'in_progress' ? 'Work in progress' :
                       task.status === 'under_review' ? 'Work submitted for review' : 'Completed'}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary capitalize">{task.status}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
