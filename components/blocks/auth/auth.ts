'use server'

import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GitHubProvider from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import crypto from 'crypto'

export type UserRole = 'user' | 'admin' | 'super_admin'

export interface AuthProfile {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: UserRole
  email_verified: boolean
  github_id: string | null
  google_id: string | null
  sign_in_count: number
  last_sign_in: string | null
  created_at: string
}

export interface AuthSession {
  user?: {
    id?: string
    role?: string
    email?: string
    name?: string | null
    image?: string | null
    emailVerified?: boolean
  }
}

export type AuthEventType =
  | 'sign_in'
  | 'sign_out'
  | 'register'
  | 'password_reset'
  | 'email_verified'
  | 'password_change'
  | 'account_locked'

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z
    .string()
    .min(8, 'Minimum 8 characters')
    .max(72, 'Maximum 72 characters')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[0-9]/, 'Must include a number'),
})

export const LoginSchema = z.object({
  email: z.string().email('Invalid email').toLowerCase(),
  password: z.string().min(1, 'Password required'),
})

export const ResetRequestSchema = z.object({
  email: z.string().email('Invalid email').toLowerCase(),
})

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, 'Minimum 8 characters')
      .max(72, 'Maximum 72 characters')
      .regex(/[A-Z]/, 'One uppercase')
      .regex(/[0-9]/, 'One number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z
      .string()
      .min(8, 'Minimum 8 characters')
      .max(72, 'Maximum 72 characters')
      .regex(/[A-Z]/, 'One uppercase')
      .regex(/[0-9]/, 'One number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>

type ProfileRow = {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  password_hash: string | null
  github_id: string | null
  google_id: string | null
  role: UserRole
  email_verified: boolean
  email_verify_token: string | null
  verify_token_expires: string | null
  reset_token: string | null
  reset_token_expires: string | null
  failed_login_attempts: number | null
  locked_until: string | null
  last_sign_in: string | null
  sign_in_count: number | null
  created_at: string
  updated_at: string
}

function getEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function createAdminClient(): SupabaseClient {
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

const supabaseAdmin = createAdminClient()

const ROLE_LEVELS: Record<UserRole, number> = {
  user: 0,
  admin: 1,
  super_admin: 2,
}

const LOGIN_LOCKOUT_THRESHOLD = 5
const LOGIN_LOCKOUT_MINUTES = 15
const PASSWORD_RESET_MINUTES = 15
const EMAIL_VERIFY_HOURS = 24

function nowIso(): string {
  return new Date().toISOString()
}

function futureIsoMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString()
}

function futureIsoHours(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex')
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function toNumber(value: unknown): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

async function updateProfile(userId: string, updates: Partial<ProfileRow>) {
  const { error } = await supabaseAdmin.from('profiles').update(updates).eq('id', userId)
  if (error) throw error
}

export function hasRole(session: AuthSession | null | undefined, required: UserRole): boolean {
  const role = session?.user?.role as UserRole | undefined
  return !!session?.user?.id && ROLE_LEVELS[(role ?? 'user')] >= ROLE_LEVELS[required]
}

export function requireRole(session: AuthSession | null | undefined, required: UserRole): void {
  if (!session?.user?.id) throw new Error('Unauthenticated')
  if (!hasRole(session, required)) throw new Error(`Required role: ${required}`)
}

export function requireAdmin(session: AuthSession | null | undefined): void {
  requireRole(session, 'admin')
}

export function requireSuperAdmin(session: AuthSession | null | undefined): void {
  requireRole(session, 'super_admin')
}

async function logAuthEvent(
  userId: string,
  event: AuthEventType,
  meta?: { ip?: string; userAgent?: string }
) {
  await supabaseAdmin.from('auth_events').insert({
    user_id: userId,
    event,
    ip: meta?.ip ?? null,
    user_agent: meta?.userAgent ?? null,
  })
}

async function getProfileByEmail(email: string): Promise<ProfileRow | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('email', normalizeEmail(email))
    .maybeSingle()

  if (error) throw error
  return (data as ProfileRow | null) ?? null
}

async function getProfileById(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return (data as ProfileRow | null) ?? null
}

async function isLocked(profile: ProfileRow | null): Promise<boolean> {
  if (!profile?.locked_until) return false
  return new Date(profile.locked_until) > new Date()
}

async function incrementFailedLogin(profile: ProfileRow) {
  const failed = toNumber(profile.failed_login_attempts) + 1
  const updates: Partial<ProfileRow> = {
    failed_login_attempts: failed,
  }

  if (failed >= LOGIN_LOCKOUT_THRESHOLD) {
    updates.locked_until = futureIsoMinutes(LOGIN_LOCKOUT_MINUTES)
  }

  await updateProfile(profile.id, updates)
  if (failed >= LOGIN_LOCKOUT_THRESHOLD) {
    await logAuthEvent(profile.id, 'account_locked').catch(() => {})
  }
}

async function resetLoginState(profile: ProfileRow) {
  await updateProfile(profile.id, {
    failed_login_attempts: 0,
    locked_until: null,
    last_sign_in: nowIso(),
    sign_in_count: toNumber(profile.sign_in_count) + 1,
  })
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const profile = await getProfileByEmail(parsed.data.email)
        if (!profile) return null
        if (await isLocked(profile)) return null
        if (!profile.password_hash) return null

        const valid = await bcrypt.compare(parsed.data.password, profile.password_hash)
        if (!valid) {
          await incrementFailedLogin(profile).catch(() => {})
          return null
        }

        await resetLoginState(profile).catch(() => {})

        return {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          image: profile.avatar_url,
          role: profile.role,
          emailVerified: profile.email_verified,
        }
      },
    }),

    GitHubProvider({
      clientId: getEnv('GITHUB_CLIENT_ID'),
      clientSecret: getEnv('GITHUB_CLIENT_SECRET'),
    }),

    GoogleProvider({
      clientId: getEnv('GOOGLE_CLIENT_ID'),
      clientSecret: getEnv('GOOGLE_CLIENT_SECRET'),
    }),
  ],

  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },

  callbacks: {
    async signIn({ user, account }) {
      if ((account?.provider === 'github' || account?.provider === 'google') && user.email) {
        const providerField = account.provider === 'github' ? 'github_id' : 'google_id'
        const providerId = account.providerAccountId
        const email = normalizeEmail(user.email)

        const existing = await getProfileByEmail(email)
        if (existing) {
          await supabaseAdmin
            .from('profiles')
            .update({
              [providerField]: providerId,
              avatar_url: user.image ?? existing.avatar_url,
              name: user.name ?? existing.name,
              email_verified: true,
            })
            .eq('id', existing.id)
        } else {
          await supabaseAdmin.from('profiles').insert({
            email,
            name: user.name ?? null,
            avatar_url: user.image ?? null,
            email_verified: true,
            [providerField]: providerId,
            role: 'user',
            sign_in_count: 1,
            last_sign_in: nowIso(),
          })
        }
      }
      return true
    },

    async jwt({ token, user, trigger, session }) {
      if (user?.email) {
        const profile = await getProfileByEmail(user.email)
        token.id = profile?.id ?? user.id
        token.role = (profile?.role ?? 'user') as UserRole
        token.emailVerified = profile?.email_verified ?? false
      }

      if (trigger === 'update' && session?.role) {
        token.role = session.role as UserRole
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.emailVerified = token.emailVerified as boolean
      }
      return session
    },
  },

  events: {
    async signIn({ user }) {
      if (user.id) {
        await logAuthEvent(user.id, 'sign_in').catch(() => {})
      }
    },
    async signOut({ token }) {
      const userId = token?.sub
      if (userId) {
        await logAuthEvent(userId, 'sign_out').catch(() => {})
      }
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,
}

export async function registerUser(input: RegisterInput) {
  const { name, email, password } = RegisterSchema.parse(input)
  const normalizedEmail = normalizeEmail(email)
  const existing = await getProfileByEmail(normalizedEmail)
  if (existing) throw new Error('Email already registered. Please sign in.')

  const passwordHash = await bcrypt.hash(password, 12)
  const verifyToken = randomToken(32)
  const verifyExpires = futureIsoHours(EMAIL_VERIFY_HOURS)

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .insert({
      email: normalizedEmail,
      name,
      password_hash: passwordHash,
      email_verify_token: verifyToken,
      verify_token_expires: verifyExpires,
      email_verified: false,
      role: 'user',
      sign_in_count: 0,
      failed_login_attempts: 0,
    })
    .select('id, email, name')
    .single()

  if (error) throw error

  await logAuthEvent(data.id, 'register').catch(() => {})
  return { user: data, verifyToken }
}

export async function verifyEmail(token: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, verify_token_expires')
    .eq('email_verify_token', token)
    .maybeSingle()

  if (error) throw error
  if (!data?.id || !data.verify_token_expires) return false
  if (new Date(data.verify_token_expires) < new Date()) return false

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      email_verified: true,
      email_verify_token: null,
      verify_token_expires: null,
    })
    .eq('email_verify_token', token)

  if (!updateError) {
    await logAuthEvent(data.id, 'email_verified').catch(() => {})
  }

  return !updateError
}

