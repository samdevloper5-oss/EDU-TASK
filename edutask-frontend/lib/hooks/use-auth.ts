'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store/auth.store'
import type { User } from '@/types'

export function useAuth() {
  const router = useRouter()
  const supabase = createClient()
  const { user, isLoading, isEmailVerified, isProfileComplete, setUser, setLoading, clearAuth } = useAuthStore()

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        if (profile) {
          setUser(profile as User)
        } else {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }
    init()
  }, [supabase, setUser, setLoading])

  useEffect(() => {
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
        clearAuth()
        router.push('/')
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase, setUser, clearAuth, router])

  const signOut = async () => {
    await supabase.auth.signOut()
    clearAuth()
    router.push('/')
  }

  return { user, isLoading, isEmailVerified, isProfileComplete, signOut }
}
