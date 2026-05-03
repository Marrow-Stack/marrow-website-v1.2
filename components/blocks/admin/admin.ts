'use server'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type AdminRole = 'admin' | 'super_admin'
export type UserRole = 'user' | 'admin' | 'super_admin' | 'banned'

export interface AdminSession {
  user?: {
    id?: string
    role?: string
    email?: string
  }
}

export interface DashboardStats {
  totalUsers: number
  totalRevenue: number
  totalPurchases: number
  totalRefunds: number
  avgOrderValue: number
  refundRate: number
  proSubscribers: number
  affiliatePayoutsPending: number
}

export interface RevenueMonth {
  month: string
  revenue: number
  purchases: number
}

export interface SignupDay {
  day: string
  signups: number
}

export interface BlockStats {
  block_id: string
  count: number
  revenue: number
  refundCount: number
}

export interface AdminUser {
  id: string
  email: string
  name: string | null
  role: UserRole | string
  has_pro_subscription: boolean
  affiliate_balance: number
  affiliate_code: string | null
  sign_in_count: number
  created_at: string
  last_sign_in: string | null
}

export interface FeatureFlag {
  key: string
  enabled: boolean
  description: string | null
  rollout_pct: number
  updated_at: string
}

export interface PurchaseRecord {
  id: string
  user_id?: string
  block_id: string | null
  amount: number | string | null
  status: string | null
  created_at: string
  paypal_order_id?: string | null
  profiles?: {
    email?: string | null
    name?: string | null
  } | null
}

type DbAdapter = {
  profiles: {
    countAll: () => Promise<number>
    countByProSubscription: (enabled: boolean) => Promise<number>
    findById: (userId: string) => Promise<AdminUser | null>
    findMany: (opts: {
      page: number
      pageSize: number
      search?: string
      role?: string
    }) => Promise<{ rows: AdminUser[]; total: number }>
    updateRole: (userId: string, role: UserRole) => Promise<void>
    updateBan: (userId: string) => Promise<void>
    findEmails: (opts?: { proOnly?: boolean }) => Promise<string[]>
    search: (query: string, limit: number) => Promise<Partial<AdminUser>[]>
    affiliateLeaderboard: (limit: number) => Promise<any[]>
    pendingAffiliateBalance: () => Promise<number>
  }
  purchases: {
    completed: () => Promise<PurchaseRecord[]>
    refundedCount: () => Promise<number>
    byUser: (userId: string) => Promise<PurchaseRecord[]>
    all: () => Promise<PurchaseRecord[]>
    blockStats: () => Promise<BlockStats[]>
    recentActivity: (limit: number) => Promise<any[]>
  }
  featureFlags: {
    all: () => Promise<FeatureFlag[]>
    byKey: (key: string) => Promise<FeatureFlag | null>
    upsert: (flag: FeatureFlag) => Promise<void>
    delete: (key: string) => Promise<void>
  }
  rpc: {
    revenueByMonth: (months: number) => Promise<RevenueMonth[]>
    signupsByDay: (days: number) => Promise<SignupDay[]>
  }
  affiliateEarnings: {
    byAffiliateUserId: (affiliateUserId: string) => Promise<any[]>
  }
}

export interface AdminContext {
  user?: {
    id?: string
    role?: string
    email?: string
  }
}

const PROFILE_SELECT =
  'id, email, name, role, has_pro_subscription, affiliate_balance, affiliate_code, sign_in_count, created_at, last_sign_in'

function getEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function createAdminDb(): SupabaseClient {
  return createClient(
    getEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
}

const db = createAdminDb()

function toNumber(value: unknown): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

export function hasAdminAccess(
  session: AdminSession | null | undefined
): session is { user: { id: string; role: AdminRole } } {
  return !!session?.user?.id && (session.user.role === 'admin' || session.user.role === 'super_admin')
}

export function hasSuperAdminAccess(
  session: AdminSession | null | undefined
): session is { user: { id: string; role: 'super_admin' } } {
  return !!session?.user?.id && session.user.role === 'super_admin'
}

export function requireAdmin(
  session: AdminSession | null | undefined
): asserts session is { user: { id: string; role: AdminRole } } {
  if (!session?.user?.id) throw new Error('Unauthenticated')
  if (session.user.role !== 'admin' && session.user.role !== 'super_admin') {
    throw new Error('Admin access required')
  }
}

export function requireSuperAdmin(
  session: AdminSession | null | undefined
): asserts session is { user: { id: string; role: 'super_admin' } } {
  if (!session?.user?.id) throw new Error('Unauthenticated')
  if (session.user.role !== 'super_admin') throw new Error('Super admin access required')
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [usersCount, completed, refundedCount, proCount, pendingBalances] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('purchases').select('amount').eq('status', 'completed'),
    db.from('purchases').select('*', { count: 'exact', head: true }).eq('status', 'refunded'),
    db.from('profiles').select('*', { count: 'exact', head: true }).eq('has_pro_subscription', true),
    db.from('profiles').select('affiliate_balance').gt('affiliate_balance', 0),
  ])

  if (usersCount.error) throw usersCount.error
  if (completed.error) throw completed.error
  if (refundedCount.error) throw refundedCount.error
  if (proCount.error) throw proCount.error
  if (pendingBalances.error) throw pendingBalances.error

  const completedRows = (completed.data || []) as PurchaseRecord[]
  const totalRevenue = completedRows.reduce((sum, row) => sum + toNumber(row.amount), 0)
  const totalPurchases = completedRows.length
  const totalRefunds = refundedCount.count || 0
  const totalTransactions = totalPurchases + totalRefunds
  const affiliatePayoutsPending = (pendingBalances.data || []).reduce(
    (sum, row: { affiliate_balance?: number | string | null }) => sum + toNumber(row.affiliate_balance),
    0
  )

  return {
    totalUsers: usersCount.count || 0,
    totalRevenue,
    totalPurchases,
    totalRefunds,
    avgOrderValue: totalPurchases > 0 ? totalRevenue / totalPurchases : 0,
    refundRate: totalTransactions > 0 ? (totalRefunds / totalTransactions) * 100 : 0,
    proSubscribers: proCount.count || 0,
    affiliatePayoutsPending,
  }
}

export async function getRevenueByMonth(months = 6): Promise<RevenueMonth[]> {
  const { data, error } = await db.rpc('revenue_by_month', { p_months: months })
  if (error) throw error
  return (data || []).map((row: any) => ({
    month: String(row.month),
    revenue: toNumber(row.revenue),
    purchases: toNumber(row.purchases),
  }))
}

export async function getSignupsByDay(days = 30): Promise<SignupDay[]> {
  const { data, error } = await db.rpc('signups_by_day', { p_days: days })
  if (error) throw error
  return (data || []).map((row: any) => ({
    day: String(row.day),
    signups: toNumber(row.signups),
  }))
}

export async function getBlockStats(): Promise<BlockStats[]> {
  const { data, error } = await db.from('purchases').select('block_id, amount, status')
  if (error) throw error

  const stats = new Map<string, BlockStats>()

  for (const row of (data || []) as Array<{
    block_id: string | null
    amount: number | string | null
    status: string | null
  }>) {
    const key = row.block_id || 'unknown'
    const current = stats.get(key) || {
      block_id: key,
      count: 0,
      revenue: 0,
      refundCount: 0,
    }

    if (row.status === 'completed') {
      current.count += 1
      current.revenue += toNumber(row.amount)
    } else if (row.status === 'refunded') {
      current.refundCount += 1
    }

    stats.set(key, current)
  }

  return Array.from(stats.values()).sort((a, b) => b.revenue - a.revenue)
}

export async function getAllUsers(opts?: {
  page?: number
  pageSize?: number
  search?: string
  role?: string
}): Promise<{ users: AdminUser[]; total: number }> {
  const page = Math.max(1, opts?.page || 1)
  const pageSize = Math.min(100, Math.max(1, opts?.pageSize || 25))
  const search = opts?.search?.trim()
  const role = opts?.role?.trim()
  const from = (page - 1) * pageSize

  let query = db
    .from('profiles')
    .select(PROFILE_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1)

  if (search) {
    const safe = search.replace(/[%(),]/g, ' ').trim()
    query = query.or(`email.ilike.%${safe}%,name.ilike.%${safe}%`)
  }

  if (role) query = query.eq('role', role)

  const { data, count, error } = await query
  if (error) throw error

  return {
    users: (data || []) as AdminUser[],
    total: count || 0,
  }
}

export async function getUserById(userId: string): Promise<AdminUser | null> {
  const { data, error } = await db.from('profiles').select(PROFILE_SELECT).eq('id', userId).maybeSingle()
  if (error) throw error
  return (data as AdminUser | null) || null
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const allowedRoles: UserRole[] = ['user', 'admin', 'super_admin', 'banned']
  assert(allowedRoles.includes(role), 'Invalid role')
  const { error } = await db.from('profiles').update({ role }).eq('id', userId)
  if (error) throw error
}

export async function banUser(userId: string): Promise<void> {
  const { error } = await db.from('profiles').update({ role: 'banned' }).eq('id', userId)
  if (error) throw error
}

