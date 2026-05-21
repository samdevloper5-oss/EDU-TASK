'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, Filter, Clock } from 'lucide-react'
import { fetchTasks } from '@/lib/queries/tasks'
import { LazyTaskCard } from '@/components/tasks/lazy-task-card'

const categories = ['All', 'Design', 'Coding', 'Research', 'Writing', 'Data Entry', 'Translation', 'Media', 'Academic Help', 'Other']

export default function TasksPage() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', activeCategory, search],
    queryFn: () => fetchTasks({ category: activeCategory, search }),
    placeholderData: (prev) => prev,
    staleTime: 20 * 1000,
  })

  const filtered = tasks.filter((t: any) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  )

  const taskWithDeadline = filtered.map((task: any) => {
    const daysLeft = Math.ceil((new Date(task.deadline).getTime() - Date.now()) / 86400000)
    return { ...task, daysLeft }
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Task Marketplace</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Task Marketplace</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..." className="pl-10 rounded-xl" />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {taskWithDeadline.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Filter className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No tasks found</p>
          <p className="text-sm">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {taskWithDeadline.map((task: any) => {
            const daysLeft = task.daysLeft
            return (
              <LazyTaskCard key={task.id}>
                <Link href={`/tasks/${task.id}`}>
                  <Card className="p-5 border-border hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all cursor-pointer h-full bg-card rounded-2xl group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">{task.category}</span>
                      {task.task_mode === 'online' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">Online</span>
                      )}
                    </div>
                    <span className={`text-xs flex items-center gap-1 ${daysLeft < 1 ? 'text-red-500' : daysLeft <= 3 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      <Clock className="w-3 h-3" />
                      {daysLeft > 0 ? `${daysLeft}d` : 'Expired'}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">{task.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{task.description}</p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {(task.required_skills ?? []).slice(0, 3).map((s: string) => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">{s}</span>
                    ))}
                    {(task.required_skills ?? []).length > 3 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">+{(task.required_skills ?? []).length - 3}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold overflow-hidden">
                        {task.poster?.profile_photo_url
                          ? <img src={task.poster.profile_photo_url} className="w-full h-full object-cover" alt="" />
                          : task.poster?.full_name?.[0]?.toUpperCase() ?? 'U'}
                      </div>
                      <span className="text-xs text-muted-foreground truncate max-w-[100px]">{task.poster?.full_name ?? 'Unknown'}</span>
                      <span className="text-[10px] text-muted-foreground">· {task.poster?.trust_score ?? 0}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-primary">{task.budget?.toLocaleString()}৳</p>
                      <p className="text-[10px] text-muted-foreground">{task.applicant_count ?? 0} applicants</p>
                    </div>
                  </div>
                </Card>
                </Link>
              </LazyTaskCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
