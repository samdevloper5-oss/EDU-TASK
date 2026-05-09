"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ShieldCheck, Lock, Star, Award, Bell, MapPin, ArrowRight, CheckCircle2,
  Users, ListChecks, ThumbsUp, Zap, Globe, Clock, Wifi, WifiOff,
  Trophy, ChevronLeft, ChevronRight, Twitter, Github, Linkedin, Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { useScrollAnimation } from '@/hooks/use-scroll-animation'
import { leaderboardTrust } from '@/lib/mock-data'

function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const [ref, isVisible] = useScrollAnimation()
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

const features = [
  { icon: Wifi, title: 'Online & Offline Tasks', desc: 'Post digital or physical tasks. Work remotely or meet on campus.' },
  { icon: Clock, title: 'Flexible Deadlines', desc: 'Set custom deadlines from hours to weeks with urgency indicators.' },
  { icon: Lock, title: 'Secure Wallet', desc: 'Payments held in escrow until task completion. Withdraw anytime.' },
  { icon: Trophy, title: 'Leaderboard Rewards', desc: 'Climb the ranks and earn recognition for your contributions.' },
  { icon: Zap, title: 'Skill-Based Matching', desc: 'AI matches you with tasks that fit your verified skillset.' },
  { icon: Bell, title: 'Real-Time Notifications', desc: 'Never miss an opportunity with instant push alerts.' },
]

const steps = [
  { num: '01', title: 'Create Profile', desc: 'Sign up with university credentials and add your skills.', icon: Users },
  { num: '02', title: 'Post or Apply', desc: 'Browse the task feed or post your own micro-tasks.', icon: ListChecks },
  { num: '03', title: 'Complete & Get Paid', desc: 'Finish your task, get rated, and receive payment.', icon: Award },
]

const testimonials = [
  { name: 'Nadia K.', university: 'IUB', rating: 5, text: 'EduTask helped me earn while studying. The escrow system gives me confidence that I will get paid.' },
  { name: 'Tanvir H.', university: 'NSU', rating: 5, text: 'I found reliable students for my research data entry. The skill matching is incredibly accurate.' },
  { name: 'Anika S.', university: 'BRAC University', rating: 4, text: 'The volunteer system is amazing. I earned certificates and built my portfolio at the same time.' },
  { name: 'Arif M.', university: 'NSU', rating: 5, text: 'Clean interface, fast payments, trustworthy community. Exactly what students need.' },
]

const stats = [
  { value: '1,200+', label: 'Verified Students' },
  { value: '350+', label: 'Tasks Completed' },
  { value: '98%', label: 'Satisfaction Rate' },
  { value: '45+', label: 'Universities' },
]

