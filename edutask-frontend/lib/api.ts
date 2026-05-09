"use client"

type SuccessEnvelope<T> = {
  success: true
  data?: T
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  meta?: Record<string, unknown>
}

type ErrorEnvelope = {
  success: false
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
}

export class ApiError extends Error {
  status: number
  code: string
  details: unknown

  constructor(status: number, message: string, code = "request_failed", details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details ?? null
  }
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5000").replace(/\/$/, "")
const TOKEN_STORAGE_KEY = "edutask_access_token"

export function getStoredAccessToken() {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setStoredAccessToken(token: string | null) {
  if (typeof window === "undefined") return
  if (!token) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

function generateIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function apiRequest<T>(path: string, init: RequestInit & { token?: string | null; skipIdempotency?: boolean } = {}): Promise<T> {
  const headers = new Headers(init.headers ?? {})
  const hasBody = init.body != null && init.method && init.method !== "GET"
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData

  if (hasBody && !headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json")
  }

  if (init.token) {
    headers.set("Authorization", `Bearer ${init.token}`)
  }

  if (hasBody && !init.skipIdempotency && !headers.has("Idempotency-Key")) {
    headers.set("Idempotency-Key", generateIdempotencyKey())
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  })

  const payload = (await response.json().catch(() => null)) as
    | SuccessEnvelope<T>
    | (T & { success?: boolean })
    | ErrorEnvelope
    | null

  if (!response.ok) {
    const code = (payload as ErrorEnvelope | null)?.error?.code ?? "request_failed"
    const message =
      (payload as ErrorEnvelope | null)?.error?.message ??
      (payload && typeof payload === "object" && "message" in payload ? String((payload as { message?: unknown }).message) : "Request failed")

    throw new ApiError(response.status, message, code, (payload as ErrorEnvelope | null)?.error?.details ?? payload)
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    const envelope = payload as SuccessEnvelope<T> | ErrorEnvelope
    if (envelope.success === false) {
      const code = envelope.error?.code ?? "request_failed"
      const message = envelope.error?.message ?? "Request failed"
      throw new ApiError(response.status, message, code, envelope.error?.details)
    }
    const successEnvelope = envelope as SuccessEnvelope<T> & Record<string, unknown>
    if (typeof successEnvelope.data !== "undefined") {
      return successEnvelope.data as T
    }
    const passthrough = payload as Record<string, unknown>
    const { success: _success, ...rest } = passthrough
    return rest as T
  }

  return payload as T
}

export type ListResponse<T> = {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

async function paginatedRequest<T>(path: string, token?: string | null): Promise<ListResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
  })

  const payload = (await response.json().catch(() => null)) as
    | { success: true; data: T[]; pagination: ListResponse<T>["pagination"] }
    | ErrorEnvelope
    | null

  if (!response.ok || !payload || ("success" in payload && payload.success === false)) {
    const errorPayload = payload as ErrorEnvelope | null
    throw new ApiError(
      response.status,
      errorPayload?.error?.message ?? "Request failed",
      errorPayload?.error?.code ?? "request_failed",
      errorPayload?.error?.details
    )
  }

  const okPayload = payload as { success: true; data: T[]; pagination: ListResponse<T>["pagination"] }
  return {
    data: okPayload.data ?? [],
    pagination: okPayload.pagination,
  }
}

export const api = {
  auth: {
    signup: (input: unknown | FormData) =>
      apiRequest<{ user: any; token: string }>("/api/auth/signup", {
        method: "POST",
        body: input instanceof FormData ? input : JSON.stringify(input),
        skipIdempotency: true,
      }),
    login: (input: unknown) =>
      apiRequest<{ user: any; token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
        skipIdempotency: true,
      }),
    me: (token: string | null) => apiRequest<{ user?: any }>("/api/auth/me", { method: "GET", token, skipIdempotency: true }),
    logout: (token: string | null) => apiRequest<{ logged_out: boolean }>("/api/auth/logout", { method: "POST", token, skipIdempotency: true }),
    refresh: () => apiRequest<{ user?: any; token?: string }>("/api/auth/refresh", { method: "POST", body: JSON.stringify({}), skipIdempotency: true }),
    verifyEmail: (token: string) => apiRequest<{ success: boolean; message: string }>(`/api/auth/verify-email?token=${token}`, { method: "GET", skipIdempotency: true }),
    resendVerification: (email: string) => apiRequest<{ success: boolean; message: string }>("/api/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }), skipIdempotency: true }),
  },
  tasks: {
    list: (queryString: string, token: string | null) => paginatedRequest<any>(`/tasks${queryString}`, token),
    create: (input: unknown, token: string | null) =>
      apiRequest<any>("/tasks", {
        method: "POST",
        token,
        body: JSON.stringify(input),
      }),
    apply: (taskId: string, coverLetter: string, token: string | null) =>
      apiRequest<any>(`/tasks/${taskId}/applications`, {
        method: "POST",
        token,
        body: JSON.stringify({ cover_letter: coverLetter }),
      }),
    listApplications: (taskId: string, token: string | null) => paginatedRequest<any>(`/tasks/${taskId}/applications?page=1&limit=50`, token),
    recommended: (token: string | null, limit = 10) => apiRequest<any[]>(`/tasks/recommended?limit=${limit}`, { method: "GET", token }),
  },
  wallet: {
    get: (token: string | null) => apiRequest<any>("/wallet", { method: "GET", token }),
    transactions: (token: string | null) => paginatedRequest<any>("/wallet/transactions?page=1&limit=50", token),
    withdrawals: (token: string | null) => paginatedRequest<any>("/wallet/withdrawals?page=1&limit=50", token),
    deposit: (amount: number, token: string | null) =>
      apiRequest<any>("/wallet/deposit", {
        method: "POST",
        token,
        body: JSON.stringify({ amount }),
      }),
    withdraw: (amount: number, token: string | null) =>
      apiRequest<any>("/wallet/withdraw", {
        method: "POST",
        token,
        body: JSON.stringify({ amount }),
      }),
  },
  leaderboard: {
    get: (filter: "weekly" | "monthly" | "all", token: string | null) => paginatedRequest<any>(`/leaderboard?filter=${filter}&page=1&limit=20`, token),
  },
  notifications: {
    list: (token: string | null) => paginatedRequest<any>("/notifications?page=1&limit=50", token),
    markRead: (token: string | null) => apiRequest<any>("/notifications/read", { method: "PATCH", token, body: JSON.stringify({}) }),
  },
  profile: {
    me: (token: string | null) => apiRequest<any>("/profile/me", { method: "GET", token }),
    uploadAvatar: (file: File, token: string | null) => {
      const formData = new FormData()
      formData.append("avatar", file)
      return apiRequest<any>("/profile/upload-avatar", {
        method: "POST",
        body: formData,
        token,
        skipIdempotency: true,
      })
    },
  },
  referrals: {
    me: (token: string | null) => apiRequest<any>("/referrals/me", { method: "GET", token }),
    stats: (token: string | null) => apiRequest<any>("/referrals/stats", { method: "GET", token }),
  },
  chat: {
    list: (token: string | null) => paginatedRequest<any>("/chat/conversations?page=1&limit=50", token),
    messages: (conversationId: string, token: string | null) => paginatedRequest<any>(`/chat/conversations/${conversationId}/messages?page=1&limit=100`, token),
    unread: (token: string | null) => apiRequest<any>("/chat/unread", { method: "GET", token }),
    markRead: (conversationId: string, token: string | null) =>
      apiRequest<any>(`/chat/conversations/${conversationId}/read`, {
        method: "PATCH",
        token,
        body: JSON.stringify({}),
      }),
  },
}

