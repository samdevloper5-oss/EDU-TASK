'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useAuthStore } from '@/lib/store/auth.store'
import type { User } from '@/types'

let initialized = false

export function useAuth() {
  const router = useRouter()
  const supabase = createClient()
  const { user, isLoading, isEmailVerified, isProfileComplete, setUser, setLoading, clearAuth } = useAuthStore()
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)

  useEffect(() => {
    if (initialized) return
    initialized = true

    const init = async () => {
      setLoading(true)
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        if (profile) setUser(profile as User)
        else setLoading(false)
      } else {
        setLoading(false)
      }
    }

    void init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single()
          if (profile) setUser(profile as User)
        }
      }
      if (event === 'SIGNED_OUT') {
        initialized = false
        clearAuth()
        router.push('/')
      }
    })

    subscriptionRef.current = subscription

    return () => {
      subscription.unsubscribe()
      initialized = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signOut = async () => {
    initialized = false
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } catch {
      // Fallback
    }
    clearAuth()
    router.push('/')
    router.refresh()
  }

  return { user, isLoading, isEmailVerified, isProfileComplete, signOut }
}

