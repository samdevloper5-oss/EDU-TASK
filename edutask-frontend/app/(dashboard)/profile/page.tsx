'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Star, Shield, Award, Loader2, Camera } from 'lucide-react'
import { toast } from 'sonner'

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), [])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [bio, setBio] = useState('')
  const [editingBio, setEditingBio] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [editingSkills, setEditingSkills] = useState(false)
  const [skillInput, setSkillInput] = useState('')
  const [editableSkills, setEditableSkills] = useState<string[]>([])

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
      setEditableSkills(data?.skills ?? [])
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }

    setAvatarUploading(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      const ext = file.name.split('.').pop()
      const filePath = `${authUser.id}/${Date.now()}.${ext}`
      const { error: upError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
      if (upError) throw upError
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_photo_url: urlData.publicUrl }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setProfile(json.data)
      toast.success('Profile photo updated!')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update photo')
    } finally {
      setAvatarUploading(false)
    }
  }

  const saveSkills = async () => {
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills: editableSkills }),
    })
    const json = await res.json()
    if (!json.success) { toast.error(json.error ?? 'Failed to update skills'); return }
    setProfile(json.data)
    setEditingSkills(false)
    toast.success('Skills updated')
  }

  const trustLabel =
    (profile?.trust_score ?? 0) <= 20 ? 'Newcomer' :
    (profile?.trust_score ?? 0) <= 40 ? 'Learning' :
    (profile?.trust_score ?? 0) <= 60 ? 'Trusted' :
    (profile?.trust_score ?? 0) <= 80 ? 'Expert' : 'Elite'

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>My Profile</h1>

      <Card className="p-6 border-border rounded-2xl">
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl overflow-hidden ring-2 ring-primary/20 shrink-0 cursor-pointer relative group"
            onClick={() => avatarInputRef.current?.click()}
          >
            {profile?.profile_photo_url ? (
              <img src={profile.profile_photo_url} alt={profile.full_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">{profile?.full_name?.[0]?.toUpperCase() ?? 'U'}</span>
            )}
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {avatarUploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
            </div>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
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
        <Card className="p-4 border-border text-center rounded-2xl">
          <Award className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold">{profile?.completed_tasks ?? 0}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </Card>
        <Card className="p-4 border-border text-center rounded-2xl">
          <Shield className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
          <p className="text-lg font-bold">{(profile?.total_earned ?? 0).toLocaleString()}৳</p>
          <p className="text-xs text-muted-foreground">Earned</p>
        </Card>
        <Card className="p-4 border-border text-center rounded-2xl">
          <Star className="w-5 h-5 mx-auto mb-1 text-amber-500" />
          <p className="text-lg font-bold">{profile?.trust_score ?? 0}</p>
          <p className="text-xs text-muted-foreground">Trust Score</p>
        </Card>
      </div>

      <Card className="p-5 border-border rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Bio</h3>
          <button onClick={() => setEditingBio(!editingBio)} className="text-xs text-primary hover:underline">
            {editingBio ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editingBio ? (
          <div className="space-y-2">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full min-h-[100px] rounded-xl border border-border bg-background p-3 text-sm" placeholder="Tell others about yourself..." />
            <Button size="sm" onClick={saveBio} className="bg-primary text-primary-foreground rounded-lg">Save</Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{profile?.bio || 'No bio yet.'}</p>
        )}
      </Card>

      <Card className="p-5 border-border rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Skills</h3>
          <button
            onClick={() => { setEditingSkills(!editingSkills); setEditableSkills(profile?.skills ?? []) }}
            className="text-xs text-primary hover:underline"
          >
            {editingSkills ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editingSkills ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5 min-h-[40px] p-2 rounded-xl border border-border bg-background">
              {editableSkills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {s}
                  <button type="button" onClick={() => setEditableSkills((prev) => prev.filter((x) => x !== s))} className="ml-0.5 hover:text-destructive">×</button>
                </span>
              ))}
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    const t = skillInput.trim().replace(/,$/, '')
                    if (t && !editableSkills.includes(t)) setEditableSkills((prev) => [...prev, t])
                    setSkillInput('')
                  }
                  if (e.key === 'Backspace' && !skillInput && editableSkills.length) {
                    setEditableSkills((prev) => prev.slice(0, -1))
                  }
                }}
                placeholder={editableSkills.length === 0 ? 'Type skill, press Enter' : 'Add more...'}
                className="flex-1 min-w-[140px] bg-transparent text-sm outline-none px-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">Press Enter or comma to add. Backspace to remove last.</p>
            <Button size="sm" onClick={saveSkills} className="bg-primary text-primary-foreground rounded-lg">Save Skills</Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(profile?.skills ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No skills added yet.</p>
            ) : (
              (profile?.skills ?? []).map((s: string) => (
                <span key={s} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">{s}</span>
              ))
            )}
          </div>
        )}
      </Card>

      <Card className="p-5 border-border rounded-2xl">
        <h3 className="font-semibold mb-3">Student ID Status</h3>
        <div className="flex items-center gap-2">
          {profile?.student_id_verified ? (
            <><Shield className="w-5 h-5 text-emerald-500" /><span className="text-sm text-emerald-600 font-medium">Verified ✓</span></>
          ) : (
            <><Shield className="w-5 h-5 text-amber-500" /><span className="text-sm text-amber-600 font-medium">Pending Review</span></>
          )}
        </div>
      </Card>

      <Card className="p-5 border-border rounded-2xl">
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
