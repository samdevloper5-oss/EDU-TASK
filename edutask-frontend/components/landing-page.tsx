import Link from 'next/link'
import { ArrowRight, Check, Clock, Shield, Star } from 'lucide-react'

const previewTasks = [
  { category: 'Design', title: 'Make slides for CSE thesis presentation', budget: 800, university: 'BRAC University', trust: 84 },
  { category: 'Coding', title: 'Debug my Django REST API endpoints', budget: 1200, university: 'NSU', trust: 91 },
  { category: 'Writing', title: 'Proofread a 5-page research paper', budget: 400, university: 'University of Dhaka', trust: 72 },
]

const taskExamples = [
  'Research literature review for BRAC University students',
  'Build a landing page for a campus club',
  'Translate an admission notice into Bangla',
]

export function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="size-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">E</span>
            </div>
            <span className="text-sm font-bold tracking-tight md:text-base" style={{ fontFamily: 'var(--font-heading)' }}>
              EduTask
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#tasks" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Task examples
            </a>
            <a href="#why" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Why EduTask
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/signin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#222222] transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-[1.05fr_0.95fr] md:items-center md:px-10 md:py-24">
        <div>
          <div className="inline-flex items-center gap-2 text-label mb-6">
            <span className="h-px w-4 bg-primary" />
            Bangladesh · Students only
          </div>

          <h1 className="text-display max-w-2xl text-5xl leading-[1.02] md:text-7xl">
            Earn money.
            <br />
            Build skills.
            <br />
            Stay on campus.
          </h1>

          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            EduTask connects Bangladeshi students with paid micro-tasks: design, coding, writing, research, and campus help. Escrow is built in. Verification is real.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary-dark transition-colors"
            >
              Start earning <ArrowRight className="size-4" />
            </Link>
            <Link href="/tasks" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Browse tasks →
            </Link>
          </div>

          <div className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-border pt-8">
            <div>
              <p className="text-2xl font-bold tracking-tight">200৳+</p>
              <p className="text-xs text-subtle-text">Minimum task budget</p>
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">8%</p>
              <p className="text-xs text-subtle-text">Platform fee</p>
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">bKash</p>
              <p className="text-xs text-subtle-text">Withdrawals</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {previewTasks.map((task, index) => (
            <article
              key={task.title}
              className="card p-5"
              style={{ marginLeft: index === 1 ? '2rem' : index === 2 ? '1rem' : '0' }}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="text-label rounded-md bg-[#F3F1EC] px-2.5 py-1 text-primary">
                  {task.category}
                </span>
                <p className="text-lg font-bold tracking-tight">৳{task.budget}</p>
              </div>
              <h2 className="mt-3 text-sm font-semibold leading-snug text-foreground">{task.title}</h2>
              <p className="mt-2 text-xs text-subtle-text">
                {task.university} · trust score {task.trust}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="why" className="border-y border-border bg-background">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 md:grid-cols-[0.9fr_1.1fr] md:px-10">
          <div>
            <div className="text-label mb-4">Why EduTask</div>
            <h2 className="text-heading text-3xl md:text-4xl">A marketplace that feels built for students, not investors.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-5">
              <Shield className="size-4 text-primary" />
              <p className="mt-3 text-sm font-semibold">Escrow first</p>
              <p className="mt-1 text-sm text-muted-foreground">Money stays locked until the poster accepts the work.</p>
            </div>
            <div className="card p-5">
              <Check className="size-4 text-primary" />
              <p className="mt-3 text-sm font-semibold">Verified students</p>
              <p className="mt-1 text-sm text-muted-foreground">Profiles, student ID review, and admin moderation stay in the loop.</p>
            </div>
            <div className="card p-5">
              <Clock className="size-4 text-primary" />
              <p className="mt-3 text-sm font-semibold">Fast turnaround</p>
              <p className="mt-1 text-sm text-muted-foreground">Small tasks. Clear deadlines. No enterprise baggage.</p>
            </div>
            <div className="card p-5">
              <Star className="size-4 text-primary" />
              <p className="mt-3 text-sm font-semibold">Trust scores</p>
              <p className="mt-1 text-sm text-muted-foreground">Reputation grows from completed work and reviews.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <div className="mb-8 max-w-xl">
          <div className="text-label mb-4">How it works</div>
          <h2 className="text-heading text-3xl md:text-4xl">Three steps, no fluff.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['Create profile', 'Sign up with your university email and complete verification.'],
            ['Post or apply', 'Publish tasks or pick up work that matches your time and skills.'],
            ['Deliver and get paid', 'Submit the work, get accepted, and withdraw when ready.'],
          ].map(([title, desc], index) => (
            <div key={title} className="card p-5">
              <p className="text-label mb-2">0{index + 1}</p>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="tasks" className="border-y border-border bg-background">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10">
          <div className="mb-8 max-w-xl">
            <div className="text-label mb-4">Task examples</div>
            <h2 className="text-heading text-3xl md:text-4xl">Real work from real university life.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {taskExamples.map((task) => (
              <div key={task} className="card p-5">
                <p className="text-sm font-semibold">{task}</p>
                <p className="mt-3 text-xs text-subtle-text">Example task — budget set by the poster</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-10">
          <p>EduTask · student task marketplace for Bangladesh</p>
          <div className="flex gap-4">
            <Link href="/signin" className="hover:text-foreground">Sign in</Link>
            <Link href="/signup" className="hover:text-foreground">Get started</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
