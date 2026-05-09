"use client"

import { useState, useRef, type KeyboardEvent } from 'react'
import { useApp } from '@/lib/app-context'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2, Wifi, WifiOff, X, Clock, DollarSign, MapPin } from 'lucide-react'
import { availableSkills } from '@/lib/mock-data'
import { toast } from 'sonner'

const deadlinePresets = ['4 hours', '12 hours', '1 day', '3 days', 'Custom']

function SkillTagInput({ skills, onAdd, onRemove }: { skills: string[]; onAdd: (s: string) => void; onRemove: (s: string) => void }) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestions = input.trim()
    ? availableSkills.filter(s => s.toLowerCase().includes(input.toLowerCase()) && !skills.includes(s)).slice(0, 5)
    : []
  const addSkill = (skill: string) => { if (skill.trim() && !skills.includes(skill.trim())) onAdd(skill.trim()); setInput(''); setShowSuggestions(false); inputRef.current?.focus() }
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); if (suggestions.length > 0) addSkill(suggestions[0]); else if (input.trim()) addSkill(input) }
    if (e.key === 'Backspace' && !input && skills.length > 0) onRemove(skills[skills.length - 1])
  }
  return (
    <div className="relative">
      <div className="min-h-[48px] flex flex-wrap items-center gap-2 p-2.5 rounded-xl border border-border bg-background cursor-text focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all" onClick={() => inputRef.current?.focus()}>
        {skills.map(skill => (
          <span key={skill} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-primary/10 to-indigo-50 text-primary text-xs font-medium animate-fade-up" style={{ animationDuration: '0.3s' }}>
            {skill}
            <button type="button" onClick={e => { e.stopPropagation(); onRemove(skill) }} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"><X className="w-3 h-3" /></button>
          </span>
        ))}
        <input ref={inputRef} type="text" value={input} onChange={e => { setInput(e.target.value); setShowSuggestions(true) }} onKeyDown={handleKeyDown} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder={skills.length === 0 ? 'Type skills and press Enter...' : 'Add more...'} className="flex-1 min-w-[150px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-10">
          {suggestions.map(s => (<button key={s} type="button" onMouseDown={e => { e.preventDefault(); addSkill(s) }} className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">{s}</button>))}
        </div>
      )}
    </div>
  )
}

