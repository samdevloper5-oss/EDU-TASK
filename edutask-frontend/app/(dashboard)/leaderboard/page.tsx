import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Trophy, Medal } from 'lucide-react'

export default async function LeaderboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: leaders } = await supabase
    .from('users')
    .select('id, name, university, trust_score, completed_tasks, total_earned, profile_photo_url')
    .order('trust_score', { ascending: false })
    .order('completed_tasks', { ascending: false })
    .limit(20)

  const currentUserRank = user ? (leaders ?? []).findIndex((u) => u.id === user.id) : -1

  const trustLabel = (score: number) =>
    score <= 20 ? '🌱 Newcomer' :
    score <= 40 ? '🔵 Learning' :
    score <= 60 ? '⭐ Trusted' :
    score <= 80 ? '🏆 Expert' : '💎 Elite'

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Leaderboard</h1>

      {leaders && leaders.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 items-end">
          <Card className="p-4 border-border text-center">
            <Medal className="w-6 h-6 mx-auto mb-2 text-gray-400" />
            <p className="text-sm font-semibold truncate">{leaders[1].name}</p>
            <p className="text-xs text-muted-foreground">{leaders[1].university}</p>
            <p className="text-lg font-bold text-primary mt-1">{leaders[1].trust_score}</p>
          </Card>
          <Card className="p-5 border-border text-center border-2 border-amber-400/50">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-amber-500" />
            <p className="text-base font-bold truncate">{leaders[0].name}</p>
            <p className="text-xs text-muted-foreground">{leaders[0].university}</p>
            <p className="text-2xl font-bold text-amber-500 mt-1">{leaders[0].trust_score}</p>
          </Card>
          <Card className="p-4 border-border text-center">
            <Medal className="w-6 h-6 mx-auto mb-2 text-amber-700" />
            <p className="text-sm font-semibold truncate">{leaders[2].name}</p>
            <p className="text-xs text-muted-foreground">{leaders[2].university}</p>
            <p className="text-lg font-bold text-primary mt-1">{leaders[2].trust_score}</p>
          </Card>
        </div>
      )}

      <Card className="border-border divide-y divide-border">
        {(leaders ?? []).map((u, i) => (
          <div key={u.id} className={`p-4 flex items-center gap-4 ${u.id === user?.id ? 'bg-primary/5' : ''}`}>
            <span className="w-6 text-sm font-bold text-muted-foreground text-center">{i + 1}</span>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              {u.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{u.name}</p>
              <p className="text-xs text-muted-truncate">{u.university} · {u.completed_tasks} tasks · {(u.total_earned ?? 0).toLocaleString()}৳</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold">{u.trust_score}</p>
              <p className="text-[10px] text-muted-foreground">{trustLabel(u.trust_score)}</p>
            </div>
          </div>
        ))}
      </Card>

      {currentUserRank > 19 && user && (
        <div className="text-center text-sm text-muted-foreground">Your rank: #{currentUserRank + 1}</div>
      )}
    </div>
  )
}
