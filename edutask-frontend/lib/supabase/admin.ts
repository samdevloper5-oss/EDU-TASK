// SERVER ONLY — never import in client components
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types'

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required')
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Lazy init to avoid build-time env errors
let _client: ReturnType<typeof createAdminClient> | undefined

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createAdminClient>, {
  get(_, prop: string | symbol) {
    if (!_client) {
      _client = createAdminClient()
    }
    return (_client as any)[prop]
  },
})
