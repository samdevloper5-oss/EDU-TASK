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

  const { id } = await params
  const { data: updated, error } = await supabaseAdmin
    .from('messages')
    .update({ flagged: false })
    .eq('id', id)
    .select('id, task_id, flagged')
    .single()

  if (error || !updated) {
    return NextResponse.json({ success: false, error: 'Failed to clear flag' }, { status: 500 })
  }

  console.info(`[admin-action] ${new Date().toISOString()} admin=${adminUser.id} action=clear-flag target=${id}`)

  return NextResponse.json({ success: true, data: updated })
}
