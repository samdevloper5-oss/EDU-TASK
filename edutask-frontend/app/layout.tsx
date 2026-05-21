import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/components/providers/query-provider'
import { ReactScanProvider } from '@/components/providers/react-scan-provider'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' })

export const metadata: Metadata = {
  title: 'EduTask — Student Task Marketplace',
  description: 'Earn. Learn. Grow — Inside Your Campus.',
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
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased`}>
        <ReactScanProvider />
        <QueryProvider>
          {children}
          <Toaster position="top-right" richColors expand />
        </QueryProvider>
      </body>
    </html>
  )
}
