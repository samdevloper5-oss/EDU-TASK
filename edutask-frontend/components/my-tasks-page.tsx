"use client"

import { useState } from 'react'
import { useApp } from '@/lib/app-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, CheckCircle2, XCircle, Star, MessageCircle, Loader2, Wifi, WifiOff, Clock } from 'lucide-react'
import { applicants as mockApplicants } from '@/lib/mock-data'
import { toast } from 'sonner'

export function MyTasksPage() {
  const { tasks, setTasks, setPage } = useApp()
  const [activeTab, setActiveTab] = useState<'paid' | 'volunteer'>('paid')
  const [viewApplicantsFor, setViewApplicantsFor] = useState<string | null>(null)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  const myTasks = tasks.filter(t =>
    t.postedBy === 'You' || t.postedBy === 'Rafiq Ahmed' || t.postedBy === 'Nadia K.'
  )
  const filteredTasks = myTasks.filter(t =>
    activeTab === 'paid' ? t.type !== 'volunteer' : t.type === 'volunteer'
  )

  const handleAccept = (taskId: string, applicantName: string) => {
    setAcceptingId(applicantName)
    setTimeout(() => {
      setTasks(prev =>
        prev.map(t => t.id === taskId ? { ...t, status: 'assigned' as const } : t)
      )
      setAcceptingId(null)
      setViewApplicantsFor(null)
      toast.success(`${applicantName} has been assigned to the task!`)
    }, 1000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>My Posted Tasks</h2>
        <p className="text-muted-foreground text-sm mt-1">Manage tasks you have posted</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-card rounded-2xl border border-border w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('paid')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'paid' ? 'bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground shadow-md shadow-primary/20' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Paid Tasks
        </button>
        <button
          onClick={() => setActiveTab('volunteer')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'volunteer' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Volunteer Tasks
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {filteredTasks.map(task => (
          <Card key={task.id} className="border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
            {/* Accent bar */}
            <div className={`h-1 ${
              task.type === 'online' ? 'bg-gradient-to-r from-sky-400 to-blue-500' :
              task.type === 'offline' ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
              'bg-gradient-to-r from-emerald-400 to-teal-500'
            }`} />
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                      task.type === 'online' ? 'bg-sky-50 text-sky-600' :
                      task.type === 'offline' ? 'bg-amber-50 text-amber-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {task.type === 'online' ? <Wifi className="w-3 h-3" /> : task.type === 'offline' ? <WifiOff className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                    </span>
                  </div>
                  <h3 className="font-bold text-foreground text-lg">{task.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                </div>
                <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold ml-4 ${
                  task.status === 'open' ? 'bg-gradient-to-r from-primary/10 to-indigo-50 text-primary' :
                  task.status === 'assigned' ? 'bg-sky-50 text-sky-600' :
                  'bg-emerald-50 text-emerald-600'
                }`}>
                  {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                </span>
              </div>

              <div className="flex items-center gap-5 text-xs text-muted-foreground mb-4">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {task.applicants} applicants</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {task.deadline}</span>
                {task.payment && <span className="font-semibold text-foreground">{task.payment} BDT</span>}
                {task.hours && <span className="font-semibold text-foreground">{task.hours} hours</span>}
              </div>

              <div className="flex items-center gap-3">
                {task.status === 'open' && (
                  <Button
                    size="sm"
                    onClick={() => setViewApplicantsFor(viewApplicantsFor === task.id ? null : task.id)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 shadow-md shadow-primary/20"
                  >
                    {viewApplicantsFor === task.id ? 'Hide Applicants' : 'View Applicants'}
                  </Button>
                )}
                {task.status === 'assigned' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage('chat')}
                    className="h-9 border-border text-foreground gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Chat
                  </Button>
                )}
              </div>
            </div>

            {/* Applicants Panel */}
            {viewApplicantsFor === task.id && (
              <div className="border-t border-border bg-muted/20 p-6">
                <p className="text-sm font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Applicants</p>
                <div className="space-y-3">
                  {mockApplicants.map(applicant => (
                    <div key={applicant.id} className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-indigo-100 flex items-center justify-center text-primary font-bold text-sm">
                          {applicant.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{applicant.name}</p>
                          <p className="text-xs text-muted-foreground">{applicant.university}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="text-xs font-medium text-foreground">{applicant.trustScore}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {applicant.skills.slice(0, 3).map(s => (
                            <span key={s} className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-primary/5 to-indigo-50 text-xs text-primary font-medium">{s}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="h-9 border-border text-muted-foreground hover:text-red-500 hover:border-red-300">
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAccept(task.id, applicant.name)}
                            disabled={acceptingId === applicant.name}
                            className="bg-emerald-600 text-white hover:bg-emerald-700 h-9 shadow-md"
                          >
                            {acceptingId === applicant.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}

        {filteredTasks.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No tasks found. Post your first task!</p>
            <Button onClick={() => setPage('post-task')} className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20">
              Post a Task
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
