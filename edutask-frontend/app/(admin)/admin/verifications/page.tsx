'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileCheck, Loader2 } from 'lucide-react'

type VerificationUser = {
  id: string
  full_name: string | null
  email: string | null
  university_name: string | null
  student_id_image_url: string | null
  created_at: string
  signedUrl: string | null
}

export default function AdminVerificationsPage() {
  const [users, setUsers] = useState<VerificationUser[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const fetchPending = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/verify-id')
      const json = await res.json()
      if (json.success) {
        setUsers(json.data ?? [])
      } else {
        toast.error(json.error ?? 'Failed to load verifications')
      }
    } catch {
      toast.error('Failed to load verifications')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  const handleAction = async (url: string, userId: string, successMsg: string) => {
    setActing(userId)
    try {
      const res = await fetch(url, { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        toast.success(successMsg)
        fetchPending()
      } else {
        toast.error(json.error ?? 'Action failed')
      }
    } catch {
      toast.error('Action failed')
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-label mb-2">Admin</p>
        <h1 className="text-2xl font-bold text-[#0F0F0F] tracking-tight">Verifications</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-[#4F46E5]" />
        </div>
      ) : users.length === 0 ? (
        <Card className="p-10 text-center text-[#6B6B6B]">
          <FileCheck className="mx-auto mb-3 size-10 opacity-40" />
          <p>No pending verifications</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {users.map((user) => (
            <Card key={user.id} className="p-5 space-y-4">
              <div>
                <h3 className="font-semibold text-[#0F0F0F]">{user.full_name}</h3>
                <p className="text-sm text-[#6B6B6B]">{user.email}</p>
                <p className="text-xs text-[#A3A3A3] mt-1">{user.university_name}</p>
              </div>
              {user.signedUrl && (
                <a href={user.signedUrl} target="_blank" rel="noreferrer">
                  <img
                    src={user.signedUrl}
                    alt="Student ID"
                    className="w-full rounded-xl border border-[#E5E5E3]"
                  />
                </a>
              )}
              <p className="text-[11px] text-[#A3A3A3]">
                Submitted {new Date(user.created_at).toLocaleDateString()}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  type="button"
                  disabled={acting === user.id}
                  onClick={() =>
                    handleAction(`/api/admin/verifications/${user.id}/approve`, user.id, 'ID verified')
                  }
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {acting === user.id ? <Loader2 className="size-3 animate-spin" /> : null}
                  Approve
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  disabled={acting === user.id}
                  onClick={() =>
                    handleAction(`/api/admin/verifications/${user.id}/reject`, user.id, 'ID rejected')
                  }
                >
                  {acting === user.id ? <Loader2 className="size-3 animate-spin" /> : null}
                  Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
