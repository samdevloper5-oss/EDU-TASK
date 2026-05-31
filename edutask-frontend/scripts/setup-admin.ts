/**
 * Admin Setup Script
 *
 * Usage:
 *   npx tsx scripts/setup-admin.ts <email>
 *
 * Prerequisites:
 *   - User must already have a registered account
 *   - .env.local must have SUPABASE_SERVICE_ROLE_KEY set
 *   - Run after creating an account via the signup flow
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

async function setupAdmin(email: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in environment')
    process.exit(1)
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: user, error: findError } = await supabase
    .from('users')
    .select('id, email, is_admin')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (findError || !user) {
    console.error(`User not found with email: ${email}`)
    console.error('Make sure they have signed up first.')
    process.exit(1)
  }

  if (user.is_admin) {
    console.log(`User ${email} is already an admin.`)
    return
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ is_admin: true, profile_complete: true })
    .eq('id', user.id)

  if (updateError) {
    console.error('Failed to promote user:', updateError.message)
    process.exit(1)
  }

  console.log(`✅ User ${email} promoted to admin successfully!`)
}

const email = process.argv[2]
if (!email) {
  console.error('Usage: npx tsx scripts/setup-admin.ts <email>')
  process.exit(1)
}

setupAdmin(email).catch(console.error)