export function PostTaskPage() {
  const { setPage, createTask } = useApp()
  const [taskMode, setTaskMode] = useState<'online' | 'offline'>('online')
  const [taskType, setTaskType] = useState<'paid' | 'volunteer'>('paid')
  const [budgetType, setBudgetType] = useState<'fixed' | 'hourly'>('fixed')
  const [loading, setLoading] = useState(false)
  const [deadlinePreset, setDeadlinePreset] = useState<string>('')
  const [skills, setSkills] = useState<string[]>([])
  const [form, setForm] = useState({
    title: '', description: '', deadline: '', payment: '', hours: '', members: '', location: '',
  })

  const updateField = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  const selectDeadlinePreset = (preset: string) => {
    setDeadlinePreset(preset)
    if (preset === 'Custom') return
    const now = new Date()
    const map: Record<string, number> = { '4 hours': 4, '12 hours': 12, '1 day': 24, '3 days': 72 }
    now.setHours(now.getHours() + (map[preset] || 24))
    updateField('deadline', now.toISOString().split('T')[0])
  }

  const getUrgencyFromPreset = () => {
    if (deadlinePreset === '4 hours') return { label: 'Urgent', color: 'text-red-600 bg-red-50 border-red-200' }
    if (deadlinePreset === '12 hours') return { label: 'High', color: 'text-amber-600 bg-amber-50 border-amber-200' }
    return { label: 'Normal', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' }
  }

  const isValid = form.title && form.description && (form.deadline || deadlinePreset !== 'Custom') &&
    (taskType === 'paid' ? form.payment : form.hours)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    try {
      await createTask({
        title: form.title,
        description: form.description,
        task_type: taskType === 'paid' ? 'paid' : 'volunteer',
        budget: taskType === 'paid' ? Number(form.payment) : undefined,
        deadline: form.deadline || new Date().toISOString(),
        required_skills: skills,
      })
      toast.success('Task posted successfully!')
      setPage('my-tasks')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Task posting failed'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const urgency = getUrgencyFromPreset()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Post a New Task</h2>
        <p className="text-muted-foreground text-sm mt-1">Create a task for campus students to apply</p>
      </div>

      {/* Task Type Toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 bg-card rounded-2xl border border-border shadow-sm">
          <button onClick={() => setTaskType('paid')} className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${taskType === 'paid' ? 'bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>
            <DollarSign className="w-4 h-4" /> Paid Task
          </button>
          <button onClick={() => setTaskType('volunteer')} className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${taskType === 'volunteer' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>
            Volunteer
          </button>
        </div>

        {taskType === 'paid' && (
          <div className="flex items-center gap-1 p-1 bg-card rounded-2xl border border-border shadow-sm">
            <button onClick={() => setTaskMode('online')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${taskMode === 'online' ? 'bg-sky-50 text-sky-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Wifi className="w-3.5 h-3.5" /> Online
            </button>
            <button onClick={() => setTaskMode('offline')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${taskMode === 'offline' ? 'bg-amber-50 text-amber-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <WifiOff className="w-3.5 h-3.5" /> Offline
            </button>
          </div>
        )}
      </div>

      <Card className="p-8 border-border bg-card shadow-lg shadow-primary/5">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="text-foreground">Task Title</Label>
            <Input placeholder="e.g., Build a Portfolio Website" value={form.title} onChange={e => updateField('title', e.target.value)} className="mt-1.5 bg-background border-border" />
          </div>

          <div>
            <Label className="text-foreground">Description</Label>
            <Textarea placeholder="Describe the task in detail..." value={form.description} onChange={e => updateField('description', e.target.value)} rows={4} className="mt-1.5 bg-background border-border" />
          </div>

          {/* Skills */}
          <div>
            <Label className="text-foreground">Required Skills</Label>
            <div className="mt-1.5">
              <SkillTagInput skills={skills} onAdd={s => setSkills(p => [...p, s])} onRemove={s => setSkills(p => p.filter(x => x !== s))} />
            </div>
          </div>

          {/* Budget */}
          {taskType === 'paid' && (
            <div>
              <Label className="text-foreground">Budget</Label>
              <div className="flex items-center gap-2 mt-1.5 mb-2">
                <button type="button" onClick={() => setBudgetType('fixed')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${budgetType === 'fixed' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>Fixed Price</button>
                <button type="button" onClick={() => setBudgetType('hourly')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${budgetType === 'hourly' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>Hourly Rate</button>
              </div>
              <Input type="number" placeholder={budgetType === 'fixed' ? 'Total amount in BDT' : 'Rate per hour in BDT'} value={form.payment} onChange={e => updateField('payment', e.target.value)} className="bg-background border-border" />
            </div>
          )}

          {taskType === 'volunteer' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground">Expected Hours</Label>
                <Input type="number" placeholder="4" value={form.hours} onChange={e => updateField('hours', e.target.value)} className="mt-1.5 bg-background border-border" />
              </div>
              <div>
                <Label className="text-foreground">Required Members</Label>
                <Input type="number" placeholder="10" value={form.members} onChange={e => updateField('members', e.target.value)} className="mt-1.5 bg-background border-border" />
              </div>
            </div>
          )}

          {/* Location (offline only) */}
          {taskMode === 'offline' && taskType === 'paid' && (
            <div>
              <Label className="text-foreground flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Location</Label>
              <Input placeholder="e.g., BRAC University Library" value={form.location} onChange={e => updateField('location', e.target.value)} className="mt-1.5 bg-background border-border" />
            </div>
          )}

          {/* Deadline */}
          <div>
            <Label className="text-foreground flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Deadline
              {deadlinePreset && <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${urgency.color}`}>{urgency.label}</span>}
            </Label>
            <div className="flex flex-wrap gap-2 mt-2 mb-3">
              {deadlinePresets.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => selectDeadlinePreset(preset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    deadlinePreset === preset
                      ? 'bg-gradient-to-r from-primary/10 to-indigo-50 text-primary ring-1 ring-primary/20'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            {deadlinePreset === 'Custom' && (
              <Input type="date" value={form.deadline} onChange={e => updateField('deadline', e.target.value)} className="bg-background border-border" />
            )}
          </div>

          <Button type="submit" className="w-full bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25" disabled={loading || !isValid}>
            {loading ? (
              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Posting...</span>
            ) : (
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Post Task</span>
            )}
          </Button>
        </form>
      </Card>
    </div>
  )
}

