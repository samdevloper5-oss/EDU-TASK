'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const categories = ['Design', 'Coding', 'Research', 'Writing', 'Data Entry', 'Translation', 'Media', 'Academic Help', 'Other']

export default function PostTaskPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Coding')
  const [budget, setBudget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [skills, setSkills] = useState('')
  const [taskMode, setTaskMode] = useState<'online' | 'offline'>('online')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numBudget = Number(budget)
    if (!title || title.length < 10) { toast.error('Title must be at least 10 characters'); return }
    if (!description || description.length < 30) { toast.error('Description must be at least 30 characters'); return }
    if (!numBudget || numBudget < 200) { toast.error('Budget must be at least 200 BDT'); return }
    if (!deadline) { toast.error('Please set a deadline'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          task_mode: taskMode,
          budget: numBudget,
          deadline: new Date(deadline).toISOString(),
          required_skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to post task')
      toast.success('Task posted successfully!')
      router.push('/my-tasks')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to post task')
    } finally {
      setLoading(false)
    }
  }

  const addDays = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    setDeadline(d.toISOString().slice(0, 16))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-heading)' }}>Post a New Task</h1>
      <Card className="p-6 border-border">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1.5" placeholder="e.g., Debug my Django REST API" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required className="mt-1.5 min-h-[120px]" placeholder="Describe what you need..." />
            <p className="text-xs text-muted-foreground mt-1">{description.length} characters (min 30)</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full mt-1.5 h-10 rounded-md border border-border bg-background px-3 text-sm">
                {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <div>
              <Label>Mode</Label>
              <select value={taskMode} onChange={(e) => setTaskMode(e.target.value as any)} className="w-full mt-1.5 h-10 rounded-md border border-border bg-background px-3 text-sm">
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Budget (BDT)</Label>
            <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} required className="mt-1.5" placeholder="Min 200 BDT" />
          </div>
          <div>
            <Label>Deadline</Label>
            <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} required className="mt-1.5" />
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => addDays(1)} className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80">+1 day</button>
              <button type="button" onClick={() => addDays(3)} className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80">+3 days</button>
              <button type="button" onClick={() => addDays(7)} className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80">+7 days</button>
            </div>
          </div>
          <div>
            <Label>Required Skills (comma separated)</Label>
            <Input value={skills} onChange={(e) => setSkills(e.target.value)} className="mt-1.5" placeholder="Python, Django, REST API" />
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
            {loading ? 'Posting...' : 'Post Task'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
