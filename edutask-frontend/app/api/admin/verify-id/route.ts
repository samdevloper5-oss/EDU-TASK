import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const formData = await request.formData()
  const userId = formData.get('user_id') as string
  const action = formData.get('action') as string

  if (!userId || !action) {
    return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 })
  }

  if (action === 'approve') {
    await supabaseAdmin.from('users').update({ student_id_verified: true }).eq('id', userId)
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type: 'id_verified',
      title: 'ID Verified',
      message: 'Your student ID has been verified.',
      is_read: false,
    })
  } else {
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type: 'id_rejected',
      title: 'ID Rejected',
      message: 'Your student ID verification was rejected. Please upload a clearer image.',
      is_read: false,
    })
  }

  return NextResponse.redirect(new URL('/admin/verifications', request.url))
}