export async function requestPasswordReset(email: string) {
  const profile = await getProfileByEmail(email)
  if (!profile) return null

  const token = randomToken(32)
  const expires = futureIsoMinutes(PASSWORD_RESET_MINUTES)

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      reset_token: token,
      reset_token_expires: expires,
    })
    .eq('id', profile.id)

  if (error) throw error

  return { token, name: profile.name }
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const parsed = ResetPasswordSchema.parse({
    token,
    password: newPassword,
    confirmPassword: newPassword,
  })

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, reset_token_expires')
    .eq('reset_token', parsed.token)
    .maybeSingle()

  if (error) throw error
  if (!data?.id || !data.reset_token_expires) return false
  if (new Date(data.reset_token_expires) < new Date()) return false

  const passwordHash = await bcrypt.hash(parsed.password, 12)

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      password_hash: passwordHash,
      reset_token: null,
      reset_token_expires: null,
    })
    .eq('id', data.id)

  if (!updateError) {
    await logAuthEvent(data.id, 'password_reset').catch(() => {})
  }

  return !updateError
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const parsed = ChangePasswordSchema.parse({
    currentPassword,
    newPassword,
    confirmPassword: newPassword,
  })

  const profile = await getProfileById(userId)
  if (!profile?.password_hash) throw new Error('No password set on this account')

  const valid = await bcrypt.compare(parsed.currentPassword, profile.password_hash)
  if (!valid) throw new Error('Current password is incorrect')

  const newHash = await bcrypt.hash(parsed.newPassword, 12)
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ password_hash: newHash })
    .eq('id', userId)

  if (error) throw error
  await logAuthEvent(userId, 'password_change').catch(() => {})
}

