import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin, user: adminUser } = await requireAdmin()
  if (!isAdmin || !adminUser) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { data: updated, error } = await supabaseAdmin
    .from('users')
    .update({ student_id_verified: false })
    .eq('id', id)
    .select('id, email, full_name, student_id_verified')
    .single()

  if (error || !updated) {
    return NextResponse.json({ success: false, error: 'Failed to reject verification' }, { status: 500 })
  }

  console.info(`[admin-action] ${new Date().toISOString()} admin=${adminUser.id} action=reject-id target=${id}`)

  await createNotification({
    userId: id,
    type: 'id_rejected',
    title: 'ID rejected',
    message: 'Your student ID verification was rejected. Please upload a clearer image.',
    link: '/profile',
  })

  return NextResponse.json({ success: true, data: updated })
}
