import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  isLoading: boolean
  isEmailVerified: boolean
  isProfileComplete: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  clearAuth: () => void
  updateBalance: (wallet: number, escrow: number) => void
  updateTrustScore: (score: number) => void
  markEmailVerified: () => void
  markProfileComplete: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      isEmailVerified: false,
      isProfileComplete: false,
      setUser: (user) =>
        set({
          user,
          isEmailVerified: user?.email_verified ?? false,
          isProfileComplete: user?.profile_complete ?? false,
          isLoading: false,
        }),
      setLoading: (loading) => set({ isLoading: loading }),
      clearAuth: () =>
        set({
          user: null,
          isLoading: false,
          isEmailVerified: false,
          isProfileComplete: false,
        }),
      updateBalance: (wallet, escrow) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, wallet_balance: wallet, escrow_balance: escrow }
            : null,
        })),
      updateTrustScore: (score) =>
        set((state) => ({
          user: state.user ? { ...state.user, trust_score: score } : null,
        })),
      markEmailVerified: () => set({ isEmailVerified: true }),
      markProfileComplete: () => set({ isProfileComplete: true }),
    }),
    {
      name: 'edutask-auth-v2',
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null
          const str = sessionStorage.getItem(name)
          return str ? JSON.parse(str) : null
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return
          sessionStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => {
          if (typeof window === 'undefined') return
          sessionStorage.removeItem(name)
        },
      },
      partialize: (state) => ({
        user: state.user,
        isEmailVerified: state.isEmailVerified,
        isProfileComplete: state.isProfileComplete,
      }),
    }
  )
)
