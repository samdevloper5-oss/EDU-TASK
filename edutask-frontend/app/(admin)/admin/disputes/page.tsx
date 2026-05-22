import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import type { Task, User } from '@/types'
import Link from 'next/link'

type DisputeTask = Task & {
  poster: Pick<User, 'full_name' | 'trust_score'> | null
  worker: Pick<User, 'full_name' | 'trust_score'> | null
}

export default async function AdminDisputesPage() {
  const supabase = await createServerSupabaseClient()

  const { data } = await supabase
    .from('tasks')
    .select(
      '*, poster:users!tasks_poster_id_fkey(full_name, trust_score), worker:users!tasks_hired_worker_id_fkey(full_name, trust_score)'
    )
    .eq('status', 'disputed')
    .order('created_at', { ascending: false })

  const disputes = (data ?? []) as DisputeTask[]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
        Dispute Queue
      </h1>

      {disputes.length === 0 ? (
        <Card className="p-10 border-border text-center text-muted-foreground">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No active disputes</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {disputes.map((task) => (
            <Card key={task.id} className="p-5 border-border">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{task.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Budget: Tk {task.budget.toLocaleString()}
                  </p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Poster: {task.poster?.full_name} (Score {task.poster?.trust_score})</span>
                    <span>Worker: {task.worker?.full_name} (Score {task.worker?.trust_score})</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href={`/admin/disputes/${task.id}`}>
                    <Button size="sm" variant="outline">
                      Review Details
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