export function LandingPage() {
  const router = useRouter()
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [testimonialIdx, setTestimonialIdx] = useState(0)

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    toast.success('Message sent successfully!')
    setTimeout(() => setSubmitted(false), 3000)
    setContactForm({ name: '', email: '', message: '' })
  }

  // Auto-rotate testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setTestimonialIdx(prev => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-indigo-400 flex items-center justify-center shadow-md shadow-primary/20">
              <span className="text-primary-foreground font-bold text-sm">E</span>
            </div>
            <span className="font-bold text-lg text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>EduTask</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</a>
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#leaderboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Rankings</a>
            <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/signin')} className="text-foreground hover:bg-muted">
              Sign In
            </Button>
            <Button size="sm" onClick={() => router.push('/signup')} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* 1. Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
          <div className="absolute top-40 left-1/3 w-64 h-64 bg-sky-100/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        </div>
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="animate-fade-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-accent-foreground text-xs font-medium mb-6 border border-primary/10">
                <Zap className="w-3.5 h-3.5" />
                For University Students Only
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance" style={{ fontFamily: 'var(--font-heading)' }}>
                Turn Your Skills <br />Into <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">Income.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-lg">
                Post tasks. Complete tasks. Earn instantly. EduTask connects verified students with trusted campus micro-tasks.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button
                  size="lg"
                  onClick={() => router.push('/signup')}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all duration-300"
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push('/signup')}
                  className="border-border text-foreground hover:bg-muted hover:-translate-y-0.5 transition-all duration-300"
                >
                  Post a Task
                </Button>
              </div>
              <div className="mt-12 flex items-center gap-8">
                {stats.map((s, i) => (
                  <div key={s.label} className={`animate-fade-up stagger-${i + 2}`}>
                    <div className="text-2xl font-bold text-foreground">{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard Preview Card */}
            <div className="hidden md:block animate-fade-up stagger-3">
              <Card className="p-6 shadow-2xl shadow-primary/10 border-border bg-card/80 backdrop-blur-sm hover:-translate-y-1 transition-all duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-indigo-200 flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">R</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Rafiq Ahmed</p>
                    <p className="text-xs text-muted-foreground">BRAC University</p>
                  </div>
                  <div className="ml-auto px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">Active</div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { label: 'Balance', value: '2,450 BDT', bg: 'bg-gradient-to-br from-primary/10 to-indigo-50', text: 'text-primary' },
                    { label: 'Trust Score', value: '4.8/5.0', bg: 'bg-gradient-to-br from-emerald-50 to-teal-50', text: 'text-emerald-600' },
                    { label: 'Completed', value: '23 Tasks', bg: 'bg-gradient-to-br from-sky-50 to-blue-50', text: 'text-sky-600' },
                    { label: 'Volunteer', value: '45 Hours', bg: 'bg-gradient-to-br from-amber-50 to-orange-50', text: 'text-amber-600' },
                  ].map(c => (
                    <div key={c.label} className={`rounded-2xl p-4 ${c.bg}`}>
                      <p className={`text-xs ${c.text} opacity-70`}>{c.label}</p>
                      <p className={`text-sm font-bold mt-1 ${c.text}`}>{c.value}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[
                    { t: 'Build a Portfolio Website', type: 'Online', color: 'bg-sky-50 text-sky-600' },
                    { t: 'Data Entry for Research', type: 'Offline', color: 'bg-amber-50 text-amber-600' },
                  ].map(item => (
                    <div key={item.t} className="flex items-center justify-between p-3.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                      <span className="text-xs font-medium text-foreground">{item.t}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.color} font-medium`}>{item.type}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* 2. About EduTask */}
      <section id="about" className="py-24 bg-card">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <AnimatedSection>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-accent-foreground text-xs font-medium mb-4">
                <Globe className="w-3.5 h-3.5" />
                About EduTask
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance" style={{ fontFamily: 'var(--font-heading)' }}>
                A Marketplace Built Exclusively for Students
              </h2>
              <p className="mt-5 text-muted-foreground leading-relaxed text-base">
                <strong className="text-foreground">What is EduTask?</strong> A student-only micro-task platform that helps university students earn money, gain experience, and contribute to their campus community through verified tasks.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed text-base">
                <strong className="text-foreground">Why it exists?</strong> Students need flexible income opportunities that work around their class schedules. EduTask bridges that gap with verified, trustworthy tasks.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed text-base">
                <strong className="text-foreground">Who is it for?</strong> Any verified university student in Bangladesh looking to earn, learn, or help their community.
              </p>
            </AnimatedSection>
            <AnimatedSection delay={200}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Users, label: 'Verified Community', count: '1,200+', bg: 'from-primary/10 to-indigo-50' },
                  { icon: ListChecks, label: 'Active Tasks', count: '85+', bg: 'from-sky-50 to-blue-50' },
                  { icon: ThumbsUp, label: 'Success Rate', count: '98%', bg: 'from-emerald-50 to-teal-50' },
                  { icon: Award, label: 'Certificates Given', count: '200+', bg: 'from-amber-50 to-orange-50' },
                ].map((item, i) => (
                  <Card
                    key={item.label}
                    className={`p-6 text-center border-border bg-gradient-to-br ${item.bg} hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
                  >
                    <item.icon className="w-8 h-8 mx-auto text-primary mb-3" />
                    <div className="text-2xl font-bold text-foreground">{item.count}</div>
                    <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
                  </Card>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* 3. How It Works */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-accent-foreground text-xs font-medium mb-4">
              <Zap className="w-3.5 h-3.5" />
              Simple Process
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>How It Works</h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">Three simple steps to start earning on campus.</p>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <AnimatedSection key={s.num} delay={i * 150}>
                <Card className="p-8 text-center border-border bg-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-indigo-400 text-primary-foreground flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
                    <s.icon className="w-7 h-7" />
                  </div>
                  <div className="text-xs font-bold text-primary mb-2">STEP {s.num}</div>
                  <h3 className="font-bold text-foreground text-lg mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  {i < 2 && (
                    <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                      <ArrowRight className="w-5 h-5 text-primary/30" />
                    </div>
                  )}
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Features */}
      <section id="features" className="py-24 bg-card">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-accent-foreground text-xs font-medium mb-4">
              <ShieldCheck className="w-3.5 h-3.5" />
              Platform Features
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Everything You Need</h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">Built for the unique needs of student communities.</p>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <AnimatedSection key={f.title} delay={i * 100}>
                <Card className="p-7 border-border bg-background hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default group">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-indigo-50 flex items-center justify-center mb-5 group-hover:shadow-md transition-shadow">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Leaderboard Preview */}
      <section id="leaderboard" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-accent-foreground text-xs font-medium mb-4">
              <Trophy className="w-3.5 h-3.5" />
              Top Students
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Leaderboard</h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">See who is leading the campus task community.</p>
          </AnimatedSection>

          {/* Podium Top 3 */}
          <div className="flex items-end justify-center gap-6 mb-12 max-w-2xl mx-auto">
            {/* Rank 2 */}
            <AnimatedSection delay={200} className="flex-1">
              <Card className="p-6 text-center border-border bg-card hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center mx-auto mb-3 ring-3 ring-slate-300 shadow-sm">
                  <span className="font-bold text-slate-600">{leaderboardTrust[1].name[0]}</span>
                </div>
                <div className="text-xs font-bold text-slate-500 mb-1">2nd</div>
                <p className="text-sm font-semibold text-foreground">{leaderboardTrust[1].name}</p>
                <p className="text-xs text-muted-foreground">{leaderboardTrust[1].university}</p>
                <div className="mt-2 text-xl font-bold text-primary">{leaderboardTrust[1].score}</div>
              </Card>
            </AnimatedSection>
            {/* Rank 1 */}
            <AnimatedSection delay={100} className="flex-1">
              <Card className="p-8 text-center border-primary/20 bg-gradient-to-br from-card to-secondary hover:shadow-xl transition-all duration-300 relative animate-pulse-glow">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-white text-xs font-bold shadow-md">
                  1st
                </div>
                <div className="w-18 h-18 w-[72px] h-[72px] rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center mx-auto mb-3 ring-4 ring-amber-300 shadow-lg mt-2">
                  <span className="font-bold text-white text-lg">{leaderboardTrust[0].name[0]}</span>
                </div>
                <p className="text-base font-bold text-foreground">{leaderboardTrust[0].name}</p>
                <p className="text-xs text-muted-foreground">{leaderboardTrust[0].university}</p>
                <div className="mt-2 text-2xl font-bold text-primary">{leaderboardTrust[0].score}</div>
              </Card>
            </AnimatedSection>
            {/* Rank 3 */}
            <AnimatedSection delay={300} className="flex-1">
              <Card className="p-6 text-center border-border bg-card hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-200 to-amber-400 flex items-center justify-center mx-auto mb-3 ring-3 ring-amber-300/60 shadow-sm">
                  <span className="font-bold text-amber-800">{leaderboardTrust[2].name[0]}</span>
                </div>
                <div className="text-xs font-bold text-amber-700 mb-1">3rd</div>
                <p className="text-sm font-semibold text-foreground">{leaderboardTrust[2].name}</p>
                <p className="text-xs text-muted-foreground">{leaderboardTrust[2].university}</p>
                <div className="mt-2 text-xl font-bold text-primary">{leaderboardTrust[2].score}</div>
              </Card>
            </AnimatedSection>
          </div>

          <AnimatedSection className="text-center">
            <Button
              onClick={() => router.push('/signup')}
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300"
            >
              View Full Rankings <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </AnimatedSection>
        </div>
      </section>

      {/* 6. Testimonials */}
      <section className="py-24 bg-card">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-accent-foreground text-xs font-medium mb-4">
              <Star className="w-3.5 h-3.5" />
              Testimonials
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>What Students Say</h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">Real feedback from verified users.</p>
          </AnimatedSection>

          {/* Card Slider */}
          <div className="relative max-w-3xl mx-auto">
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${testimonialIdx * 100}%)` }}
              >
                {testimonials.map((t, i) => (
                  <div key={i} className="w-full flex-shrink-0 px-4">
                    <Card className="p-8 border-border bg-background text-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-indigo-100 flex items-center justify-center mx-auto mb-4">
                        <span className="text-primary font-bold text-xl">{t.name[0]}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1 mb-4">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star
                            key={j}
                            className={`w-4 h-4 ${j < t.rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20'}`}
                          />
                        ))}
                      </div>
                      <p className="text-muted-foreground leading-relaxed mb-4 text-base italic">{`"${t.text}"`}</p>
                      <p className="font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.university}</p>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setTestimonialIdx(prev => (prev - 1 + testimonials.length) % testimonials.length)}
                className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setTestimonialIdx(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === testimonialIdx ? 'bg-primary w-6' : 'bg-border'}`}
                  />
                ))}
              </div>
              <button
                onClick={() => setTestimonialIdx(prev => (prev + 1) % testimonials.length)}
                className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Contact */}
      <section id="contact" className="py-24">
        <div className="max-w-xl mx-auto px-6">
          <AnimatedSection className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Get in Touch</h2>
            <p className="mt-3 text-muted-foreground">Have questions? We would love to hear from you.</p>
          </AnimatedSection>
          <AnimatedSection delay={100}>
            <Card className="p-8 border-border bg-card shadow-xl shadow-primary/5">
              <form onSubmit={handleContactSubmit} className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
                  <Input
                    placeholder="Your name"
                    value={contactForm.name}
                    onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))}
                    required
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                  <Input
                    type="email"
                    placeholder="you@university.edu"
                    value={contactForm.email}
                    onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))}
                    required
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Message</label>
                  <Textarea
                    placeholder="Your message..."
                    value={contactForm.message}
                    onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                    required
                    rows={4}
                    className="bg-background border-border"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 gap-2"
                  disabled={submitted}
                >
                  {submitted ? (
                    <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Sent Successfully!</span>
                  ) : (
                    <><Send className="w-4 h-4" /> Send Message</>
                  )}
                </Button>
              </form>
            </Card>
          </AnimatedSection>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-indigo-400 flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">E</span>
                </div>
                <span className="font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>EduTask</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">Earn. Learn. Grow. The student micro-task marketplace built for campus communities.</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Platform</h4>
              <div className="space-y-2.5">
                <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
                <a href="#how-it-works" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
                <a href="#leaderboard" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Leaderboard</a>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Company</h4>
              <div className="space-y-2.5">
                <a href="#about" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">About</a>
                <button className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Careers</button>
                <a href="#contact" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Legal</h4>
              <div className="space-y-2.5">
                <button className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</button>
                <button className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</button>
                <button className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Cookie Policy</button>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">2026 EduTask. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <button className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all" aria-label="Twitter">
                <Twitter className="w-4 h-4" />
              </button>
              <button className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all" aria-label="GitHub">
                <Github className="w-4 h-4" />
              </button>
              <button className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all" aria-label="LinkedIn">
                <Linkedin className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
