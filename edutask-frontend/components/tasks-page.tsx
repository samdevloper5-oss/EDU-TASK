"use client"

import { useState, useMemo } from 'react'
import { useApp } from '@/lib/app-context'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, MapPin, Clock, Users, Loader2, CheckCircle2, Bookmark, Wifi, WifiOff } from 'lucide-react'
import { toast } from 'sonner'

const tabs = ['All', 'Pending', 'Applied', 'Completed'] as const

function getDeadlineInfo(deadline: string) {
  const now = new Date()
  const end = new Date(deadline)
  const diffMs = end.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  const diffDays = Math.floor(diffHours / 24)
  const remainHours = Math.floor(diffHours % 24)

  if (diffMs <= 0) return { label: 'Expired', color: 'bg-red-50 text-red-600 border-red-200', urgent: true, pulse: false }
  if (diffHours < 12) return { label: `${Math.floor(diffHours)}h left`, color: 'bg-red-50 text-red-600 border-red-200', urgent: true, pulse: true }
  if (diffDays <= 3) return { label: `${diffDays}d ${remainHours}h`, color: 'bg-amber-50 text-amber-600 border-amber-200', urgent: false, pulse: false }
  return { label: `${diffDays} days`, color: 'bg-emerald-50 text-emerald-600 border-emerald-200', urgent: false, pulse: false }
}

export function TasksPage() {
  const { tasks, appliedTasks, applyToTask } = useApp()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('All')
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.location.toLowerCase().includes(search.toLowerCase()) ||
      t.skills.some(s => s.toLowerCase().includes(search.toLowerCase()))
    if (activeTab === 'All') return matchSearch
    if (activeTab === 'Pending') return matchSearch && t.status === 'open' && !appliedTasks.has(t.id)
    if (activeTab === 'Applied') return matchSearch && appliedTasks.has(t.id)
    if (activeTab === 'Completed') return matchSearch && t.status === 'completed'
    return matchSearch
  }), [tasks, search, activeTab, appliedTasks])

  const handleApply = (taskId: string) => {
    setApplyingId(taskId)
    setTimeout(() => {
      applyToTask(taskId)
      setApplyingId(null)
      setConfirmId(null)
      toast.success('Application submitted!')
    }, 1000)
  }

  const toggleSave = (taskId: string) => {
    setSaved(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Task Feed</h2>
          <p className="text-muted-foreground text-sm mt-1">Browse and apply to campus tasks</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks or skills..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-card rounded-2xl border border-border w-fit shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground shadow-md shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Task Grid */}
      <div className="grid md:grid-cols-2 gap-5">
        {filtered.map((task, i) => {
          const deadlineInfo = getDeadlineInfo(task.deadline)
          return (
            <Card
              key={task.id}
              className={`border-border bg-card hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group ${
                deadlineInfo.urgent ? 'border-red-200' : ''
              } ${deadlineInfo.pulse ? 'animate-pulse-glow' : ''}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {/* Top accent bar */}
              <div className={`h-1 ${
                task.type === 'online' ? 'bg-gradient-to-r from-sky-400 to-blue-500' :
                task.type === 'offline' ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                'bg-gradient-to-r from-emerald-400 to-teal-500'
              }`} />

              <div className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                      task.type === 'online' ? 'bg-sky-50 text-sky-600' :
                      task.type === 'offline' ? 'bg-amber-50 text-amber-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {task.type === 'online' ? <Wifi className="w-3 h-3" /> : task.type === 'offline' ? <WifiOff className="w-3 h-3" /> : null}
                      {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${deadlineInfo.color}`}>
                      <Clock className="w-3 h-3 inline mr-1" />
                      {deadlineInfo.label}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleSave(task.id)}
                    className={`p-1.5 rounded-lg transition-colors ${saved.has(task.id) ? 'text-primary bg-secondary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                  >
                    <Bookmark className={`w-4 h-4 ${saved.has(task.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Title + Budget */}
                <h3 className="font-bold text-foreground text-base mb-1 group-hover:text-primary transition-colors">{task.title}</h3>
                <div className="text-xl font-bold text-foreground mb-3">
                  {task.type === 'volunteer' ? (
                    <span className="text-emerald-600">{task.hours}h <span className="text-xs font-normal text-muted-foreground">volunteer</span></span>
                  ) : (
                    <>{task.payment} <span className="text-xs font-normal text-muted-foreground">BDT</span></>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{task.description}</p>

                {/* Skills */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {task.skills.map(s => (
                    <span key={s} className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-primary/5 to-indigo-50 text-xs text-primary font-medium">{s}</span>
                  ))}
                </div>

                {/* Meta info */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {task.location}</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {task.applicants} applied</span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-indigo-100 flex items-center justify-center text-primary text-xs font-bold">
                      {task.postedBy[0]}
                    </div>
                    <span className="text-xs text-muted-foreground">{task.postedBy}</span>
                  </div>

                  {appliedTasks.has(task.id) ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Applied
                    </span>
                  ) : task.status === 'open' ? (
                    confirmId === task.id ? (
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)} className="text-muted-foreground h-8">Cancel</Button>
                        <Button
                          size="sm"
                          onClick={() => handleApply(task.id)}
                          disabled={applyingId === task.id}
                          className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 shadow-md shadow-primary/20"
                        >
                          {applyingId === task.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm'}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setConfirmId(task.id)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 shadow-md shadow-primary/20"
                      >
                        Apply Now
                      </Button>
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground capitalize">{task.status}</span>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No tasks found matching your criteria.</p>
        </div>
      )}
    </div>
  )
}
