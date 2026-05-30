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

  const filtered = tasks.filter((task: any) =>
    task.title.toLowerCase().includes(search.toLowerCase()) ||
    task.description.toLowerCase().includes(search.toLowerCase())
  )

  const taskWithDeadline = filtered.map((task: any) => ({
    ...task,
    daysLeft: Math.ceil((new Date(task.deadline).getTime() - Date.now()) / 86400000),
  }))

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-label mb-2">Marketplace</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tasks</h1>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 rounded-xl border border-border bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-label mb-2">Marketplace</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tasks</h1>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-text" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              activeCategory === category
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-[#F3F1EC] hover:text-foreground'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {taskWithDeadline.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <Filter className="mx-auto mb-3 size-10 opacity-40" />
          <p className="text-lg font-medium text-foreground">No tasks found</p>
          <p className="text-sm">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {taskWithDeadline.map((task: any) => (
            <LazyTaskCard key={task.id}>
              <Link href={`/tasks/${task.id}`} className="block">
                <Card className="h-full p-5 transition-colors hover:border-primary/30">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-md bg-[#F3F1EC] px-2.5 py-1 text-xs font-semibold text-primary">
                        {task.category}
                      </span>
                      {task.task_mode === 'online' && (
                        <span className="rounded-md bg-[#F3F1EC] px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          Online
                        </span>
                      )}
                    </div>
                    <span className={`flex items-center gap-1 text-xs ${task.daysLeft < 1 ? 'text-red-500' : task.daysLeft <= 3 ? 'text-amber-500' : 'text-subtle-text'}`}>
                      <Clock className="size-3" />
                      {task.daysLeft > 0 ? `${task.daysLeft}d` : 'Expired'}
                    </span>
                  </div>

                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                    {task.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{task.description}</p>

                  <div className="mt-4 flex flex-wrap gap-1">
                    {(task.required_skills ?? []).slice(0, 3).map((skill: string) => (
                      <span key={skill} className="rounded bg-[#F3F1EC] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <div className="flex items-center gap-2">
                      <div className="size-6 overflow-hidden rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {task.poster?.profile_photo_url ? (
                          <img src={task.poster.profile_photo_url} className="size-full object-cover" alt="" />
                        ) : (
                          task.poster?.full_name?.[0]?.toUpperCase() ?? 'U'
                        )}
                      </div>
                      <span className="max-w-[100px] truncate text-xs text-muted-foreground">
                        {task.poster?.full_name ?? 'Unknown'}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">৳{task.budget?.toLocaleString()}</p>
                      <p className="text-[10px] text-subtle-text">{task.applicant_count ?? 0} applicants</p>
                    </div>
                  </div>
                </Card>
              </Link>
            </LazyTaskCard>
          ))}
        </div>
      )}
    </div>
  )
}
