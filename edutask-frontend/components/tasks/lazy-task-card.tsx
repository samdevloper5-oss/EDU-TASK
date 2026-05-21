'use client'

import { memo } from 'react'
import { useVisible } from '@/lib/hooks/use-visible'

interface LazyTaskCardProps {
  children: React.ReactNode
  height?: number
}

export const LazyTaskCard = memo(function LazyTaskCard({ children, height = 220 }: LazyTaskCardProps) {
  const { ref, isVisible } = useVisible('400px')

  return (
    <div ref={ref} style={{ minHeight: isVisible ? undefined : height }}>
      {isVisible ? children : (
        <div className="h-[220px] bg-muted animate-pulse rounded-2xl" />
      )}
    </div>
  )
})
