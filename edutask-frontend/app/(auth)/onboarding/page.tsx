'use client'

import { useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, ArrowRight, Upload, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const availableSkills = [
  'Web Dev', 'Data Entry', 'Graphic Design', 'Research', 'Writing',
  'Teaching', 'Photography', 'Video Editing', 'Translation', 'Excel',
  'Python', 'JavaScript', 'React', 'Marketing', 'Social Media',
  'Testing', 'Documentation', 'Canva', 'Photoshop', 'PowerPoint',
  'Mathematics', 'Communication', 'Leadership', 'Organization', 'Teamwork',
]

function SkillTagInput({ skills, onAdd, onRemove }: { skills: string[]; onAdd: (s: string) => void; onRemove: (s: string) => void }) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestions = input.trim()
    ? availableSkills.filter((s) => s.toLowerCase().includes(input.toLowerCase()) && !skills.includes(s)).slice(0, 5)
    : []

  const add = (skill: string) => {
    const t = skill.trim()
    if (t && !skills.includes(t)) onAdd(t)
    setInput('')
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <div className="min-h-[48px] flex flex-wrap items-center gap-2 p-2.5 rounded-xl border border-border bg-background cursor-text focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all" onClick={() => inputRef.current?.focus()}>
        {skills.map((skill) => (
          <span key={skill} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            {skill}
            <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(skill) }} className="hover:bg-primary/20 rounded-full p-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(suggestions[0] || input) } if (e.key === 'Backspace' && !input && skills.length) onRemove(skills[skills.length - 1]) }} className="flex-1 min-w-[180px] bg-transparent text-sm outline-none" placeholder={skills.length === 0 ? 'Type skill and press Enter' : 'Add more...'} />
      </div>
      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-10">
          {suggestions.map((s) => (
            <button key={s} type="button" onMouseDown={(e) => { e.preventDefault(); add(s) }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted">{s}</button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [university, setUniversity] = useState('')
  const [department, setDepartment] = useState('')
  const [studentId, setStudentId] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [referralCode, setReferralCode] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [profilePic, setProfilePic] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return }
    setAvatarFile(file)
    setProfilePic(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) { toast.error('Please agree to the Terms of Service'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, university, department, student_id_text: studentId, location, skills, referral_code: referralCode || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save profile')

      if (avatarFile) {
        const { data: authData } = await supabase.auth.getUser()
        if (authData.user) {
          const fileExt = avatarFile.name.split('.').pop()
          const filePath = `${authData.user.id}/${Date.now()}.${fileExt}`
          const { error: upError } = await supabase.storage.from('avatars').upload(filePath, avatarFile, { upsert: true })
          if (!upError) {
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
            await supabase.from('users').update({ profile_photo_url: urlData.publicUrl }).eq('id', authData.user.id)
          }
        }
      }

      toast.success('Profile completed!')
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-400 flex items-center justify-center shadow-md shadow-primary/20">
          <span className="text-primary-foreground font-bold">E</span>
        </div>
        <span className="font-bold text-xl text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>EduTask</span>
      </div>

      <Card className="p-8 border-border bg-card/80 backdrop-blur-sm shadow-2xl shadow-primary/5">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Complete your profile</h2>
          <span className="text-sm text-muted-foreground">Step {step} of 2</span>
        </div>

        {step === 1 ? (
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setStep(2) }}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {profilePic ? <img src={profilePic} alt="Preview" className="w-full h-full object-cover" /> : <Upload className="w-6 h-6 text-muted-foreground" />}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <span className="text-xs text-muted-foreground cursor-pointer" onClick={() => fileInputRef.current?.click()}>{profilePic ? 'Change photo' : 'Add profile photo (optional)'}</span>
            </div>
            <div>
              <Label>Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1.5" placeholder="Your name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>University</Label>
                <Input value={university} onChange={(e) => setUniversity(e.target.value)} required className="mt-1.5" placeholder="e.g., NSU" />
              </div>
              <div>
                <Label>Department</Label>
                <Input value={department} onChange={(e) => setDepartment(e.target.value)} required className="mt-1.5" placeholder="e.g., CSE" />
              </div>
            </div>
            <div>
              <Label>Student ID</Label>
              <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} required className="mt-1.5" placeholder="Your student ID number" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} required className="mt-1.5" placeholder="01XXXXXXXXX" />
              <p className="text-xs text-muted-foreground mt-1">Bangladesh format: 01XXXXXXXXX</p>
            </div>
            <div>
              <Label>Location / City</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1.5" placeholder="e.g., Dhaka" />
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={!name || !university || !department || !studentId || !phone}>
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div>
              <Label>Student ID Card Photo</Label>
              <div className="mt-1.5 border border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload JPG/PNG (max 5MB)</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Pending review after upload</p>
            </div>
            <div>
              <Label>Skills</Label>
              <div className="mt-1.5">
                <SkillTagInput skills={skills} onAdd={(s) => setSkills((prev) => [...prev, s])} onRemove={(s) => setSkills((prev) => prev.filter((x) => x !== s))} />
              </div>
            </div>
            <div>
              <Label>Referral Code (optional)</Label>
              <Input value={referralCode} onChange={(e) => setReferralCode(e.target.value)} className="mt-1.5" placeholder="Enter referral code" />
            </div>
            <label className="flex items-start gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
              <span>I agree to the Terms of Service and Privacy Policy</span>
            </label>
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading || skills.length === 0 || !agreed}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Complete Profile'}
            </Button>
          </form>
        )}
      </Card>
    </>
  )
}

