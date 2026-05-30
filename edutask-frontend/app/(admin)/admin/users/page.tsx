'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, Loader2 } from 'lucide-react'

type UserRow = {
  id: string
  full_name: string | null
  email: string | null
  university_name: string | null
  trust_score: number | null
  completed_tasks: number | null
  wallet_balance: number | null
  student_id_verified: boolean | null
  is_admin: boolean | null
  is_banned: boolean | null
  created_at: string
  profile_photo_url: string | null
}

export default function AdminUsersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const filter = searchParams.get('filter') ?? 'all'

  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [banning, setBanning] = useState<string | null>(null)
  const [promoting, setPromoting] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filter === 'active') params.set('banned', 'false')
      if (filter === 'banned') params.set('banned', 'true')
      if (filter === 'admins') params.set('admins', 'true')
      const res = await fetch(`/api/admin/users?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setUsers(json.data ?? [])
      } else {
        toast.error(json.error ?? 'Failed to load users')
      }
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [search, filter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleBan = async (userId: string, currentlyBanned: boolean) => {
    setBanning(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_banned: !currentlyBanned }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(currentlyBanned ? 'User unbanned' : 'User banned')
        fetchUsers()
      } else {
        toast.error(json.error ?? 'Failed to update user')
      }
    } catch {
      toast.error('Failed to update user')
    } finally {
      setBanning(null)
    }
  }

  const handlePromote = async (userId: string, currentlyAdmin: boolean) => {
    setPromoting(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/promote`, {
        method: 'POST',
      })
      const json = await res.json()
      if (json.success) {
        toast.success(currentlyAdmin ? 'Admin rights removed' : 'User promoted to admin')
        fetchUsers()
      } else {
        toast.error(json.error ?? 'Failed to update admin status')
      }
    } catch {
      toast.error('Failed to update admin status')
    } finally {
      setPromoting(null)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const data = new FormData(form)
    const searchVal = (data.get('search') as string) ?? ''
    const params = new URLSearchParams()
    if (searchVal) params.set('search', searchVal)
    if (filter !== 'all') params.set('filter', filter)
    router.push(`/admin/users?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-label mb-2">Admin</p>
        <h1 className="text-2xl font-bold text-[#0F0F0F] tracking-tight">Users</h1>
      </div>

      <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
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
          onChange={(e) => {
            const params = new URLSearchParams()
            if (search) params.set('search', search)
            if (e.target.value !== 'all') params.set('filter', e.target.value)
            router.push(`/admin/users?${params.toString()}`)
          }}
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
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-8 animate-spin text-[#4F46E5]" />
          </div>
        ) : (
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
                {users.map((user) => (
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
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/profile/${user.id}`} className="text-xs text-[#4F46E5] hover:underline">
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleBan(user.id, !!user.is_banned)}
                          disabled={banning === user.id}
                          className="text-xs text-[#6B6B6B] hover:text-[#0F0F0F] disabled:opacity-40"
                        >
                          {banning === user.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : user.is_banned ? (
                            'Unban'
                          ) : (
                            'Ban'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePromote(user.id, !!user.is_admin)}
                          disabled={promoting === user.id}
                          className="text-xs text-[#6B6B6B] hover:text-[#0F0F0F] disabled:opacity-40"
                        >
                          {promoting === user.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : user.is_admin ? (
                            'Remove Admin'
                          ) : (
                            'Make Admin'
                          )}
                        </button>
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
        )}
      </Card>
    </div>
  )
}
