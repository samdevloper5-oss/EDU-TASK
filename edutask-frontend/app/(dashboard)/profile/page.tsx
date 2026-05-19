'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Star, Shield, Award, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), [])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [bio, setBio] = useState('')
  const [editingBio, setEditingBio] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(data)
      setBio(data?.bio ?? '')
      setLoading(false)
    }
    fetchProfile()
  }, [supabase])

  const saveBio = async () => {
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio }),
    })
    const json = await res.json()
    if (!json.success) {
      toast.error(json.error ?? 'Failed to update bio')
      return
    }
    setProfile(json.data)
    setEditingBio(false)
    toast.success('Bio updated')
  }

  const trustLabel =
    (profile?.trust_score ?? 0) <= 20 ? '🌱 Newcomer' :
    (profile?.trust_score ?? 0) <= 40 ? '🔵 Learning' :
    (profile?.trust_score ?? 0) <= 60 ? '⭐ Trusted' :
    (profile?.trust_score ?? 0) <= 80 ? '🏆 Expert' : '💎 Elite'

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>My Profile</h1>

      <Card className="p-6 border-border">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
            {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div>
            <h2 className="text-xl font-bold">{profile?.full_name}</h2>
            <p className="text-sm text-muted-foreground">{profile?.university_name} · {profile?.department}</p>
            <div className="flex items-center gap-2 mt-1">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">{profile?.trust_score} {trustLabel}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 border-border text-center">
          <Award className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold">{profile?.completed_tasks ?? 0}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </Card>
        <Card className="p-4 border-border text-center">
          <Shield className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
          <p className="text-lg font-bold">{(profile?.total_earned ?? 0).toLocaleString()}৳</p>
          <p className="text-xs text-muted-foreground">Earned</p>
        </Card>
        <Card className="p-4 border-border text-center">
          <Star className="w-5 h-5 mx-auto mb-1 text-amber-500" />
          <p className="text-lg font-bold">{profile?.trust_score ?? 0}</p>
          <p className="text-xs text-muted-foreground">Trust Score</p>
        </Card>
      </div>

      <Card className="p-5 border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Bio</h3>
          <button onClick={() => setEditingBio(!editingBio)} className="text-xs text-primary hover:underline">
            {editingBio ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editingBio ? (
          <div className="space-y-2">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full min-h-[100px] rounded-md border border-border bg-background p-3 text-sm" placeholder="Tell others about yourself..." />
            <Button size="sm" onClick={saveBio} className="bg-primary text-primary-foreground">Save</Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{profile?.bio || 'No bio yet.'}</p>
        )}
      </Card>

      <Card className="p-5 border-border">
        <h3 className="font-semibold mb-3">Skills</h3>
        <div className="flex flex-wrap gap-2">
          {(profile?.skills ?? []).map((s: string) => (
            <span key={s} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{s}</span>
          ))}
        </div>
      </Card>

      <Card className="p-5 border-border">
        <h3 className="font-semibold mb-3">Student ID Status</h3>
        <div className="flex items-center gap-2">
          {profile?.student_id_verified ? (
            <><Shield className="w-5 h-5 text-emerald-500" /><span className="text-sm text-emerald-600 font-medium">Verified ✓</span></>
          ) : (
            <><Shield className="w-5 h-5 text-amber-500" /><span className="text-sm text-amber-600 font-medium">Pending Review</span></>
          )}
        </div>
      </Card>

      <Card className="p-5 border-border">
        <h3 className="font-semibold mb-3">Payment Methods</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>bKash</span>
            <span className="text-muted-foreground">{profile?.bkash_number ?? 'Not connected'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Nagad</span>
            <span className="text-muted-foreground">{profile?.nagad_number ?? 'Not connected'}</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
