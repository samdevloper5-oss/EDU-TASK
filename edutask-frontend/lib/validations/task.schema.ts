import { z } from 'zod'

export const createTaskSchema = z.object({
  title: z.string().min(10).max(100),
  description: z.string().min(30),
  category: z.enum([
    'Design', 'Coding', 'Research', 'Writing', 'Data Entry',
    'Translation', 'Media', 'Academic Help', 'Other',
  ]),
  task_mode: z.enum(['online', 'offline']).default('online'),
  budget: z.number().min(200).max(50000),
  deadline: z.string().datetime(),
  required_skills: z.array(z.string()).default([]),
  location: z.string().optional(),
})

export const applyTaskSchema = z.object({
  proposal: z.string().min(20).max(2000),
  estimated_hours: z.number().positive().optional(),
})

export const hireWorkerSchema = z.object({
  worker_id: z.string().uuid(),
})

export const submitWorkSchema = z.object({
  message: z.string().min(1).max(5000).optional(),
  file_url: z.string().url().optional(),
  file_name: z.string().optional(),
})

export const revisionSchema = z.object({
  message: z.string().min(10).max(1000),
})

export const disputeSchema = z.object({
  reason: z.string().min(20).max(1000),
})

export const reviewSchema = z.object({
  task_id: z.string().uuid(),
  reviewed_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000),
})

export const depositSchema = z.object({
  amount: z.number().min(100).max(10000),
  method: z.enum(['bkash', 'nagad', 'demo']).default('demo'),
})

export const withdrawSchema = z.object({
  amount: z.number().min(100),
  method: z.enum(['bkash', 'nagad']),
  phone: z.string().regex(/^01[3-9]\d{8}$/),
})

export const sendMessageSchema = z.object({
  task_id: z.string().uuid(),
  content: z.string().min(1).max(5000),
  file_url: z.string().url().optional(),
  file_name: z.string().optional(),
})

export const updateProfileSchema = z
  .object({
    full_name: z.string().min(2).max(100).optional(),
    bio: z.string().max(500).optional(),
    location: z.string().max(200).optional(),
    skills: z.array(z.string()).max(20).optional(),
    profile_photo_url: z.string().url().optional().nullable(),
    bkash_number: z
      .string()
      .regex(/^01[3-9]\d{8}$/)
      .optional()
      .nullable(),
    nagad_number: z
      .string()
      .regex(/^01[3-9]\d{8}$/)
      .optional()
      .nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  })

export const adminBanSchema = z.object({
  is_banned: z.boolean(),
  ban_reason: z.string().max(500).optional(),
})
