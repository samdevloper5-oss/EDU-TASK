import { createClient } from '@/utils/supabase/server'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const type = typeof params.type === 'string' ? params.type : 'all'
  const supabase = await createClient()
  let query = supabase
    .from('transactions')
    .select('id, user_id, type, amount, fee, net_amount, status, created_at, user:users!transactions_user_id_fkey(full_name)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (type !== 'all') {
    query = query.eq('type', type as 'deposit' | 'withdrawal' | 'escrow_lock' | 'earning' | 'platform_fee' | 'refund')
  }

  const { data } = await query
  const rows = (data ?? []) as Array<{
    id: string
    type: string
    amount: number | null
    fee: number | null
    net_amount: number | null
    status: string
    created_at: string
    user: { full_name?: string } | null
  }>
  const revenue = rows.filter((row) => row.type === 'platform_fee' && row.status === 'completed')
    .reduce((sum, row) => sum + Number(row.net_amount || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-label mb-2">Admin</p>
        <h1 className="text-2xl font-bold text-[#0F0F0F] tracking-tight">Transactions</h1>
      </div>

      <form className="flex flex-wrap items-center gap-3">
        <select name="type" defaultValue={type} className="h-10 rounded-lg border border-[#E5E5E3] bg-white px-3 text-sm">
          <option value="all">All</option>
          <option value="deposit">Deposits</option>
          <option value="withdrawal">Withdrawals</option>
          <option value="escrow_lock">Escrow</option>
          <option value="earning">Earnings</option>
          <option value="platform_fee">Platform Fees</option>
          <option value="refund">Refunds</option>
        </select>
        <button className="h-10 rounded-lg bg-[#4F46E5] px-4 text-sm text-white">Filter</button>
        <a
          href={`/api/admin/transactions/export?type=${encodeURIComponent(type)}`}
          className="h-10 rounded-lg border border-[#E5E5E3] bg-white px-4 text-sm leading-10 text-[#0F0F0F]"
        >
          Export CSV
        </a>
        <span className="text-sm text-[#6B6B6B] ml-auto">Revenue: ৳{revenue.toLocaleString()}</span>
      </form>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F4F4F2] text-left">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Net</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E3]">
            {rows.map((tx) => (
              <tr key={tx.id} className="hover:bg-[#F4F4F2]">
                <td className="px-4 py-3 capitalize">{tx.type.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3">{(tx as any).user?.full_name ?? '—'}</td>
                <td className="px-4 py-3">৳{Number(tx.amount ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3">৳{Number(tx.net_amount ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs font-medium">{tx.status}</td>
                <td className="px-4 py-3 text-[#6B6B6B]">{new Date(tx.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
