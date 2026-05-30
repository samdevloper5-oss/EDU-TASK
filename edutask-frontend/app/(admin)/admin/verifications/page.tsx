import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileCheck } from 'lucide-react'

async function toSignedUrl(pathOrUrl: string | null) {
  if (!pathOrUrl) return null
  if (pathOrUrl.startsWith('http')) return pathOrUrl
  const { data } = await supabaseAdmin.storage.from('student-ids').createSignedUrl(pathOrUrl, 3600)
  return data?.signedUrl ?? null
}

export default async function AdminVerificationsPage() {
  const supabase = await createClient()
  const { data: pending } = await supabase
    .from('users')
    .select('id, full_name, email, university_name, student_id_image_url, created_at')
    .eq('student_id_verified', false)
    .not('student_id_image_url', 'is', null)
    .order('created_at', { ascending: false })

  const rows = await Promise.all(
    (pending ?? []).map(async (user) => ({
      ...user,
      signedUrl: await toSignedUrl(user.student_id_image_url),
    }))
  )

  return (
    <div className="space-y-6">
      <div>
        <p className="text-label mb-2">Admin</p>
        <h1 className="text-2xl font-bold text-[#0F0F0F] tracking-tight">Verifications</h1>
      </div>

      {rows.length === 0 ? (
        <Card className="p-10 text-center text-[#6B6B6B]">
          <FileCheck className="mx-auto mb-3 size-10 opacity-40" />
          <p>No pending verifications</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((user) => (
            <Card key={user.id} className="p-5 space-y-4">
              <div>
                <h3 className="font-semibold text-[#0F0F0F]">{user.full_name}</h3>
                <p className="text-sm text-[#6B6B6B]">{user.email}</p>
                <p className="text-xs text-[#A3A3A3] mt-1">{user.university_name}</p>
              </div>
              {user.signedUrl && (
                <a href={user.signedUrl} target="_blank" rel="noreferrer">
                  <img src={user.signedUrl} alt="Student ID" className="w-full rounded-xl border border-[#E5E5E3]" />
                </a>
              )}
              <p className="text-[11px] text-[#A3A3A3]">
                Submitted {new Date(user.created_at).toLocaleDateString()}
              </p>
              <div className="flex gap-2">
                <form action={`/api/admin/verifications/${user.id}/approve`} method="POST">
                  <Button size="sm" type="submit" className="bg-emerald-600 text-white hover:bg-emerald-700">
                    Approve
                  </Button>
                </form>
                <form action={`/api/admin/verifications/${user.id}/reject`} method="POST">
                  <Button size="sm" type="submit" variant="outline">
                    Reject
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
