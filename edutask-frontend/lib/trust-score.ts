export const TRUST_EVENTS = {
  REVIEW_5_STAR: 10,
  REVIEW_4_STAR: 8,
  REVIEW_3_STAR: 6,
  REVIEW_2_STAR: 4,
  REVIEW_1_STAR: 2,
  TASK_COMPLETION_BONUS: 3,
  DISPUTE_LOST: -15,
  OFF_PLATFORM_PAYMENT: -20,
  REGISTRATION: 20,
  STUDENT_ID_VERIFIED: 5,
} as const

export function getTrustLabel(score: number): string {
  if (score >= 85) return 'Elite'
  if (score >= 70) return 'Expert'
  if (score >= 50) return 'Trusted'
  if (score >= 30) return 'Rising'
  return 'Newcomer'
}

export function getTrustColor(score: number): string {
  if (score >= 70) return '#10B981'
  if (score >= 40) return '#F59E0B'
  return '#EF4444'
}
