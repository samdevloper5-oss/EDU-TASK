"use client"

import { useState, useRef, useCallback } from 'react'
import { useApp } from '@/lib/app-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Star, Clock, Award, MapPin, Mail, Phone, Edit3, X, Loader2,
  CheckCircle2, GraduationCap,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, getStoredAccessToken } from '@/lib/api'

export function ProfilePage() {
  const { user, setUser } = useApp()
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: user.name,
    about: user.about,
    phone: user.phone,
    location: user.location,
  })
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleAvatarChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file.')
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be 2MB or less.')
        return
      }

      const url = URL.createObjectURL(file)
      setAvatarPreview(url)

      const token = getStoredAccessToken()
      if (!token) {
        toast.error('Please sign in to update your profile picture.')
        return
      }

      try {
        setUploadingAvatar(true)
        const profile = await api.profile.uploadAvatar(file, token)
        setUser(prev => ({
          ...prev,
          avatar: profile.profile_picture_url ?? prev.avatar,
        }))
        toast.success('Profile picture updated!')
      } catch (error) {
        toast.error('Failed to upload profile picture. Please try again.')
      } finally {
        setUploadingAvatar(false)
      }
    },
    [setUser],
  )

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      setUser(prev => ({
        ...prev,
        name: editForm.name,
        about: editForm.about,
        phone: editForm.phone,
        location: editForm.location,
      }))
      setSaving(false)
      setEditing(false)
      toast.success('Profile updated!')
    }, 1000)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-primary/10 via-secondary to-primary/5" />
        <div className="px-8 pb-8 -mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-4 sm:items-end sm:gap-5">
              <div className="relative">
                <Avatar className="w-24 h-24 rounded-2xl border-4 border-card shadow-sm">
                  <AvatarImage src={avatarPreview ?? user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-2xl bg-primary/10 text-primary font-bold text-3xl flex items-center justify-center">
                    {user.name[0]}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 rounded-full bg-primary text-primary-foreground text-[10px] px-2 py-1 shadow-md hover:bg-primary/90 transition-colors"
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? 'Uploading…' : 'Change'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div className="pb-1">
                <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <GraduationCap className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{user.university} &middot; {user.department}</span>
                </div>
              </div>
            </div>
            <Button
              onClick={() => setEditing(!editing)}
              variant="outline"
              size="sm"
              className="border-border text-foreground gap-1.5"
            >
              {editing ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              {editing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-sm font-semibold text-foreground">{user.trustScore}</span>
              <span className="text-xs text-muted-foreground">Trust Score</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-foreground">{user.volunteerHours}h</span>
              <span className="text-xs text-muted-foreground">Volunteer</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold text-foreground">{user.completedTasks}</span>
              <span className="text-xs text-muted-foreground">Completed</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Edit Mode */}
      {editing && (
        <Card className="p-8 border-border bg-card">
          <h3 className="font-semibold text-foreground mb-6">Edit Profile</h3>
          <div className="space-y-5">
            <div>
              <Label className="text-foreground">Full Name</Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1.5 bg-background border-border"
              />
            </div>
            <div>
              <Label className="text-foreground">About</Label>
              <Textarea
                value={editForm.about}
                onChange={e => setEditForm(prev => ({ ...prev, about: e.target.value }))}
                rows={3}
                className="mt-1.5 bg-background border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground">Phone</Label>
                <Input
                  value={editForm.phone}
                  onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="mt-1.5 bg-background border-border"
                />
              </div>
              <div>
                <Label className="text-foreground">Location</Label>
                <Input
                  value={editForm.location}
                  onChange={e => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                  className="mt-1.5 bg-background border-border"
                />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Save Changes</>}
            </Button>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* About & Contact */}
        <Card className="p-6 border-border bg-card">
          <h3 className="font-semibold text-foreground mb-4">About</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">{user.about}</p>

          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Contact</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">{user.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">{user.phone}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">{user.location}</span>
            </div>
          </div>

          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-6 mb-3">Skills</h4>
          <div className="flex flex-wrap gap-2">
            {user.skills.map(s => (
              <span key={s} className="px-3 py-1 rounded-lg bg-secondary text-accent-foreground text-xs font-medium">{s}</span>
            ))}
          </div>
        </Card>

        {/* Reviews */}
        <Card className="p-6 border-border bg-card">
          <h3 className="font-semibold text-foreground mb-4">Reviews</h3>
          <div className="space-y-4">
            {user.reviews.map((review, i) => (
              <div key={i} className="p-4 rounded-xl bg-muted/30 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {review.from[0]}
                    </div>
                    <span className="text-sm font-medium text-foreground">{review.from}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star
                        key={j}
                        className={`w-3.5 h-3.5 ${j < review.rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{review.text}</p>
              </div>
            ))}
          </div>

          <h3 className="font-semibold text-foreground mt-6 mb-4">Task History</h3>
          <div className="space-y-2">
            {[
              { title: 'Mobile App Testing', status: 'Completed', amount: '250 BDT' },
              { title: 'Data Entry Project', status: 'Completed', amount: '300 BDT' },
              { title: 'Portfolio Website', status: 'Completed', amount: '500 BDT' },
            ].map((task, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <div>
                  <p className="text-sm font-medium text-foreground">{task.title}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">{task.status}</p>
                </div>
                <span className="text-sm font-semibold text-foreground">{task.amount}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
