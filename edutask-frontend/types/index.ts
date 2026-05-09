export type TaskCategory =
  | 'Design'
  | 'Coding'
  | 'Research'
  | 'Writing'
  | 'Data Entry'
  | 'Translation'
  | 'Media'
  | 'Other'

export type TaskStatus =
  | 'open'
  | 'hired'
  | 'in_progress'
  | 'under_review'
  | 'completed'
  | 'cancelled'
  | 'disputed'

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'escrow_lock'
  | 'escrow_release'
  | 'earning'
  | 'platform_fee'
  | 'refund'

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed'

export type NotificationType =
  | 'task_applied'
  | 'task_hired'
  | 'work_submitted'
  | 'escrow_released'
  | 'new_message'
  | 'review_received'
  | 'dispute_opened'
  | 'dispute_resolved'
  | 'id_verified'
  | 'id_rejected'
  | 'system'

export type OTPType = 'email_verify' | 'password_reset'

export interface User {
  id: string
  email: string
  email_verified: boolean
  profile_complete: boolean
  name: string
  phone: string
  university: string
  department: string
  student_id_text: string
  student_id_image_url?: string
  student_id_verified: boolean
  profile_photo_url?: string
  bio: string
  location: string
  skills: string[]
  trust_score: number
  completed_tasks: number
  wallet_balance: number
  escrow_balance: number
  total_earned: number
  referral_code: string
  referred_by?: string
  bkash_number?: string
  nagad_number?: string
  is_banned: boolean
  is_admin: boolean
  remember_me: boolean
  last_sign_in_at?: string
  password_reset_at?: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  poster_id: string
  poster?: User
  title: string
  description: string
  category: TaskCategory
  task_mode: 'online' | 'offline'
  task_type: 'paid' | 'volunteer'
  budget: number
  deadline: string
  required_skills: string[]
  location?: string
  status: TaskStatus
  hired_worker_id?: string
  hired_worker?: User
  escrow_deposited: boolean
  revisions_used: number
  applicant_count: number
  submitted_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface Application {
  id: string
  task_id: string
  task?: Task
  worker_id: string
  worker?: User
  proposal: string
  estimated_hours?: number
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  fee: number
  net_amount: number
  method?: 'bkash' | 'nagad' | 'wallet'
  status: TransactionStatus
  reference_id?: string
  external_ref?: string
  notes?: string
  created_at: string
}

export interface Message {
  id: string
  task_id: string
  sender_id: string
  sender?: User
  content: string
  file_url?: string
  file_name?: string
  is_system_message: boolean
  flagged: boolean
  created_at: string
}

export interface Review {
  id: string
  task_id: string
  reviewer_id: string
  reviewed_id: string
  rating: number
  comment: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  is_read: boolean
  link?: string
  reference_id?: string
  created_at: string
}

export interface OTPCode {
  id: string
  user_id: string
  email: string
  otp: string
  type: OTPType
  expires_at: string
  used: boolean
  attempts: number
  created_at: string
}
