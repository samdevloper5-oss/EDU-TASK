'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Trophy, Medal, Loader2 } from 'lucide-react'

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const res = await fetch('/api/leaderboard')
      const json = await res.json()
      if (json.success) {
        setLeaders(json.data ?? [])
      }
      setLoading(false)
    }
    fetchLeaderboard()
  }, [])

  const trustLabel = (score: number) =>
    score <= 20 ? '🌱 Newcomer' :
    score <= 40 ? '🔵 Learning' :
    score <= 60 ? '⭐ Trusted' :
    score <= 80 ? '🏆 Expert' : '💎 Elite'

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Leaderboard</h1>

      {leaders.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 items-end">
          <Card className="p-4 border-border text-center">
            <Medal className="w-6 h-6 mx-auto mb-2 text-gray-400" />
            <p className="text-sm font-semibold truncate">{leaders[1].full_name}</p>
            <p className="text-xs text-muted-foreground">{leaders[1].university_name}</p>
            <p className="text-lg font-bold text-primary mt-1">{leaders[1].trust_score}</p>
          </Card>
          <Card className="p-5 border-border text-center border-2 border-amber-400/50">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-amber-500" />
            <p className="text-base font-bold truncate">{leaders[0].full_name}</p>
            <p className="text-xs text-muted-foreground">{leaders[0].university_name}</p>
            <p className="text-2xl font-bold text-amber-500 mt-1">{leaders[0].trust_score}</p>
          </Card>
          <Card className="p-4 border-border text-center">
            <Medal className="w-6 h-6 mx-auto mb-2 text-amber-700" />
            <p className="text-sm font-semibold truncate">{leaders[2].full_name}</p>
            <p className="text-xs text-muted-foreground">{leaders[2].university_name}</p>
            <p className="text-lg font-bold text-primary mt-1">{leaders[2].trust_score}</p>
          </Card>
        </div>
      )}

      <Card className="border-border divide-y divide-border">
        {leaders.map((u) => (
          <div key={u.id} className="p-4 flex items-center gap-4">
            <span className="w-6 text-sm font-bold text-muted-foreground text-center">{u.rank}</span>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              {u.full_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{u.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{u.university_name} · {u.completed_tasks} tasks</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold">{u.trust_score}</p>
              <p className="text-[10px] text-muted-foreground">{trustLabel(u.trust_score)}</p>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}
