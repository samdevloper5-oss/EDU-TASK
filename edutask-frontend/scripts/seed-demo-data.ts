import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const demoUsers = [
  { email: 'tanvir@demo.edutask.bd', password: 'Demo1234!', name: 'Tanvir Ahmed', university: 'NSU', department: 'CSE', trust_score: 87, is_admin: false },
  { email: 'nadia@demo.edutask.bd', password: 'Demo1234!', name: 'Nadia Islam', university: 'BRAC', department: 'Business', trust_score: 62, is_admin: false },
  { email: 'demo@demo.edutask.bd', password: 'Demo1234!', name: 'Rahman Hossain', university: 'IUB', department: 'Design', trust_score: 45, is_admin: false },
  { email: 'admin@edutask.bd', password: 'Admin1234!', name: 'Admin User', university: 'Admin', department: 'Admin', trust_score: 100, is_admin: true },
]

async function seed() {
  console.log('🌱 Seeding demo data...\n')

  for (const u of demoUsers) {
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers()
    const found = existing?.users?.find((x) => x.email === u.email)

    let userId: string
    if (found) {
      userId = found.id
      console.log(`  ✓ User exists: ${u.email}`)
    } else {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { name: u.name },
      })
      if (authError) {
        console.error(`  ✗ Failed to create ${u.email}:`, authError.message)
        continue
      }
      userId = authData.user!.id
      console.log(`  ✓ Created user: ${u.email}`)
    }

    const { error: upsertError } = await supabaseAdmin.from('users').upsert({
      id: userId,
      email: u.email,
      name: u.name,
      email_verified: true,
      profile_complete: true,
      university: u.university,
      department: u.department,
      student_id_text: 'DEMO' + Math.floor(Math.random() * 10000),
      student_id_verified: true,
      phone: '01' + (3 + Math.floor(Math.random() * 7)) + Math.floor(Math.random() * 100000000).toString().padStart(8, '0'),
      location: 'Dhaka',
      skills: ['Research', 'Writing', 'Data Entry'],
      trust_score: u.trust_score,
      completed_tasks: Math.floor(Math.random() * 20),
      wallet_balance: Math.floor(Math.random() * 5000) + 1000,
      escrow_balance: Math.floor(Math.random() * 1000),
      total_earned: Math.floor(Math.random() * 15000),
      referral_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
      is_banned: false,
      is_admin: u.is_admin,
      bkash_number: '01712345678',
      nagad_number: '01812345678',
    }, { onConflict: 'id' })

    if (upsertError) {
      console.error(`  ✗ Failed to upsert profile ${u.email}:`, upsertError.message)
    }
  }

  // Create demo tasks
  const { data: allUsers } = await supabaseAdmin.from('users').select('id, name').in('email', demoUsers.map((u) => u.email))
  const posterId = allUsers?.find((u) => u.name === 'Tanvir Ahmed')?.id

  if (posterId) {
    const tasks = [
      { title: 'Build a Portfolio Website', description: 'Need someone to build a simple portfolio website using HTML, CSS, and JavaScript. Must be responsive and mobile-friendly.', category: 'Coding', budget: 1200, status: 'open' },
      { title: 'Data Entry for Research Project', description: 'Help enter survey data into Excel spreadsheets for a sociology research project. About 200 entries.', category: 'Data Entry', budget: 800, status: 'open' },
      { title: 'Logo Design for Startup', description: 'Create a modern minimalist logo for a student tech startup. Need vector files.', category: 'Design', budget: 1500, status: 'open' },
      { title: 'React Component Debugging', description: 'Fix responsive layout issues in a Next.js dashboard. CSS Grid and Tailwind expertise needed.', category: 'Coding', budget: 1000, status: 'open' },
      { title: 'Bangla to English Translation', description: 'Translate a 10-page academic document from Bangla to English. Must maintain technical accuracy.', category: 'Translation', budget: 2000, status: 'open' },
    ]

    for (const t of tasks) {
      const { error } = await supabaseAdmin.from('tasks').insert({
        poster_id: posterId,
        title: t.title,
        description: t.description,
        category: t.category,
        task_mode: 'online',
        task_type: 'paid',
        budget: t.budget,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        required_skills: ['Web Dev', 'React'],
        status: t.status as any,
        escrow_deposited: false,
        revisions_used: 0,
        applicant_count: 0,
      })
      if (!error) console.log(`  ✓ Created task: ${t.title}`)
    }
  }

  console.log('\n✅ Demo seed complete!')
  console.log('\nLogin credentials:')
  demoUsers.forEach((u) => console.log(`  ${u.email} / ${u.password} ${u.is_admin ? '(admin)' : ''}`))
}

seed().catch(console.error)
