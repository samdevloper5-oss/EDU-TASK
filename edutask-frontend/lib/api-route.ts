import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export function apiOk<T>(
  data: T,
  options?: { status?: number; pagination?: Record<string, number> }
) {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(options?.pagination ? { pagination: options.pagination } : {}),
    },
    { status: options?.status ?? 200 }
  )
}

export function apiErr(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status })
}

export async function parseJsonBody(request: Request) {
  try {
    return { ok: true as const, body: await request.json() }
  } catch {
    return { ok: false as const, response: apiErr('Invalid JSON body', 400) }
  }
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

export async function insertSystemMessage(taskId: string, content: string) {
  await supabaseAdmin.from('messages').insert({
    task_id: taskId,
    sender_id: null,
    content,
    message_type: 'system',
    is_system_message: true,
  })
}

export function paginationFrom(
  page: number,
  limit: number,
  total: number
) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  }
}

export function parsePagination(searchParams: URLSearchParams, defaults?: { limit?: number }) {
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const defaultLimit = defaults?.limit ?? 20
  const parsedLimit = parseInt(searchParams.get('limit') ?? String(defaultLimit), 10)
  const limit = Math.min(100, Math.max(1, Number.isNaN(parsedLimit) ? defaultLimit : parsedLimit))
  const from = (page - 1) * limit
  const to = from + limit - 1
  return { page, limit, from, to }
}
