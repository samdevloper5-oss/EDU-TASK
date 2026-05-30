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
          <h1 className="text-2xl font-bold text-[#0F0F0F] tracking-tight">Tasks</h1>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 rounded-2xl border border-[#E5E5E3] bg-[#F4F4F2] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-label mb-2">Marketplace</p>
        <h1 className="text-2xl font-bold text-[#0F0F0F] tracking-tight">Tasks</h1>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#A3A3A3]" />
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
                ? 'border-[#4F46E5] bg-[#4F46E5] text-white'
                : 'border-[#E5E5E3] bg-white text-[#6B6B6B] hover:bg-[#F4F4F2] hover:text-[#0F0F0F]'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {taskWithDeadline.length === 0 ? (
        <div className="py-20 text-center text-[#6B6B6B]">
          <Filter className="mx-auto mb-3 size-10 opacity-40" />
          <p className="text-lg font-medium text-[#0F0F0F]">No tasks found</p>
          <p className="text-sm">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {taskWithDeadline.map((task: any) => (
            <LazyTaskCard key={task.id}>
              <Link href={`/tasks/${task.id}`} className="block">
                <Card className="h-full p-5 transition-colors hover:border-[#4F46E5]/30">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-md bg-[#F4F4F2] px-2.5 py-1 text-xs font-semibold text-[#4F46E5]">
                        {task.category}
                      </span>
                      {task.task_mode === 'online' && (
                        <span className="rounded-md bg-[#F4F4F2] px-2.5 py-1 text-xs font-medium text-[#6B6B6B]">
                          Online
                        </span>
                      )}
                    </div>
                    <span className={`flex items-center gap-1 text-xs ${task.daysLeft < 1 ? 'text-red-500' : task.daysLeft <= 3 ? 'text-amber-500' : 'text-[#A3A3A3]'}`}>
                      <Clock className="size-3" />
                      {task.daysLeft > 0 ? `${task.daysLeft}d` : 'Expired'}
                    </span>
                  </div>

                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[#0F0F0F]">
                    {task.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-xs text-[#6B6B6B] leading-relaxed">{task.description}</p>

                  <div className="mt-4 flex flex-wrap gap-1">
                    {(task.required_skills ?? []).slice(0, 3).map((skill: string) => (
                      <span key={skill} className="rounded bg-[#F4F4F2] px-2 py-0.5 text-[10px] font-medium text-[#6B6B6B]">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#E5E5E3] pt-3">
                    <div className="flex items-center gap-2">
                      <div className="size-6 overflow-hidden rounded-full bg-[#4F46E5]/10 flex items-center justify-center text-[10px] font-bold text-[#4F46E5]">
                        {task.poster?.profile_photo_url ? (
                          <img src={task.poster.profile_photo_url} className="size-full object-cover" alt="" />
                        ) : (
                          task.poster?.full_name?.[0]?.toUpperCase() ?? 'U'
                        )}
                      </div>
                      <span className="max-w-[100px] truncate text-xs text-[#6B6B6B]">
                        {task.poster?.full_name ?? 'Unknown'}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#0F0F0F]">৳{task.budget?.toLocaleString()}</p>
                      <p className="text-[10px] text-[#A3A3A3]">{task.applicant_count ?? 0} applicants</p>
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
