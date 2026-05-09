"use client"

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/app-context'

export function SplashScreen() {
  const { setPage } = useApp()
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 100)
    const t2 = setTimeout(() => setPhase('exit'), 2200)
    const t3 = setTimeout(() => setPage('landing'), 3000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [setPage])

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-card z-50 overflow-hidden">
      {/* Soft glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl transition-all duration-1000"
          style={{ opacity: phase === 'visible' ? 1 : 0, scale: phase === 'visible' ? '1' : '0.5' }}
        />
      </div>
      <div
        className="flex flex-col items-center transition-all duration-700 ease-out relative"
        style={{
          opacity: phase === 'enter' ? 0 : phase === 'visible' ? 1 : 0,
          letterSpacing: phase === 'enter' ? '0.1em' : phase === 'visible' ? '0.35em' : '0.5em',
          transform: phase === 'enter' ? 'scale(0.95)' : phase === 'visible' ? 'scale(1)' : 'scale(1.02)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-indigo-400 flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-primary-foreground font-bold text-2xl" style={{ fontFamily: 'var(--font-heading)' }}>E</span>
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-wider text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
          EDUTASK
        </h1>
        <p
          className="mt-3 text-muted-foreground text-sm tracking-widest transition-opacity duration-500"
          style={{ opacity: phase === 'visible' ? 1 : 0 }}
        >
          STUDENT MICRO-TASK MARKETPLACE
        </p>
      </div>
    </div>
  )
}
