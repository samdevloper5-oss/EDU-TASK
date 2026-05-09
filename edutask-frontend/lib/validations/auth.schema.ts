import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
})

export const verifyOTPSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  type: z.enum(['email_verify', 'password_reset']),
})

export const resendOTPSchema = z.object({
  email: z.string().email(),
  type: z.enum(['email_verify', 'password_reset']),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
})

export const completeProfileSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^01[3-9]\d{8}$/, 'Enter a valid Bangladesh phone number'),
  university: z.string().min(2),
  department: z.string().min(2),
  student_id_text: z.string().min(1),
  location: z.string().optional(),
  skills: z.array(z.string()).min(1, 'Add at least one skill'),
  referral_code: z.string().optional(),
})
