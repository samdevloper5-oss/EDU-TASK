import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/top-bar'
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('is_banned, email_verified, profile_complete')
    .eq('id', user.id)
    .single()

  if (profile?.is_banned) {
    await supabase.auth.signOut()
    redirect('/signin?reason=banned')
  }

  if (!profile?.email_verified) {
    redirect('/verify-otp')
  }

  if (!profile?.profile_complete) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:ml-64">
        <TopBar />
        <main className="pb-20 md:pb-0">
          <div className="p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
