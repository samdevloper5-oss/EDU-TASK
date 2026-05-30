'use client'

import { useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
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
      if (data.user.email === ADMIN_EMAIL) {
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
    <div className="min-h-screen bg-[#F8F8F7] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-10">
          <div className="size-8 rounded-lg bg-[#4F46E5] flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <span className="text-[#0F0F0F] font-bold text-lg tracking-tight">EduTask</span>
        </div>

        <div className="bg-white border border-[#E5E5E3] rounded-2xl p-8">
          <h1 className="text-[#0F0F0F] text-2xl font-bold tracking-tight mb-1">Welcome back</h1>
          <p className="text-[#6B6B6B] text-sm mb-8">Sign in to your account</p>

          <form onSubmit={handleSignIn} className="space-y-5">
            <div>
              <Label className="text-[#0F0F0F] text-sm font-medium">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="mt-1.5 h-10 bg-white border-[#E5E5E3] rounded-lg text-sm focus-visible:ring-[#4F46E5] focus-visible:border-[#4F46E5]"
                placeholder="you@university.edu"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-[#0F0F0F] text-sm font-medium">Password</Label>
                <Link href="/forgot-password" className="text-xs text-[#4F46E5] hover:underline">
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
                  className="h-10 bg-white border-[#E5E5E3] rounded-lg text-sm pr-10 focus-visible:ring-[#4F46E5] focus-visible:border-[#4F46E5]"
                  placeholder="Your password"
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
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg text-sm font-medium transition-colors"
              disabled={loading || !email || !password}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[#6B6B6B]">
            No account?{' '}
            <Link href="/signup" className="text-[#4F46E5] font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-[#A3A3A3]">
          By signing in, you agree to EduTask&apos;s{' '}
          <Link href="/terms" className="underline hover:text-[#6B6B6B]">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-[#6B6B6B]">
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
