"use client"

import { useApp } from '@/lib/app-context'
import { Card } from '@/components/ui/card'
import { Wallet, Clock, CheckCircle2, Star, TrendingUp, ArrowUpRight, ArrowDownRight, AlertCircle, X as CloseIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

const summaryCards = [
  { key: 'balance', label: 'Current Balance', icon: Wallet, gradient: 'from-primary/10 to-indigo-50', iconColor: 'text-primary' },
  { key: 'escrow', label: 'Pending Escrow', icon: Clock, gradient: 'from-amber-50 to-orange-50', iconColor: 'text-amber-600' },
  { key: 'completed', label: 'Completed Tasks', icon: CheckCircle2, gradient: 'from-emerald-50 to-teal-50', iconColor: 'text-emerald-600' },
  { key: 'trust', label: 'Trust Score', icon: Star, gradient: 'from-sky-50 to-blue-50', iconColor: 'text-sky-600' },
]

export function DashboardHome() {
  const { user, tasks, setPage } = useApp()
  const [showVerifyAlert, setShowVerifyAlert] = useState(!user.isEmailVerified)

  const formatValue = (key: string) => {
    switch (key) {
      case 'balance': return `${user.balance.toLocaleString()} BDT`
      case 'escrow': return `${user.pendingEscrow.toLocaleString()} BDT`
      case 'completed': return `${user.completedTasks}`
      case 'trust': return `${user.trustScore}/5.0`
      default: return ''
    }
  }

  const recentTasks = tasks.filter(t => t.status === 'open').slice(0, 4)
  const completedRecent = tasks.filter(t => t.status === 'completed').slice(0, 2)

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
          Welcome back, {user.name.split(' ')[0]}
        </h2>
        <p className="text-muted-foreground mt-1">{"Here's what's happening with your tasks today."}</p>
      </div>

      {/* Verification Alert */}
      {showVerifyAlert && (
        <Card className="p-4 border-amber-200 bg-amber-50/50 flex items-start gap-4 relative animate-pulse-glow">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0 pr-8">
            <h4 className="font-bold text-amber-900 text-sm">Please verify your email</h4>
            <p className="text-xs text-amber-700/80 mt-1 leading-relaxed">
              We've sent a verification link to <span className="font-medium">{user.email}</span>.
              Please verify your account to access all features.
            </p>
            <button
              className="text-xs font-bold text-amber-800 hover:underline mt-2 flex items-center gap-1"
              onClick={() => toast.success('Verification email resent!')}
            >
              Resend Link
            </button>
          </div>
          <button
            onClick={() => setShowVerifyAlert(false)}
            className="absolute top-4 right-4 text-amber-400 hover:text-amber-600 transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {summaryCards.map((card, i) => (
          <Card
            key={card.key}
            className={`p-5 border-border bg-gradient-to-br ${card.gradient} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-fade-up stagger-${i + 1}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-11 h-11 rounded-2xl bg-card/80 backdrop-blur-sm flex items-center justify-center shadow-sm`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{formatValue(card.key)}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
          </Card>
        ))}
      </div>

      {/* Task Feed and Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Available Tasks */}
        <div className="lg:col-span-2">
          <Card className="border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Available Tasks</h3>
              <button
                onClick={() => setPage('tasks')}
                className="text-xs text-primary hover:underline font-medium"
              >
                View All
              </button>
            </div>
            <div className="divide-y divide-border">
              {recentTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-5 hover:bg-muted/30 transition-all duration-200 cursor-pointer group"
                  onClick={() => setPage('tasks')}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${task.type === 'online' ? 'bg-gradient-to-br from-sky-50 to-blue-50 text-sky-600' :
                        task.type === 'offline' ? 'bg-gradient-to-br from-amber-50 to-orange-50 text-amber-600' :
                          'bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600'
                      } group-hover:shadow-md transition-shadow`}>
                      <span className="text-xs font-bold uppercase">{task.type[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{task.postedBy} &middot; {task.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-semibold ${task.type === 'volunteer'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-gradient-to-r from-primary/10 to-indigo-50 text-primary'
                      }`}>
                      {task.type === 'volunteer' ? `${task.hours}h` : `${task.payment} BDT`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Activity */}
        <div>
          <Card className="border-border bg-card shadow-sm">
            <div className="p-5 border-b border-border">
              <h3 className="font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Recent Activity</h3>
            </div>
            <div className="p-5 space-y-4">
              {/* Earnings stat */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-indigo-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-600">This Month</span>
                </div>
                <p className="text-xl font-bold text-foreground">1,550 BDT</p>
                <p className="text-xs text-muted-foreground mt-0.5">Earned from 5 tasks</p>
              </div>

              {/* Spending stat */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/50 to-orange-50/30">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownRight className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-600">Pending</span>
                </div>
                <p className="text-xl font-bold text-foreground">{user.pendingEscrow} BDT</p>
                <p className="text-xs text-muted-foreground mt-0.5">In escrow for active tasks</p>
              </div>

              {/* Completed tasks */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completed</p>
                {completedRecent.map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.payment} BDT</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
