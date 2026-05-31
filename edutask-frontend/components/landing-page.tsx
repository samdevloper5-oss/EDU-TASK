'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ShieldCheck, Star, Award, ArrowRight, CheckCircle2,
  Users, Zap, Globe, Clock, ChevronLeft, ChevronRight, Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { useScrollAnimation } from '@/hooks/use-scroll-animation'

function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const [ref, isVisible] = useScrollAnimation()
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

const features = [
  { icon: ShieldCheck, title: 'Verified Community', desc: 'Every user verified with university ID. No fake accounts.' },
  { icon: Star, title: 'Trust Score', desc: 'Build reputation with every completed task. Higher trust unlocks more.' },
  { icon: Clock, title: 'Flexible Deadlines', desc: 'Set custom deadlines from hours to weeks with clear urgency.' },
  { icon: Award, title: 'Skill Matching', desc: 'Tasks matched to your verified skillset. Work you actually enjoy.' },
  { icon: Zap, title: 'Escrow Payments', desc: 'Payments held securely until work is approved. Zero risk.' },
  { icon: Globe, title: 'Campus Focused', desc: 'Exclusively for university students in Bangladesh.' },
]

const steps = [
  { num: '01', title: 'Join & Verify', desc: 'Sign up with your university email and verify your student ID.', icon: Users },
  { num: '02', title: 'Post or Apply', desc: 'Browse the task feed or post your own with a budget and deadline.', icon: ArrowRight },
  { num: '03', title: 'Complete & Grow', desc: 'Finish tasks, get paid through escrow, and earn Trust Score.', icon: Award },
]

