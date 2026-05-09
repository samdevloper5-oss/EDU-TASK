'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSent(true)
      toast.success(data.message)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <>
        <Link href="/signin" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>
        <Card className="p-8 border-border bg-card/80 backdrop-blur-sm shadow-2xl shadow-primary/5 text-center">
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Check your email</h2>
          <p className="text-muted-foreground text-sm mb-6">If that email exists, a reset code was sent.</p>
          <Button onClick={() => router.push(`/reset-otp?email=${encodeURIComponent(email)}`)} className="w-full bg-primary text-primary-foreground">
            Enter Reset Code
          </Button>
        </Card>
      </>
    )
  }

  return (
    <>
      <Link href="/signin" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to sign in
      </Link>
      <Card className="p-8 border-border bg-card/80 backdrop-blur-sm shadow-2xl shadow-primary/5">
        <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Forgot password?</h2>
        <p className="text-muted-foreground text-sm mb-8">Enter your email and we&apos;ll send you a reset code.</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5" placeholder="you@university.edu" />
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading || !email}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Code'}
          </Button>
        </form>
      </Card>
    </>
  )
}
