'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function SignInPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.includes('Email not confirmed') || error.message.includes('not confirmed')) {
          toast.error('Email not verified. Redirecting to verification...')
          await fetch('/api/auth/resend-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, type: 'signup' }),
          })
          router.push(`/verify-otp?email=${encodeURIComponent(email)}`)
          return
        }
        throw new Error('Incorrect email or password.')
      }

      if (data.user) {
        if (rememberMe) {
          document.cookie = 'edutask_remember=1; max-age=2592000; path=/; secure; samesite=strict'
        }
        // Check profile state
        const { data: profile } = await supabase
          .from('users')
          .select('email_verified, profile_complete')
          .eq('id', data.user.id)
          .single()

        if (!profile?.email_verified) {
          router.push(`/verify-otp?email=${encodeURIComponent(email)}`)
        } else if (!profile?.profile_complete) {
          router.push('/onboarding')
        } else {
          router.push('/dashboard')
          router.refresh()
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  const fillDemoWorker = () => {
    setEmail('tanvir@edutask.bd')
    setPassword('Demo1234!')
  }

  const fillDemoPoster = () => {
    setEmail('nadia@edutask.bd')
    setPassword('Demo1234!')
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
        <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Welcome back</h2>
        <p className="text-muted-foreground text-sm mb-8">Sign in to your EduTask account</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label className="text-foreground">Email</Label>
            <Input
              type="email"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1.5 bg-background border-border"
            />
          </div>
          <div>
            <Label className="text-foreground">Password</Label>
            <div className="relative mt-1.5">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background border-border pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-border"
              />
              Remember me
            </label>
            <Link href="/forgot-password" className="text-sm text-primary hover:underline font-medium">
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
            disabled={loading || !email || !password}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
          </Button>
        </form>

        <div className="mt-4 flex flex-col gap-2">
          <button type="button" onClick={fillDemoWorker} className="text-xs text-muted-foreground hover:text-primary transition-colors text-center">
            Load Demo Account (Worker)
          </button>
          <button type="button" onClick={fillDemoPoster} className="text-xs text-muted-foreground hover:text-primary transition-colors text-center">
            Load Demo Account (Poster)
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary hover:underline font-medium">
            Sign Up
          </Link>
        </p>
      </Card>
    </>
  )
}
