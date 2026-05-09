'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'
  return createBrowserClient<Database>(url, key)
}
