'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

function OTPInput({ value, onChange, onComplete }: { value: string; onChange: (v: string) => void; onComplete: () => void }) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (value.length === 6) onComplete()
  }, [value, onComplete])

  const handleChange = (i: number, char: string) => {
    if (!/^\d?$/.test(char)) return
    const next = value.slice(0, i) + char + value.slice(i + 1)
    onChange(next.slice(0, 6))
    if (char && i < 5) {
      inputsRef.current[i + 1]?.focus()
    }
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!value[i] && i > 0) {
        inputsRef.current[i - 1]?.focus()
      } else {
        const next = value.slice(0, i) + '' + value.slice(i + 1)
        onChange(next)
      }
    }
    if (e.key === 'ArrowLeft' && i > 0) inputsRef.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) inputsRef.current[i + 1]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(text)
    if (text.length === 6) {
      inputsRef.current[5]?.focus()
    } else if (text.length > 0) {
      inputsRef.current[Math.min(text.length, 5)]?.focus()
    }
  }

  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={`otp-digit-${i}`}
          ref={(el) => { inputsRef.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="h-14 w-12 rounded-md border border-border bg-background text-center text-xl font-semibold tracking-[0.2em] text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      ))}
    </div>
  )
}

function VerifyOTPContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [errorShake, setErrorShake] = useState(false)

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const handleVerify = async () => {
    if (otp.length !== 6) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: otp, type: 'signup' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorShake(true)
        setTimeout(() => setErrorShake(false), 500)
        throw new Error(data.error || 'Invalid OTP')
      }
      toast.success('Email verified. Setting up your profile...')
      await new Promise((resolve) => setTimeout(resolve, 600))
      router.push('/onboarding')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'signup' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('A new code has been sent')
      setCountdown(60)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resend')
    }
  }

  return (
    <>
      <Link href="/signup" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="mb-8 flex items-center gap-2.5">
        <div className="size-10 rounded-md bg-primary flex items-center justify-center">
          <span className="font-bold text-primary-foreground">E</span>
        </div>
        <span className="text-xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>EduTask</span>
      </div>

      <Card className={`p-8 ${errorShake ? 'animate-shake' : ''}`}>
        <h2 className="mb-1 text-2xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
          Verify your email
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">Enter the 6-digit code sent to {email}</p>

        <OTPInput value={otp} onChange={setOtp} onComplete={handleVerify} />

        <Button
          onClick={handleVerify}
          className="mt-6 w-full"
          disabled={loading || otp.length !== 6}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : 'Verify Email'}
        </Button>

        <div className="mt-6 text-center">
          {countdown > 0 ? (
            <p className="text-sm text-muted-foreground">Resend code in {countdown}s</p>
          ) : (
            <button type="button" onClick={handleResend} className="text-sm font-medium text-primary hover:underline">
              Resend code
            </button>
          )}
        </div>
      </Card>
    </>
  )
}

export default function VerifyOTPPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <div className="w-full">
          <Suspense fallback={<div className="py-20 text-center"><Loader2 className="mx-auto size-8 animate-spin text-primary" /></div>}>
            <VerifyOTPContent />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