export async function getUserPurchases(userId: string): Promise<PurchaseRecord[]> {
  const { data, error } = await db
    .from('purchases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as PurchaseRecord[]
}

export async function searchUsers(query: string, limit = 10): Promise<Partial<AdminUser>[]> {
  const q = query.trim()
  if (!q) return []

  const safe = q.replace(/[%(),]/g, ' ').trim()
  const { data, error } = await db
    .from('profiles')
    .select('id, email, name, role, created_at')
    .or(`email.ilike.%${safe}%,name.ilike.%${safe}%`)
    .limit(Math.min(50, Math.max(1, limit)))

  if (error) throw error
  return (data || []) as Partial<AdminUser>[]
}

export async function getAffiliateLeaderboard(limit = 20) {
  const { data, error } = await db
    .from('profiles')
    .select('id, name, email, affiliate_code, affiliate_balance')
    .gt('affiliate_balance', 0)
    .order('affiliate_balance', { ascending: false })
    .limit(Math.min(100, Math.max(1, limit)))

  if (error) throw error
  return data || []
}

export async function getAffiliateEarningsDetail(affiliateUserId: string) {
  const { data, error } = await db
    .from('affiliate_earnings')
    .select('*, profiles!purchase_user_id(email, name)')
    .eq('affiliate_user_id', affiliateUserId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data || []
}

export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const { data, error } = await db.from('feature_flags').select('*').order('key')
  if (error) throw error
  return (data || []) as FeatureFlag[]
}

export async function getFeatureFlag(key: string): Promise<boolean> {
  const { data, error } = await db
    .from('feature_flags')
    .select('enabled, rollout_pct')
    .eq('key', key)
    .maybeSingle()

  if (error) throw error
  if (!data || !data.enabled) return false
  if (toNumber(data.rollout_pct) >= 100) return true

  const hash = key.split('').reduce((acc, ch) => ((acc << 5) - acc) + ch.charCodeAt(0), 0)
  return Math.abs(hash) % 100 < toNumber(data.rollout_pct)
}

export async function setFeatureFlag(
  key: string,
  enabled: boolean,
  opts?: { description?: string; rolloutPct?: number }
): Promise<void> {
  const payload: FeatureFlag = {
    key,
    enabled,
    description: opts?.description ?? null,
    rollout_pct: Math.min(100, Math.max(0, opts?.rolloutPct ?? 100)),
    updated_at: new Date().toISOString(),
  }

  const { error } = await db.from('feature_flags').upsert(payload, { onConflict: 'key' })
  if (error) throw error
}

export async function deleteFeatureFlag(key: string): Promise<void> {
  const { error } = await db.from('feature_flags').delete().eq('key', key)
  if (error) throw error
}

export async function getAllUserEmails(opts?: { proOnly?: boolean }): Promise<string[]> {
  let query = db.from('profiles').select('email')
  if (opts?.proOnly) query = query.eq('has_pro_subscription', true)
  const { data, error } = await query
  if (error) throw error
  return (data || [])
    .map((row: { email: string | null }) => row.email)
    .filter(Boolean) as string[]
}

export async function getRecentActivity(limit = 30) {
  const safeLimit = Math.min(100, Math.max(1, limit))
  const half = Math.max(1, Math.ceil(safeLimit / 2))

  const [purchases, signups] = await Promise.all([
    db
      .from('purchases')
      .select('id, block_id, amount, status, created_at, profiles(email, name)')
      .order('created_at', { ascending: false })
      .limit(half),
    db
      .from('profiles')
      .select('id, email, name, created_at')
      .order('created_at', { ascending: false })
      .limit(half),
  ])

  if (purchases.error) throw purchases.error
  if (signups.error) throw signups.error

  const events = [
    ...((purchases.data || []) as any[]).map((p) => ({
      type: 'purchase' as const,
      id: p.id,
      label: `${p.profiles?.name || p.profiles?.email || 'Unknown user'} bought ${p.block_id || 'unknown block'}`,
      amount: toNumber(p.amount),
      status: p.status,
      at: p.created_at,
    })),
    ...((signups.data || []) as any[]).map((u) => ({
      type: 'signup' as const,
      id: u.id,
      label: `${u.name || u.email || 'Unknown user'} signed up`,
      at: u.created_at,
    })),
  ]

  return events
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, safeLimit)
}

export async function exportPurchasesCSV(): Promise<string> {
  const { data, error } = await db
    .from('purchases')
    .select('id, block_id, amount, status, created_at, profiles(email, name), paypal_order_id')
    .order('created_at', { ascending: false })

  if (error) throw error

  const header = [
    'id',
    'email',
    'name',
    'block_id',
    'amount',
    'status',
    'paypal_order_id',
    'created_at',
  ]

  const rows = (data || []).map((p: any) => [
    escapeCsv(p.id),
    escapeCsv(p.profiles?.email || ''),
    escapeCsv(p.profiles?.name || ''),
    escapeCsv(p.block_id || ''),
    escapeCsv(toNumber(p.amount)),
    escapeCsv(p.status || ''),
    escapeCsv(p.paypal_order_id || ''),
    escapeCsv(p.created_at || ''),
  ].join(','))

  return [header.join(','), ...rows].join('\n')
}