const testimonials = [
  { name: 'Nadia K.', university: 'IUB', rating: 5, text: 'EduTask helped me earn while studying. The escrow system gives me confidence I\'ll get paid.' },
  { name: 'Tanvir H.', university: 'NSU', rating: 5, text: 'Found reliable students for research data entry. Skill matching is incredibly accurate.' },
  { name: 'Anika S.', university: 'BRAC University', rating: 4, text: 'Earned money and built my portfolio at the same time. Great community.' },
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

  useEffect(() => {
    const timer = setInterval(() => {
      setTestimonialIdx(prev => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-indigo-400 flex items-center justify-center shadow-md shadow-primary/20">
              <span className="text-primary-foreground font-bold text-sm">E</span>
            </div>
            <span className="font-bold text-lg text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>EduTask</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/signin')}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => router.push('/signup')}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 size-[500px] bg-primary/3 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 size-[400px] bg-indigo-100/20 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-28">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-accent-foreground text-xs font-medium mb-6 border border-primary/10">
                <Zap className="size-3.5" />
                For University Students Only
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance" style={{ fontFamily: 'var(--font-heading)' }}>
                Turn Your Skills<br />Into{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">Income.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-lg">
                Post tasks, complete tasks, earn instantly. EduTask connects verified students with trusted campus micro-tasks.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button
                  size="lg"
                  onClick={() => router.push('/signup')}
                  className="gap-2 shadow-lg shadow-primary/25"
                >
                  Get Started <ArrowRight className="size-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push('/signup')}
                >
                  Post a Task
                </Button>
              </div>
              <div className="mt-12 flex items-center gap-8">
                {stats.map((s, i) => (
                  <div key={s.label}>
                    <div className="text-2xl font-bold text-foreground">{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden md:block">
              <Card className="p-6 shadow-card-hover border-border bg-card/80 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="size-11 rounded-full bg-gradient-to-br from-primary/20 to-indigo-200 flex items-center justify-center">
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
                    { label: 'Balance', value: '৳2,450', bg: 'bg-gradient-to-br from-primary/10 to-indigo-50', text: 'text-primary' },
                    { label: 'Trust Score', value: '4.8/5.0', bg: 'bg-gradient-to-br from-emerald-50 to-teal-50', text: 'text-emerald-600' },
                    { label: 'Completed', value: '23 Tasks', bg: 'bg-gradient-to-br from-sky-50 to-blue-50', text: 'text-sky-600' },
                    { label: 'Earnings', value: '৳4,550', bg: 'bg-gradient-to-br from-amber-50 to-orange-50', text: 'text-amber-600' },
                  ].map(c => (
                    <div key={c.label} className={`rounded-2xl p-4 ${c.bg}`}>
                      <p className={`text-xs ${c.text} opacity-70`}>{c.label}</p>
                      <p className={`text-sm font-bold mt-1 ${c.text}`}>{c.value}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[
                    { t: 'Build a Portfolio Website', badge: 'Web Dev', color: 'bg-sky-50 text-sky-600' },
                    { t: 'Data Entry for Research', badge: 'Data Entry', color: 'bg-amber-50 text-amber-600' },
                  ].map(item => (
                    <div key={item.t} className="flex items-center justify-between p-3.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                      <span className="text-xs font-medium text-foreground">{item.t}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.color} font-medium`}>{item.badge}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-card">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <AnimatedSection>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-accent-foreground text-xs font-medium mb-4">
                <Globe className="size-3.5" />
                About EduTask
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance" style={{ fontFamily: 'var(--font-heading)' }}>
                A Marketplace Built for Students
              </h2>
              <p className="mt-5 text-muted-foreground leading-relaxed text-base">
                <strong className="text-foreground">What is EduTask?</strong> A student-only micro-task platform where verified university students earn money, gain experience, and contribute to their campus community.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed text-base">
                <strong className="text-foreground">Why it exists?</strong> Students need flexible income that works around class schedules. EduTask bridges that gap with verified, trustworthy tasks.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed text-base">
                <strong className="text-foreground">Who is it for?</strong> Any verified university student in Bangladesh looking to earn, learn, or help their community.
              </p>
            </AnimatedSection>
            <AnimatedSection delay={200}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Users, label: 'Verified Community', count: '1,200+', bg: 'from-primary/10 to-indigo-50' },
                  { icon: ArrowRight, label: 'Active Tasks', count: '85+', bg: 'from-sky-50 to-blue-50' },
                  { icon: CheckCircle2, label: 'Success Rate', count: '98%', bg: 'from-emerald-50 to-teal-50' },
                  { icon: Award, label: 'Certificates', count: '200+', bg: 'from-amber-50 to-orange-50' },
                ].map((item) => (
                  <Card
                    key={item.label}
                    className={`p-6 text-center border-border bg-gradient-to-br ${item.bg} hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300`}
                  >
                    <item.icon className="size-8 mx-auto text-primary mb-3" />
                    <div className="text-2xl font-bold text-foreground">{item.count}</div>
                    <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
                  </Card>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-accent-foreground text-xs font-medium mb-4">
              <Zap className="size-3.5" />
              Simple Process
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>How It Works</h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">Three simple steps to start earning on campus.</p>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <AnimatedSection key={s.num} delay={i * 150}>
                <Card className="p-8 text-center border-border bg-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="size-16 rounded-2xl bg-gradient-to-br from-primary to-indigo-400 text-primary-foreground flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
                    <s.icon className="size-7" />
                  </div>
                  <div className="text-xs font-bold text-primary mb-2">STEP {s.num}</div>
                  <h3 className="font-bold text-foreground text-lg mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-24 bg-card">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-accent-foreground text-xs font-medium mb-4">
              <ShieldCheck className="size-3.5" />
              Platform Features
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Everything You Need</h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">Built for the unique needs of student communities.</p>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <AnimatedSection key={f.title} delay={i * 100}>
                <Card className="p-7 border-border bg-background hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300 cursor-default group">
                  <div className="size-12 rounded-2xl bg-gradient-to-br from-primary/10 to-indigo-50 flex items-center justify-center mb-5 group-hover:shadow-md transition-shadow">
                    <f.icon className="size-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-accent-foreground text-xs font-medium mb-4">
              <Star className="size-3.5" />
              Testimonials
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>What Students Say</h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">Real feedback from verified users.</p>
          </AnimatedSection>

          <div className="relative max-w-3xl mx-auto">
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${testimonialIdx * 100}%)` }}
              >
                {testimonials.map((t, i) => (
                  <div key={i} className="w-full flex-shrink-0 px-4">
                    <Card className="p-8 border-border bg-card text-center">
                      <div className="size-16 rounded-full bg-gradient-to-br from-primary/20 to-indigo-100 flex items-center justify-center mx-auto mb-4">
                        <span className="text-primary font-bold text-xl">{t.name[0]}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1 mb-4">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star
                            key={j}
                            className={`size-4 ${j < t.rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20'}`}
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
                className="size-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="flex items-center gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setTestimonialIdx(i)}
                    className={`size-2 rounded-full transition-all ${i === testimonialIdx ? 'bg-primary w-6' : 'bg-border'}`}
                  />
                ))}
              </div>
              <button
                onClick={() => setTestimonialIdx(prev => (prev + 1) % testimonials.length)}
                className="size-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <AnimatedSection key={s.label} delay={i * 100} className="text-center">
                <div className="text-4xl font-bold text-primary" style={{ fontFamily: 'var(--font-heading)' }}>{s.value}</div>
                <div className="text-sm text-muted-foreground mt-2">{s.label}</div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="py-24">
        <div className="max-w-xl mx-auto px-6">
          <AnimatedSection className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Get in Touch</h2>
            <p className="mt-3 text-muted-foreground">Have questions? We'd love to hear from you.</p>
          </AnimatedSection>
          <AnimatedSection delay={100}>
            <Card className="p-8 border-border bg-card shadow-card-hover">
              <form onSubmit={handleContactSubmit} className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
                  <Input placeholder="Your name" value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                  <Input type="email" placeholder="you@university.edu" value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Message</label>
                  <Textarea placeholder="Your message..." value={contactForm.message} onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))} required rows={4} />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={submitted}>
                  {submitted ? (
                    <span className="flex items-center gap-2"><CheckCircle2 className="size-4" /> Sent Successfully!</span>
                  ) : (
                    <><Send className="size-4" /> Send Message</>
                  )}
                </Button>
              </form>
            </Card>
          </AnimatedSection>
        </div>
      </section>

      <footer className="border-t border-border bg-card py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-indigo-400 flex items-center justify-center">
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
                <Link href="/leaderboard" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Leaderboard</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Company</h4>
              <div className="space-y-2.5">
                <a href="#about" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">About</a>
                <span className="block text-sm text-muted-foreground">Careers</span>
                <a href="#contact" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Legal</h4>
              <div className="space-y-2.5">
                <span className="block text-sm text-muted-foreground">Terms of Service</span>
                <span className="block text-sm text-muted-foreground">Privacy Policy</span>
                <span className="block text-sm text-muted-foreground">Cookie Policy</span>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">2026 EduTask. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}