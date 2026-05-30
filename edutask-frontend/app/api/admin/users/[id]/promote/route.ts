import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin, user: adminUser } = await requireAdmin()
  if (!isAdmin || !adminUser) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id: targetUserId } = await params
  const { data: target } = await supabaseAdmin
    .from('users')
    .select('id, is_admin, full_name')
    .eq('id', targetUserId)
    .single()

  if (!target) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
  }

  const { data: updated, error } = await supabaseAdmin
    .from('users')
    .update({ is_admin: !target.is_admin })
    .eq('id', targetUserId)
    .select('id, email, full_name, is_admin')
    .single()

  if (error || !updated) {
    return NextResponse.json({ success: false, error: 'Failed to update admin status' }, { status: 500 })
  }

  console.info(
    `[admin-action] ${new Date().toISOString()} admin=${adminUser.id} action=${target.is_admin ? 'remove-admin' : 'promote'} target=${targetUserId}`
  )

  return NextResponse.json({ success: true, data: updated })
}
