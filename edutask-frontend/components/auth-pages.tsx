"use client"

import { useState, useRef, type KeyboardEvent } from 'react'
import { useApp } from '@/lib/app-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, ArrowLeft, Upload, X, Loader2 } from 'lucide-react'
import { availableSkills } from '@/lib/mock-data'
import { toast } from 'sonner'

export function SignInPage() {
  const { setPage, signIn } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn(email, password)
      toast.success('Welcome back!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-md relative">
        <button
          onClick={() => setPage('landing')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </button>

        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-400 flex items-center justify-center shadow-md shadow-primary/20">
            <span className="text-primary-foreground font-bold">E</span>
          </div>
          <span className="font-bold text-xl text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>EduTask</span>
        </div>

        <Card className="p-8 border-border bg-card/80 backdrop-blur-sm shadow-2xl shadow-primary/5">
          <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Welcome back</h2>
          <p className="text-muted-foreground text-sm mb-8">Sign in to your EduTask account</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label className="text-foreground">Email</Label>
              <Input
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="mt-1.5 bg-background border-border"
              />
            </div>
            <div>
              <Label className="text-foreground">Password</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="bg-background border-border pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
              disabled={loading || !email || !password}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {"Don't have an account? "}
            <button onClick={() => setPage('signup')} className="text-primary hover:underline font-medium">
              Sign Up
            </button>
          </p>
        </Card>
      </div>
    </div>
  )
}

function SkillTagInput({
  skills,
  onAdd,
  onRemove,
}: {
  skills: string[]
  onAdd: (skill: string) => void
  onRemove: (skill: string) => void
}) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = input.trim()
    ? availableSkills.filter(
      s => s.toLowerCase().includes(input.toLowerCase()) && !skills.includes(s)
    ).slice(0, 5)
    : []

  const addSkill = (skill: string) => {
    const trimmed = skill.trim()
    if (trimmed && !skills.includes(trimmed)) {
      onAdd(trimmed)
    }
    setInput('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestions.length > 0) {
        addSkill(suggestions[0])
      } else if (input.trim()) {
        addSkill(input)
      }
    }
    if (e.key === 'Backspace' && !input && skills.length > 0) {
      onRemove(skills[skills.length - 1])
    }
  }

  return (
    <div className="relative">
      <div
        className="min-h-[48px] flex flex-wrap items-center gap-2 p-2.5 rounded-xl border border-border bg-background cursor-text focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all"
        onClick={() => inputRef.current?.focus()}
      >
        {skills.map(skill => (
          <span
            key={skill}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-primary/10 to-indigo-50 text-primary text-xs font-medium animate-fade-up"
            style={{ animationDuration: '0.3s' }}
          >
            {skill}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(skill) }}
              className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setShowSuggestions(true) }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={skills.length === 0 ? 'Type your skills and press Enter (e.g., Math Tutoring, Python)' : 'Add more...'}
          className="flex-1 min-w-[180px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-10">
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addSkill(s) }}
              className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function SignUpPage() {
  const { setPage, signUp } = useApp()
  const [form, setForm] = useState({
    name: '', university: '', department: '', studentId: '',
    location: '', phone: '', email: '', password: '', referralCode: '',
  })
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [profilePic, setProfilePic] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be 2MB or less.')
      return
    }

    setAvatarFile(file)
    setProfilePic(URL.createObjectURL(file))
  }

  const isValid = form.name && form.university && form.department && form.studentId && form.location && form.phone && form.email && form.password && selectedSkills.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    try {
      const signupData = {
        full_name: form.name,
        university_name: form.university,
        department: form.department,
        student_id: form.studentId,
        location: form.location,
        phone: form.phone,
        skills: selectedSkills,
        email: form.email,
        password: form.password,
        referralCode: form.referralCode || undefined,
      }

      const formData = new FormData()
      Object.entries(signupData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value))
        } else if (value) {
          formData.append(key, String(value))
        }
      })
      if (avatarFile) {
        formData.append('profile_picture', avatarFile)
      }

      await signUp(formData as any) //signUp in app-context handles the mapping
      toast.success('Account created successfully!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Account creation failed'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const fieldError = (field: string) => touched[field] && !(form[field as keyof typeof form] || '').trim()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-lg relative">
        <button
          onClick={() => setPage('landing')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </button>

        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-400 flex items-center justify-center shadow-md shadow-primary/20">
            <span className="text-primary-foreground font-bold">E</span>
          </div>
          <span className="font-bold text-xl text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>EduTask</span>
        </div>

        <Card className="p-8 border-border bg-card/80 backdrop-blur-sm shadow-2xl shadow-primary/5">
          <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Create your account</h2>
          <p className="text-muted-foreground text-sm mb-8">Join the student micro-task community</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-indigo-50 flex items-center justify-center overflow-hidden border-2 border-border shadow-sm">
                {profilePic ? (
                  <img src={profilePic} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-border text-foreground"
                >
                  {profilePic ? 'Change Photo' : 'Upload Photo'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Max 2MB</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground">Full Name</Label>
                <Input placeholder="Rafiq Ahmed" value={form.name} onChange={e => updateField('name', e.target.value)} className={`mt-1.5 bg-background ${fieldError('name') ? 'border-destructive' : 'border-border'}`} />
              </div>
              <div>
                <Label className="text-foreground">University</Label>
                <Input placeholder="BRAC University" value={form.university} onChange={e => updateField('university', e.target.value)} className={`mt-1.5 bg-background ${fieldError('university') ? 'border-destructive' : 'border-border'}`} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground">Department</Label>
                <Input placeholder="Computer Science" value={form.department} onChange={e => updateField('department', e.target.value)} className={`mt-1.5 bg-background ${fieldError('department') ? 'border-destructive' : 'border-border'}`} />
              </div>
              <div>
                <Label className="text-foreground">Student ID</Label>
                <Input placeholder="20301045" value={form.studentId} onChange={e => updateField('studentId', e.target.value)} className={`mt-1.5 bg-background ${fieldError('studentId') ? 'border-destructive' : 'border-border'}`} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground">Location</Label>
                <Input placeholder="Dhaka, Bangladesh" value={form.location} onChange={e => updateField('location', e.target.value)} className={`mt-1.5 bg-background ${fieldError('location') ? 'border-destructive' : 'border-border'}`} />
              </div>
              <div>
                <Label className="text-foreground">Phone Number</Label>
                <Input placeholder="+8801712345678" value={form.phone} onChange={e => updateField('phone', e.target.value)} className={`mt-1.5 bg-background ${fieldError('phone') ? 'border-destructive' : 'border-border'}`} />
              </div>
            </div>

            <div>
              <Label className="text-foreground">Skills</Label>
              <div className="mt-1.5">
                <SkillTagInput
                  skills={selectedSkills}
                  onAdd={skill => setSelectedSkills(prev => [...prev, skill])}
                  onRemove={skill => setSelectedSkills(prev => prev.filter(s => s !== skill))}
                />
              </div>
              {selectedSkills.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">Type a skill and press Enter to add it</p>
              )}
            </div>

            <div>
              <Label className="text-foreground">Referral Code (optional)</Label>
              <Input placeholder="Enter referral code" value={form.referralCode} onChange={e => updateField('referralCode', e.target.value)} className="mt-1.5 bg-background border-border" />
            </div>

            <div>
              <Label className="text-foreground">Email</Label>
              <Input type="email" placeholder="you@university.edu" value={form.email} onChange={e => updateField('email', e.target.value)} className={`mt-1.5 bg-background ${fieldError('email') ? 'border-destructive' : 'border-border'}`} />
            </div>

            <div>
              <Label className="text-foreground">Password</Label>
              <div className="relative mt-1.5">
                <Input type={showPassword ? 'text' : 'password'} placeholder="Create a password" value={form.password} onChange={e => updateField('password', e.target.value)} className={`bg-background pr-10 ${fieldError('password') ? 'border-destructive' : 'border-border'}`} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20" disabled={loading || !isValid}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <button onClick={() => setPage('signin')} className="text-primary hover:underline font-medium">
              Sign In
            </button>
          </p>
        </Card>
      </div>
    </div>
  )
}
