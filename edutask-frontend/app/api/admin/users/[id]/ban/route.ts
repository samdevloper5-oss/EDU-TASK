import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { adminBanSchema } from '@/lib/validations/task.schema'
import { createNotification } from '@/lib/notifications'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin, user: adminUser } = await requireAdmin()
  if (!isAdmin || !adminUser) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id: targetUserId } = await params
  if (adminUser.id === targetUserId) {
    return NextResponse.json({ success: false, error: 'Cannot ban your own account' }, { status: 400 })
  }

  let payload: unknown = null
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('form-data') || contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData()
    payload = {
      is_banned: formData.get('is_banned') === 'true',
      ban_reason: formData.get('ban_reason')?.toString() || undefined,
    }
  } else {
    try {
      payload = await request.json()
    } catch {
      payload = null
    }
  }

  const parsed = adminBanSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { is_banned, ban_reason } = parsed.data
  const { data: target } = await supabaseAdmin
    .from('users')
    .select('id, is_admin, full_name, email')
    .eq('id', targetUserId)
    .single()

  if (!target) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
  }
  if (target.is_admin) {
    return NextResponse.json({ success: false, error: 'Cannot ban an admin account' }, { status: 400 })
  }

  const { data: updated, error } = await supabaseAdmin
    .from('users')
    .update({
      is_banned,
      ban_reason: is_banned ? ban_reason ?? 'Violation of platform rules' : null,
    })
    .eq('id', targetUserId)
    .select('id, email, full_name, is_banned, ban_reason')
    .single()

  if (error || !updated) {
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 })
  }

  console.info(
    `[admin-action] ${new Date().toISOString()} admin=${adminUser.id} action=${is_banned ? 'ban' : 'unban'} target=${targetUserId}`
  )

  await createNotification({
    userId: targetUserId,
    type: 'system',
    title: is_banned ? 'Account suspended' : 'Account reinstated',
    message: is_banned
      ? `Your account has been suspended. Reason: ${updated.ban_reason ?? 'Policy violation'}`
      : 'Your account suspension has been lifted. You can use EduTask again.',
    link: is_banned ? undefined : '/dashboard',
  })

  return NextResponse.json({ success: true, data: updated })
}
