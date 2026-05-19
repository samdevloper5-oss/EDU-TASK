import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, ShieldOff } from 'lucide-react'

export default async function AdminUsersPage() {
  const supabase = await createServerSupabaseClient()

  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, email, university_name, trust_score, completed_tasks, is_banned, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>User Management</h1>

      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">University</th>
                <th className="text-left px-4 py-3 font-medium">Trust Score</th>
                <th className="text-left px-4 py-3 font-medium">Completed</th>
                <th className="text-left px-4 py-3 font-medium">Joined</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(users ?? []).map((u) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.university_name}</td>
                  <td className="px-4 py-3 font-medium">{u.trust_score}</td>
                  <td className="px-4 py-3">{u.completed_tasks}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {u.is_banned ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-500"><ShieldOff className="w-3 h-3" /> Banned</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-500"><Shield className="w-3 h-3" /> Active</span>
                    )}
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
