"use client"

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Star, Clock, Trophy, Medal, Crown, Flame } from 'lucide-react'
import { leaderboardTrust, leaderboardVolunteer } from '@/lib/mock-data'

export function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<'trust' | 'volunteer'>('trust')
  const data = activeTab === 'trust' ? leaderboardTrust : leaderboardVolunteer

  const podiumOrder = [1, 0, 2]
  const podiumHeights = ['h-28', 'h-36', 'h-24']
  const podiumGradients = [
    'from-slate-300 to-slate-400',
    'from-amber-300 to-yellow-400',
    'from-amber-600 to-amber-700',
  ]
  const crownIcons = [Medal, Crown, Medal]
  const crownColors = ['text-slate-400', 'text-amber-400', 'text-amber-700']
  const ringStyles = ['ring-slate-300', 'ring-amber-400 shadow-lg shadow-amber-200/50', 'ring-amber-700']

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
          Leaderboard
        </h2>
        <p className="text-muted-foreground text-sm mt-1">Top performing students on the platform</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-card rounded-2xl border border-border w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('trust')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'trust'
              ? 'bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground shadow-md shadow-primary/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Star className="w-4 h-4" /> Trust Score
        </button>
        <button
          onClick={() => setActiveTab('volunteer')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'volunteer'
              ? 'bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground shadow-md shadow-primary/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="w-4 h-4" /> Volunteer Hours
        </button>
      </div>

      {/* Podium Top 3 */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500" />
        <div className="px-8 py-10 bg-gradient-to-b from-secondary/50 to-transparent">
          <div className="flex items-end justify-center gap-4 max-w-xl mx-auto">
            {podiumOrder.map((dataIdx, visualIdx) => {
              const entry = data[dataIdx]
              if (!entry) return null
              const CrownIcon = crownIcons[visualIdx]
              return (
                <div key={entry.rank} className="flex flex-col items-center flex-1">
                  {/* Avatar */}
                  <div className="relative mb-3">
                    <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-gradient-to-br from-primary/20 to-indigo-100 flex items-center justify-center text-primary font-bold text-xl lg:text-2xl ring-3 ${ringStyles[visualIdx]} transition-all`}>
                      {entry.name[0]}
                    </div>
                    <div className="absolute -top-2.5 -right-0.5 w-7 h-7 rounded-full bg-card border-2 border-border flex items-center justify-center shadow-sm">
                      <CrownIcon className={`w-3.5 h-3.5 ${crownColors[visualIdx]}`} />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-foreground text-center mb-0.5">{entry.name}</p>
                  <p className="text-xs text-muted-foreground text-center mb-3">{entry.university}</p>

                  {/* Podium bar */}
                  <div className={`w-full ${podiumHeights[visualIdx]} rounded-t-2xl bg-gradient-to-t ${podiumGradients[visualIdx]} flex flex-col items-center justify-start pt-4 shadow-inner`}>
                    <span className="text-card font-bold text-2xl drop-shadow-sm">
                      {activeTab === 'trust'
                        ? (entry as (typeof leaderboardTrust)[0]).score
                        : `${(entry as (typeof leaderboardVolunteer)[0]).hours}h`
                      }
                    </span>
                    <span className="text-card/70 text-xs font-medium mt-0.5">#{entry.rank}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Full Table */}
      <Card className="border-border bg-card overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Full Rankings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-6 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Rank</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Student</th>
                <th className="text-left px-6 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">University</th>
                <th className="text-right px-6 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {activeTab === 'trust' ? 'Score' : 'Hours'}
                </th>
                <th className="text-right px-6 py-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((entry, i) => {
                const maxVal = activeTab === 'trust'
                  ? (data[0] as (typeof leaderboardTrust)[0]).score
                  : (data[0] as (typeof leaderboardVolunteer)[0]).hours
                const currentVal = activeTab === 'trust'
                  ? (entry as (typeof leaderboardTrust)[0]).score
                  : (entry as (typeof leaderboardVolunteer)[0]).hours
                const pct = (currentVal / maxVal) * 100

                return (
                  <tr key={entry.rank} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4">
                      {entry.rank <= 3 ? (
                        <span className={`w-8 h-8 rounded-xl inline-flex items-center justify-center text-xs font-bold shadow-sm ${
                          entry.rank === 1 ? 'bg-gradient-to-br from-amber-300 to-yellow-400 text-amber-900' :
                          entry.rank === 2 ? 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700' :
                          'bg-gradient-to-br from-amber-600 to-amber-700 text-amber-100'
                        }`}>
                          {entry.rank}
                        </span>
                      ) : (
                        <span className="w-8 h-8 rounded-xl inline-flex items-center justify-center text-xs font-bold bg-muted text-muted-foreground">
                          {entry.rank}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-indigo-100 flex items-center justify-center text-primary font-bold text-xs group-hover:shadow-md transition-shadow">
                          {entry.name[0]}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-foreground">{entry.name}</span>
                          {i < 3 && (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-amber-600 font-medium">
                              <Flame className="w-3 h-3" /> Top {entry.rank}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{entry.university}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-foreground">
                        {activeTab === 'trust'
                          ? (entry as (typeof leaderboardTrust)[0]).score
                          : `${(entry as (typeof leaderboardVolunteer)[0]).hours} hours`
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-400 transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{Math.round(pct)}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
