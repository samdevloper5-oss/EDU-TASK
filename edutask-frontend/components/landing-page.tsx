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
    <main className="min-h-screen bg-[#F8F8F7] text-[#0F0F0F]">
      <nav className="sticky top-0 z-30 border-b border-[#E5E5E3] bg-[#F8F8F7]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-[#4F46E5] flex items-center justify-center">
              <span className="text-sm font-bold text-white">E</span>
            </div>
            <span className="text-sm font-bold tracking-tight md:text-base">EduTask</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm text-[#6B6B6B] hover:text-[#0F0F0F]">
              How it works
            </a>
            <a href="#tasks" className="text-sm text-[#6B6B6B] hover:text-[#0F0F0F]">
              Task examples
            </a>
            <a href="#why" className="text-sm text-[#6B6B6B] hover:text-[#0F0F0F]">
              Why EduTask
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/signin" className="text-sm font-medium text-[#6B6B6B] hover:text-[#0F0F0F]">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-[#0F0F0F] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a2a2a]"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:px-10 md:py-24">
        <div>
          <div className="inline-flex items-center gap-2 text-label mb-6">
            <span className="h-px w-4 bg-[#4F46E5]" />
            Bangladesh · Students only
          </div>

          <h1 className="text-display max-w-2xl text-5xl leading-[1.02] md:text-7xl">
            Earn money.
            <br />
            Build skills.
            <br />
            Stay on campus.
          </h1>

          <p className="mt-6 max-w-xl text-lg text-[#6B6B6B]">
            EduTask connects Bangladeshi students with paid micro-tasks: design, coding, writing, research, and campus help. Escrow is built in. Verification is real.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-[#4F46E5] px-5 py-3 text-sm font-medium text-white hover:bg-[#4338CA]"
            >
              Start earning <ArrowRight className="size-4" />
            </Link>
            <Link href="/tasks" className="text-sm font-medium text-[#6B6B6B] hover:text-[#0F0F0F]">
              Browse tasks →
            </Link>
          </div>

          <div className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-[#E5E5E3] pt-8">
            <div>
              <p className="text-2xl font-bold">200৳+</p>
              <p className="text-xs text-[#A3A3A3]">Minimum task budget</p>
            </div>
            <div>
              <p className="text-2xl font-bold">8%</p>
              <p className="text-xs text-[#A3A3A3]">Platform fee</p>
            </div>
            <div>
              <p className="text-2xl font-bold">bKash</p>
              <p className="text-xs text-[#A3A3A3]">Withdrawals</p>
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
                <span className="text-label rounded-md bg-[#F4F4F2] px-2.5 py-1 text-[#4F46E5]">
                  {task.category}
                </span>
                <p className="text-lg font-bold">৳{task.budget}</p>
              </div>
              <h2 className="mt-3 text-sm font-semibold leading-snug">{task.title}</h2>
              <p className="mt-2 text-xs text-[#A3A3A3]">
                {task.university} · trust score {task.trust}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="why" className="border-y border-[#E5E5E3] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 md:grid-cols-[0.9fr_1.1fr] md:px-10">
          <div>
            <div className="text-label mb-4">Why EduTask</div>
            <h2 className="text-heading text-3xl md:text-4xl">A marketplace that feels built for students, not investors.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-5">
              <Shield className="size-4 text-[#4F46E5]" />
              <p className="mt-3 text-sm font-semibold">Escrow first</p>
              <p className="mt-1 text-sm text-[#6B6B6B]">Money stays locked until the poster accepts the work.</p>
            </div>
            <div className="card p-5">
              <Check className="size-4 text-[#4F46E5]" />
              <p className="mt-3 text-sm font-semibold">Verified students</p>
              <p className="mt-1 text-sm text-[#6B6B6B]">Profiles, student ID review, and admin moderation stay in the loop.</p>
            </div>
            <div className="card p-5">
              <Clock className="size-4 text-[#4F46E5]" />
              <p className="mt-3 text-sm font-semibold">Fast turnaround</p>
              <p className="mt-1 text-sm text-[#6B6B6B]">Small tasks. Clear deadlines. No enterprise baggage.</p>
            </div>
            <div className="card p-5">
              <Star className="size-4 text-[#4F46E5]" />
              <p className="mt-3 text-sm font-semibold">Trust scores</p>
              <p className="mt-1 text-sm text-[#6B6B6B]">Reputation grows from completed work and reviews.</p>
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
              <p className="mt-2 text-sm text-[#6B6B6B]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="tasks" className="bg-white border-y border-[#E5E5E3]">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10">
          <div className="mb-8 max-w-xl">
            <div className="text-label mb-4">Task examples</div>
            <h2 className="text-heading text-3xl md:text-4xl">Real work from real university life.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {taskExamples.map((task) => (
              <div key={task} className="card p-5">
                <p className="text-sm font-semibold">{task}</p>
                <p className="mt-3 text-xs text-[#A3A3A3]">Example task — budget set by the poster</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E5E5E3]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-[#6B6B6B] md:flex-row md:items-center md:justify-between md:px-10">
          <p>EduTask · student task marketplace for Bangladesh</p>
          <div className="flex gap-4">
            <Link href="/signin" className="hover:text-[#0F0F0F]">Sign in</Link>
            <Link href="/signup" className="hover:text-[#0F0F0F]">Get started</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
