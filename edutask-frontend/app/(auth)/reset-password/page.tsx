'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('pw_reset_verified')
    if (!raw) { router.replace('/forgot-password'); return }
    const parsed = JSON.parse(raw)
    if (Date.now() - parsed.timestamp > 10 * 60 * 1000) {
      sessionStorage.removeItem('pw_reset_verified')
      router.replace('/forgot-password')
      return
    }
    setEmail(parsed.email)
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.error('Password must be at least 8 characters with uppercase and number')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Reset failed')
      sessionStorage.removeItem('pw_reset_verified')
      toast.success(data.message)
      router.push('/signin')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reset failed')
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
        <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>New password</h2>
        <p className="text-muted-foreground text-sm mb-8">Create a new password for your account</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Reset Code</Label>
            <Input value={otp} onChange={(e) => setOtp(e.target.value)} required className="mt-1.5" placeholder="6-digit code" maxLength={6} />
          </div>
          <div>
            <Label>New Password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="mt-1.5" placeholder="Min 8 chars, uppercase, number" />
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="mt-1.5" placeholder="Re-enter password" />
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading || !otp || !newPassword || !confirmPassword}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
          </Button>
        </form>
      </Card>
    </>
  )
}
