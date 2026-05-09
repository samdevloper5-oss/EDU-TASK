'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Filter } from 'lucide-react'
import { toast } from 'sonner'

const categories = ['All', 'Design', 'Coding', 'Research', 'Writing', 'Data Entry', 'Translation', 'Media', 'Other']

export default function TasksPage() {
  const supabase = createClient()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  useEffect(() => {
    const fetchTasks = async () => {
      let query = supabase
        .from('tasks')
        .select('*, poster:users!tasks_poster_id_fkey(name, university, trust_score)')
        .eq('status', 'open')
        .order('created_at', { ascending: false })

      if (activeCategory !== 'All') {
        query = query.eq('category', activeCategory)
      }

      const { data, error } = await query
      if (error) {
        toast.error('Failed to load tasks')
      } else {
        setTasks(data ?? [])
      }
      setLoading(false)
    }
    fetchTasks()
  }, [supabase, activeCategory])

  const filtered = tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Task Marketplace</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..." className="pl-10" />
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

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5 border-border animate-pulse h-40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Filter className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No tasks found</p>
          <p className="text-sm">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((task) => (
            <Link key={task.id} href={`/tasks/${task.id}`}>
              <Card className="p-5 border-border hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer h-full">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary">{task.category}</span>
                  <span className="text-xs text-muted-foreground">{task.task_mode}</span>
                </div>
                <h3 className="font-semibold text-sm mb-2 line-clamp-2">{task.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{task.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span>{task.poster?.name ?? 'Unknown'} · ⭐ {task.poster?.trust_score ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-primary">{task.budget?.toLocaleString()}৳</span>
                  <span className="text-xs text-muted-foreground">{task.applicant_count ?? 0} applicants</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {(task.required_skills ?? []).slice(0, 3).map((s: string) => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{s}</span>
                  ))}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
