'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

export default function SignInPage() {
  const router = useRouter()
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      })

      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          toast.error('Please verify your email first.')
          router.push(`/verify-otp?email=${encodeURIComponent(email)}`)
          return
        }
        toast.error(error.message.toLowerCase().includes('invalid') ? 'Invalid email or password' : error.message)
        return
      }

      if (!data.user) {
        toast.error('Sign in failed. Please try again.')
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

      router.push('/dashboard')
    } catch (err) {
      toast.error('Something went wrong. Please try again.')
      console.error('Sign in error:', err)
    } finally {
      setLoading(false)
    }
  }, [email, password, router])

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <div className="w-full">
          <div className="mb-8 flex items-center gap-2.5">
            <div className="size-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">E</span>
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>EduTask</span>
          </div>

          <div className="card p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-5">
              <div>
                <Label className="text-sm font-medium text-foreground">Email</Label>
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
                <div className="mb-1.5 flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground">Password</Label>
                  <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle-text transition-colors hover:text-foreground"
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
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Create one
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-subtle-text">
            By signing in, you agree to EduTask&apos;s{' '}
            <Link href="/terms" className="underline hover:text-foreground">Terms</Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
