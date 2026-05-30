'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'One uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'One number', pass: /[0-9]/.test(password) },
  ]
  const score = checks.filter((check) => check.pass).length
  const width = score === 0 ? '0%' : score === 1 ? '33%' : score === 2 ? '66%' : '100%'
  const color = score <= 1 ? '#EF4444' : score === 2 ? '#F59E0B' : '#10B981'
  const label = score === 0 ? '' : score === 1 ? 'Weak' : score === 2 ? 'Fair' : 'Strong'

  if (!password) return null

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-[#E5E5E3] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300" style={{ width, backgroundColor: color }} />
        </div>
        {label && <span className="text-xs font-medium" style={{ color }}>{label}</span>}
      </div>
      <div className="space-y-1">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-1.5">
            <Check className={`size-3 ${check.pass ? 'text-[#10B981]' : 'text-[#D4D4D4]'}`} />
            <span className={`text-xs ${check.pass ? 'text-[#10B981]' : 'text-[#A3A3A3]'}`}>{check.label}</span>
          </div>
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
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password || !confirmPassword) return

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      toast.error('Password must be at least 8 characters with one uppercase letter and one number')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Registration failed')
      }

      toast.success('Check your email for a 6-digit verification code')
      await new Promise((resolve) => setTimeout(resolve, 300))
      router.push(`/verify-otp?email=${encodeURIComponent(email.trim())}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed')
      setLoading(false)
    }
  }, [name, email, password, confirmPassword, router])

  return (
    <div className="min-h-screen bg-[#F8F8F7] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <span className="text-[#0F0F0F] font-bold text-lg tracking-tight">EduTask</span>
        </div>

        <div className="bg-white border border-[#E5E5E3] rounded-2xl p-8">
          <h1 className="text-[#0F0F0F] text-2xl font-bold tracking-tight mb-1">Create account</h1>
          <p className="text-[#6B6B6B] text-sm mb-8">Join Bangladesh&apos;s student task marketplace</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-[#0F0F0F] text-sm font-medium">Full Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="mt-1.5 h-10 bg-white border-[#E5E5E3] rounded-lg text-sm focus-visible:ring-[#4F46E5]"
                placeholder="Your full name"
              />
            </div>

            <div>
              <Label className="text-[#0F0F0F] text-sm font-medium">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="mt-1.5 h-10 bg-white border-[#E5E5E3] rounded-lg text-sm focus-visible:ring-[#4F46E5]"
                placeholder="you@university.edu"
              />
            </div>

            <div>
              <Label className="text-[#0F0F0F] text-sm font-medium">Password</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-10 bg-white border-[#E5E5E3] rounded-lg text-sm pr-10 focus-visible:ring-[#4F46E5]"
                  placeholder="Min 8 chars, uppercase, number"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A3A3A3] hover:text-[#0F0F0F] transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            <div>
              <Label className="text-[#0F0F0F] text-sm font-medium">Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="mt-1.5 h-10 bg-white border-[#E5E5E3] rounded-lg text-sm focus-visible:ring-[#4F46E5]"
                placeholder="Re-enter password"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg text-sm font-medium transition-colors mt-2"
              disabled={loading || !name || !email || !password || !confirmPassword || password !== confirmPassword}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[#6B6B6B]">
            Already have an account?{' '}
            <Link href="/signin" className="text-[#4F46E5] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
