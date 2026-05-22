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
  useEffect(() => { if (value.length === 6) onComplete() }, [value, onComplete])

  const handleChange = (i: number, char: string) => {
    if (!/^\d?$/.test(char)) return
    const next = value.slice(0, i) + char + value.slice(i + 1)
    onChange(next.slice(0, 6))
    if (char && i < 5) inputsRef.current[i + 1]?.focus()
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!value[i] && i > 0) inputsRef.current[i - 1]?.focus()
      else onChange(value.slice(0, i) + '' + value.slice(i + 1))
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(text)
    if (text.length > 0) inputsRef.current[Math.min(text.length, 5)]?.focus()
  }

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input key={`reset-otp-digit-${i}`} ref={(el) => { inputsRef.current[i] = el }} type="text" inputMode="numeric" maxLength={1} value={value[i] ?? ''} onChange={(e) => handleChange(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)} onPaste={handlePaste} className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />
      ))}
    </div>
  )
}

function ResetOTPContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

  const handleVerify = async () => {
    if (otp.length !== 6) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: otp, type: 'recovery' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid OTP')
      sessionStorage.setItem('pw_reset_verified', JSON.stringify({ email, token: otp, timestamp: Date.now() }))
      router.push('/reset-password')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Link href="/forgot-password" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <Card className="p-8 border-border bg-card/80 backdrop-blur-sm shadow-2xl shadow-primary/5">
        <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Enter reset code</h2>
        <p className="text-muted-foreground text-sm mb-6">Enter the 6-digit code sent to {email}</p>
        <OTPInput value={otp} onChange={setOtp} onComplete={handleVerify} />
        <Button onClick={handleVerify} className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading || otp.length !== 6}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify Code'}
        </Button>
      </Card>
    </>
  )
}

export default function ResetOTPPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <ResetOTPContent />
    </Suspense>
  )
}
