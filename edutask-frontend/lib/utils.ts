import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBDT(amount: number): string {
  return `Tk ${amount.toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

export function truncate(str: string, n: number): string {
  return str.length <= n ? str : `${str.slice(0, n)}...`
}

export function getDeadlineInfo(deadline: string) {
  const now = Date.now()
  const end = new Date(deadline).getTime()
  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  const isUrgent = daysLeft <= 2
  const isOverdue = daysLeft < 0
  const label = isOverdue
    ? 'Overdue'
    : daysLeft === 0
      ? 'Due today'
      : daysLeft === 1
        ? '1 day left'
        : `${daysLeft} days left`
  const color = isOverdue ? '#EF4444' : isUrgent ? '#F59E0B' : '#6B7280'

  return { label, color, isUrgent, isOverdue, daysLeft }
}

export function sanitizeText(input: string): string {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .slice(0, 10000)
}
