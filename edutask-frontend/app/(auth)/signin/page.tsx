'use client'

import { useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

const ADMIN_EMAIL = 'admin@edutask.bd'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)

    try {
      const supabase = createClient()
      const normalizedEmail = email.toLowerCase().trim()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          toast.error('Please verify your email first.')
          router.push(`/verify-otp?email=${encodeURIComponent(email)}`)
          return
        }
        toast.error(
          error.message.toLowerCase().includes('invalid')
            ? 'Invalid email or password'
            : error.message
        )
        return
      }

      if (!data.user) {
        toast.error('Sign in failed. Please try again.')
        return
      }

      // Admin check by email — bypass users table entirely
      const userEmail = data.user.email?.toLowerCase().trim() ?? ''
      if (userEmail === ADMIN_EMAIL) {
        router.push('/admin')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('is_admin, profile_complete, email_verified, is_banned')
        .eq('id', data.user.id)
        .single()

      if (profile?.is_banned) {
        await supabase.auth.signOut()
        toast.error('Your account has been suspended.')
        return
      }

      if (profile?.is_admin) {
        router.push('/admin')
        return
      }

      if (!profile?.email_verified) {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}`)
        return
      }

      if (!profile?.profile_complete) {
        router.push('/onboarding')
        return
      }

      router.push(next)
    } catch (err) {
      toast.error('Something went wrong. Please try again.')
      console.error('Sign in error:', err)
    } finally {
      setLoading(false)
    }
  }, [email, password, router, next])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-10">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">E</span>
          </div>
          <span className="text-foreground font-bold text-lg tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>EduTask</span>
        </div>

        <Card className="p-8 border-border">
          <h1 className="text-foreground text-2xl font-bold tracking-tight mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Welcome back</h1>
          <p className="text-muted-foreground text-sm mb-8">Sign in to your account</p>

          <form onSubmit={handleSignIn} className="space-y-5">
            <div>
              <Label className="text-foreground text-sm font-medium">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="mt-1.5"
                placeholder="you@university.edu"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-foreground text-sm font-medium">Password</Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                  placeholder="Your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !email || !password}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            No account?{' '}
            <Link href="/signup" className="text-primary font-medium hover:underline">
              Create one
            </Link>
          </p>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By signing in, you agree to EduTask&apos;s{' '}
          <Link href="/terms" className="underline hover:text-muted">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-muted">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  )
}
