import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileCheck } from 'lucide-react'

export default async function AdminVerificationsPage() {
  const supabase = await createServerSupabaseClient()

  const { data: pending } = await supabase
    .from('users')
    .select('id, full_name, university_name, student_id_image_url, created_at')
    .eq('student_id_verified', false)
    .not('student_id_image_url', 'is', null)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>ID Verification Queue</h1>

      {(pending ?? []).length === 0 ? (
        <Card className="p-10 border-border text-center text-muted-foreground">
          <FileCheck className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No pending verifications</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {(pending ?? []).map((u) => (
            <Card key={u.id} className="p-5 border-border">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{u.full_name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{u.university_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">Submitted: {new Date(u.created_at).toLocaleDateString()}</p>
                  {u.student_id_image_url && (
                    <a href={u.student_id_image_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-2 inline-block">
                      View ID Image
                    </a>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <form action="/api/admin/verify-id" method="POST">
                    <input type="hidden" name="user_id" value={u.id} />
                    <input type="hidden" name="action" value="approve" />
                    <Button size="sm" type="submit" className="bg-emerald-500 text-white hover:bg-emerald-600">Approve</Button>
                  </form>
                  <form action="/api/admin/verify-id" method="POST">
                    <input type="hidden" name="user_id" value={u.id} />
                    <input type="hidden" name="action" value="reject" />
                    <Button size="sm" type="submit" variant="outline" className="text-red-600 border-red-200">Reject</Button>
                  </form>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
