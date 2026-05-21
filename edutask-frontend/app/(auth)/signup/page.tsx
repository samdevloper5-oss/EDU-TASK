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

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'Min 8 chars', pass: password.length >= 8 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
    { label: 'Symbol', pass: /[^A-Za-z0-9]/.test(password) },
  ]
  const filled = checks.filter((c) => c.pass).length
  const strengthLabel = filled === 0 ? '' : filled === 1 ? 'Weak' : filled === 2 ? 'Fair' : filled === 3 ? 'Good' : 'Strong'
  const strengthColor = filled <= 1 ? 'bg-red-500' : filled === 2 ? 'bg-amber-500' : filled === 3 ? 'bg-blue-500' : 'bg-emerald-500'
  const textColor = filled <= 1 ? 'text-red-500' : filled === 2 ? 'text-amber-500' : filled === 3 ? 'text-blue-500' : 'text-emerald-500'

  if (!password) return null

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {checks.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < filled ? strengthColor : 'bg-border'}`}
          />
        ))}
        {strengthLabel && (
          <span className={`text-xs font-semibold ml-2 ${textColor} whitespace-nowrap`}>{strengthLabel}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {checks.map((c) => (
          <span key={c.label} className={`text-xs flex items-center gap-1 ${c.pass ? 'text-emerald-500' : 'text-muted-foreground'}`}>
            <span>{c.pass ? '✓' : '○'}</span> {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      toast.error('Password must be at least 8 characters with an uppercase letter and a number')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed')
      }
      toast.success(data.message)
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to home
      </Link>

      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-400 flex items-center justify-center shadow-md shadow-primary/20">
          <span className="text-primary-foreground font-bold">E</span>
        </div>
        <span className="font-bold text-xl text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>EduTask</span>
      </div>

      <Card className="p-8 border-border bg-card/80 backdrop-blur-sm shadow-2xl shadow-primary/5">
        <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Create account</h2>
        <p className="text-muted-foreground text-sm mb-8">Join Bangladesh&apos;s student task marketplace</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label className="text-foreground">Full Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1.5 bg-background border-border" placeholder="Your full name" />
          </div>
          <div>
            <Label className="text-foreground">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5 bg-background border-border" placeholder="you@university.edu" />
          </div>
          <div>
            <Label className="text-foreground">Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1.5 bg-background border-border" placeholder="Min 8 chars, uppercase, number" />
            <PasswordStrength password={password} />
          </div>
          <div>
            <Label className="text-foreground">Confirm Password</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="mt-1.5 bg-background border-border" placeholder="Re-enter password" />
          </div>
          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
            disabled={loading || !name || !email || !password || !confirmPassword}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/signin" className="text-primary hover:underline font-medium">
            Sign In
          </Link>
        </p>
      </Card>
    </>
  )
}
