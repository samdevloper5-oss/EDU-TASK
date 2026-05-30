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
  const { data: message } = await supabaseAdmin
    .from('messages')
    .select('id, sender_id, task_id')
    .eq('id', id)
    .single()

  if (!message?.sender_id) {
    return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 })
  }

  await createNotification({
    userId: message.sender_id,
    type: 'system',
    title: 'Message warning',
    message: 'An admin reviewed one of your messages. Please follow platform rules.',
    link: `/chat/${message.task_id}`,
  })

  console.info(`[admin-action] ${new Date().toISOString()} admin=${adminUser.id} action=warn-message target=${id}`)

  return NextResponse.json({ success: true })
}