export async function getProfile(userId: string): Promise<AuthProfile | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, name, avatar_url, role, email_verified, github_id, google_id, sign_in_count, last_sign_in, created_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return (data as AuthProfile | null) ?? null
}

export async function updateProfile(
  userId: string,
  updates: { name?: string; avatar_url?: string }
) {
  const payload: Partial<ProfileRow> = {}
  if (typeof updates.name === 'string') payload.name = updates.name.trim().slice(0, 80)
  if (typeof updates.avatar_url === 'string') payload.avatar_url = updates.avatar_url.trim()

  const { error } = await supabaseAdmin.from('profiles').update(payload).eq('id', userId)
  if (error) throw error
}

export async function deleteAccount(userId: string) {
  const { error } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
  if (error) throw error
}

export async function getAuthEvents(userId: string, limit = 20) {
  const safeLimit = Math.min(100, Math.max(1, limit))
  const { data, error } = await supabaseAdmin
    .from('auth_events')
    .select('event, ip, user_agent, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  if (error) throw error
  return data || []
}

export function generateAffiliateCode(email: string): string {
  const prefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase()
  const suffix = crypto.randomBytes(2).toString('hex')
  return `${prefix}${suffix}`.slice(0, 12)
}

export function withAuth<T>(
  handler: (req: T, session: AuthSession) => Promise<Response>,
  requiredRole?: UserRole
) {
  return async (req: T): Promise<Response> => {
    const { getServerSession } = await import('next-auth')
    const session = (await getServerSession(authOptions)) as AuthSession | null

    if (!session?.user?.id) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (requiredRole && !hasRole(session, requiredRole)) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    return handler(req, session)
  }
}

export async function getPublicAuthConfig() {
  return {
    signInPage: '/auth/signin',
    emailVerificationRequired: true,
    passwordResetMinutes: PASSWORD_RESET_MINUTES,
    lockoutThreshold: LOGIN_LOCKOUT_THRESHOLD,
    lockoutMinutes: LOGIN_LOCKOUT_MINUTES,
  }
}