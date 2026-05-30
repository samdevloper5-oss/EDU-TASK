'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
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
    <div className="flex gap-2 justify-center">
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
          className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-[#E5E5E3] bg-white text-[#0F0F0F] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40 focus:border-[#4F46E5] transition-all"
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
      toast.success('Email verified! Setting up your profile...')
      await new Promise((resolve) => setTimeout(resolve, 800))
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
    <div className="min-h-screen bg-[#F8F8F7] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/signup" className="flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#0F0F0F] transition-colors mb-8">
          <ArrowLeft className="size-4" /> Back to sign up
        </Link>

        <div className="flex items-center gap-2.5 mb-8">
          <div className="size-8 rounded-lg bg-[#4F46E5] flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <span className="text-[#0F0F0F] font-bold text-lg tracking-tight">EduTask</span>
        </div>

        <div className="bg-white border border-[#E5E5E3] rounded-2xl p-8">
          <h1 className="text-[#0F0F0F] text-2xl font-bold tracking-tight mb-1">Verify your email</h1>
          <p className="text-[#6B6B6B] text-sm mb-6">Enter the 6-digit code sent to {email}</p>

          <div className={`transition-transform ${errorShake ? 'animate-shake' : ''}`}>
            <OTPInput value={otp} onChange={setOtp} onComplete={handleVerify} />
          </div>

          <Button
            onClick={handleVerify}
            className="w-full mt-6 h-10 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg text-sm font-medium transition-colors"
            disabled={loading || otp.length !== 6}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : 'Verify Email'}
          </Button>

          <div className="mt-6 text-center">
            {countdown > 0 ? (
              <p className="text-sm text-[#6B6B6B]">Resend code in {countdown}s</p>
            ) : (
              <button type="button" onClick={handleResend} className="text-sm text-[#4F46E5] hover:underline font-medium">
                Resend code
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-[#4F46E5]" /></div>}>
      <VerifyOTPContent />
    </Suspense>
  )
}
