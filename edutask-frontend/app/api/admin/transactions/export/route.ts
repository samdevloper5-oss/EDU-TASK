import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const type = new URL(request.url).searchParams.get('type')
  let query = supabaseAdmin
    .from('transactions')
    .select('id, type, amount, fee, net_amount, status, created_at')
    .order('created_at', { ascending: false })
    .limit(1000)

  if (type && type !== 'all') {
    query = query.eq('type', type as 'deposit' | 'withdrawal' | 'escrow_lock' | 'earning' | 'platform_fee' | 'refund')
  }

  const { data } = await query
  const rows = data ?? []
  const csv = [
    ['id', 'type', 'amount', 'fee', 'net_amount', 'status', 'created_at'].join(','),
    ...rows.map((row) =>
      [row.id, row.type, row.amount, row.fee, row.net_amount, row.status, row.created_at]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(',')
    ),
  ].join('\n')

  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="transactions.csv"',
    },
  })
}
