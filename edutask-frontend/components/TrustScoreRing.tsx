'use client'

import { getTrustColor, getTrustLabel } from '@/lib/trust-score'

export function TrustScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const fillPercent = Math.min(100, Math.max(0, score)) / 100
  const dashOffset = circumference * (1 - fillPercent)
  const color = getTrustColor(score)
  const label = getTrustLabel(score)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-muted" strokeWidth={6} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-mono font-bold">{score}</span>
        </div>
      </div>
      <span className="text-xs font-medium" style={{ color }}>{label}</span>
    </div>
  )
}
