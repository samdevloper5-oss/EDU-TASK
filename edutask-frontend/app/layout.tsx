import type { Metadata, Viewport } from 'next'
import { DM_Sans, Sora } from 'next/font/google'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/components/providers/query-provider'
import { ReactScanProvider } from '@/components/providers/react-scan-provider'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-body' })
const sora = Sora({ subsets: ['latin'], variable: '--font-display' })

export const metadata: Metadata = {
  title: 'EduTask - Student Micro-Task Marketplace',
  description: 'Earn. Learn. Grow - Inside Your Campus. EduTask connects verified students with trusted campus micro-tasks.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'EduTask' },
}

export const viewport: Viewport = {
  themeColor: '#4F46E5',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${sora.variable} font-sans antialiased`}>
        <ReactScanProvider />
        <QueryProvider>
          {children}
          <Toaster position="top-right" richColors expand />
        </QueryProvider>
      </body>
    </html>
  )
}
