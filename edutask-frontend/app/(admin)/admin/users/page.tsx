import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, ShieldOff, Search, Star, Wallet } from 'lucide-react'

type SearchParams = Record<string, string | string[] | undefined>

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const search = typeof params.search === 'string' ? params.search.trim() : ''
  const filter = typeof params.filter === 'string' ? params.filter : 'all'

  let query = supabase
    .from('users')
    .select(
      'id, full_name, email, university_name, trust_score, completed_tasks, wallet_balance, student_id_verified, is_admin, is_banned, created_at, profile_photo_url',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .limit(100)

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  if (filter === 'active') query = query.eq('is_banned', false)
  if (filter === 'banned') query = query.eq('is_banned', true)
  if (filter === 'admins') query = query.eq('is_admin', true)

  const { data: users } = await query

  return (
    <div className="space-y-6">
      <div>
        <p className="text-label mb-2">Admin</p>
        <h1 className="text-2xl font-bold text-[#0F0F0F] tracking-tight">Users</h1>
      </div>

      <form className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#A3A3A3]" />
          <input
            name="search"
            defaultValue={search}
            placeholder="Search name or email"
            className="h-10 w-72 rounded-lg border border-[#E5E5E3] bg-white pl-9 pr-3 text-sm focus:border-[#4F46E5] focus:outline-none"
          />
        </div>
        <select
          name="filter"
          defaultValue={filter}
          className="h-10 rounded-lg border border-[#E5E5E3] bg-white px-3 text-sm"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
          <option value="admins">Admins</option>
        </select>
        <Button type="submit" className="h-10 bg-[#4F46E5] text-white hover:bg-[#4338CA]">
          Filter
        </Button>
      </form>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F4F4F2] text-left">
              <tr>
                <th className="px-4 py-3">Avatar</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">University</th>
                <th className="px-4 py-3">Trust</th>
                <th className="px-4 py-3">Tasks</th>
                <th className="px-4 py-3">Wallet</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E3]">
              {(users ?? []).map((user) => (
                <tr key={user.id} className="hover:bg-[#F4F4F2]">
                  <td className="px-4 py-3">
                    <div className="size-8 overflow-hidden rounded-full bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center text-xs font-bold">
                      {user.profile_photo_url ? (
                        <img src={user.profile_photo_url} alt="" className="size-full object-cover" />
                      ) : (
                        user.full_name?.[0]?.toUpperCase() ?? 'U'
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#0F0F0F]">{user.full_name ?? 'Unknown'}</p>
                    <p className="text-xs text-[#A3A3A3]">{user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-[#6B6B6B]">{user.university_name ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">{user.trust_score ?? 0}</td>
                  <td className="px-4 py-3">{user.completed_tasks ?? 0}</td>
                  <td className="px-4 py-3">৳{Number(user.wallet_balance ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {user.student_id_verified ? (
                      <span className="text-emerald-600 text-xs font-medium">Verified</span>
                    ) : (
                      <span className="text-amber-600 text-xs font-medium">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#6B6B6B]">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/profile/${user.id}`} className="text-xs text-[#4F46E5] hover:underline">
                        View
                      </Link>
                      <form action={`/api/admin/users/${user.id}/ban`} method="POST">
                        <input type="hidden" name="is_banned" value={(!user.is_banned).toString()} />
                        <button type="submit" className="text-xs text-[#6B6B6B] hover:text-[#0F0F0F]">
                          {user.is_banned ? 'Unban' : 'Ban'}
                        </button>
                      </form>
                      <form action={`/api/admin/users/${user.id}/promote`} method="POST">
                        <button type="submit" className="text-xs text-[#6B6B6B] hover:text-[#0F0F0F]">
                          {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                        </button>
                      </form>
                      <Link href={`/wallet?user=${user.id}`} className="text-xs text-[#4F46E5] hover:underline">
                        Wallet
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
