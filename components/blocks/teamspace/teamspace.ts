'use server'

/**
 * READY-TO-SHIP BACKEND LOGIC FOR A TEAM / WORKSPACE / "TEASPACE" BLOCK
 *
 * What the integrator must fill in:
 * 1. getDb() -> return your database client
 * 2. getCurrentUser() -> return the signed-in user
 * 3. sendWorkspaceInviteEmail() -> optional custom email sender
 * 4. map database table names/fields if your schema differs
 *
 * Works as a reusable backend layer for:
 * - get workspace details
 * - get members
 * - get pending invites
 * - invite member
 * - revoke invite
 * - change member role
 * - remove member
 */

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer'
export type WorkspacePlan = 'free' | 'pro' | 'enterprise'

export type CurrentUser = {
  id: string
  email?: string | null
}

export type Workspace = {
  id: string
  name: string
  slug: string
  owner_id: string
  plan: WorkspacePlan
  logo_url?: string | null
  settings?: Record<string, unknown> | null
  created_at: string
}

export type WorkspaceMember = {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  joined_at: string
  email: string
  name?: string | null
  avatar_url?: string | null
}

export type WorkspaceInvite = {
  id: string
  workspace_id: string
  email: string
  role: Exclude<WorkspaceRole, 'owner'>
  token: string
  invited_by?: string | null
  accepted_at?: string | null
  expires_at: string
  created_at: string
}

export type WorkspaceAction =
  | 'workspace:view'
  | 'workspace:invite'
  | 'workspace:settings'
  | 'workspace:billing'
  | 'workspace:delete'
  | 'member:view'
  | 'member:remove'
  | 'member:change_role'

type DbAdapter = {
  workspace: {
    findById: (workspaceId: string) => Promise<Workspace | null>
    updateMemberCount?: (workspaceId: string) => Promise<void>
  }
  member: {
    findManyByWorkspace: (workspaceId: string) => Promise<WorkspaceMember[]>
    findByWorkspaceAndUser: (
      workspaceId: string,
      userId: string
    ) => Promise<WorkspaceMember | null>
    findById: (memberId: string) => Promise<WorkspaceMember | null>
    updateRole: (memberId: string, role: Exclude<WorkspaceRole, 'owner'>) => Promise<void>
    remove: (memberId: string) => Promise<void>
  }
  invite: {
    findPendingByWorkspace: (workspaceId: string) => Promise<WorkspaceInvite[]>
    findById: (inviteId: string) => Promise<WorkspaceInvite | null>
    create: (invite: WorkspaceInvite) => Promise<void>
    revoke: (inviteId: string) => Promise<void>
    findPendingByWorkspaceAndEmail: (
      workspaceId: string,
      email: string
    ) => Promise<WorkspaceInvite | null>
  }
}

const ROLE_RANK: Record<WorkspaceRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
}

const PERMISSIONS: Record<WorkspaceAction, WorkspaceRole> = {
  'workspace:view': 'viewer',
  'workspace:invite': 'admin',
  'workspace:settings': 'admin',
  'workspace:billing': 'owner',
  'workspace:delete': 'owner',
  'member:view': 'viewer',
  'member:remove': 'admin',
  'member:change_role': 'admin',
}

export function canDo(role: WorkspaceRole, action: WorkspaceAction): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[PERMISSIONS[action]]
}

export class TeaspaceError extends Error {
  code: string
  status: number

  constructor(message: string, code = 'BAD_REQUEST', status = 400) {
    super(message)
    this.name = 'TeaspaceError'
    this.code = code
    this.status = status
  }
}

function assert(condition: unknown, message: string, code?: string, status?: number): asserts condition {
  if (!condition) throw new TeaspaceError(message, code, status)
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function createToken(): string {
  return crypto.randomUUID()
}

function futureIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * FILL THIS:
 * Return your DB adapter implementation.
 *
 * Example sources:
 * - Prisma
 * - Drizzle
 * - Supabase server client
 * - custom repository layer
 */
async function getDb(): Promise<DbAdapter> {
  throw new Error(
    'Implement getDb() in teaspace-backend.ts with your database adapter.'
  )
}

/**
 * FILL THIS:
 * Return the currently authenticated user.
 *
 * Example:
 * - NextAuth session user
 * - Supabase auth user
 * - Clerk user
 * - custom JWT session
 */
async function getCurrentUser(): Promise<CurrentUser | null> {
  throw new Error(
    'Implement getCurrentUser() in teaspace-backend.ts with your auth/session provider.'
  )
}

/**
 * OPTIONAL:
 * Replace with your own transactional email integration.
 * If you use Supabase Auth Admin invite or another provider, trigger it here.
 */
async function sendWorkspaceInviteEmail(input: {
  email: string
  workspaceName: string
  token: string
  role: Exclude<WorkspaceRole, 'owner'>
}) {
  void input
}

async function requireUser() {
  const user = await getCurrentUser()
  assert(user, 'Authentication required', 'UNAUTHORIZED', 401)
  return user
}

async function requireWorkspace(workspaceId: string) {
  const db = await getDb()
  const workspace = await db.workspace.findById(workspaceId)
  assert(workspace, 'Workspace not found', 'NOT_FOUND', 404)
  return { db, workspace }
}

async function requireMembership(
  workspaceId: string,
  action: WorkspaceAction
): Promise<{
  db: DbAdapter
  workspace: Workspace
  user: CurrentUser
  membership: WorkspaceMember
}> {
  const user = await requireUser()
  const { db, workspace } = await requireWorkspace(workspaceId)

  const membership = await db.member.findByWorkspaceAndUser(workspaceId, user.id)
  assert(membership, 'You do not have access to this workspace', 'FORBIDDEN', 403)
  assert(canDo(membership.role, action), 'Insufficient permissions', 'FORBIDDEN', 403)

  return { db, workspace, user, membership }
}

export async function getWorkspaceBundle(workspaceId: string) {
  const { db, workspace } = await requireWorkspace(workspaceId)
  const user = await requireUser()

  const membership = await db.member.findByWorkspaceAndUser(workspaceId, user.id)
  assert(membership, 'You do not have access to this workspace', 'FORBIDDEN', 403)

  const [members, invites] = await Promise.all([
    db.member.findManyByWorkspace(workspaceId),
    canDo(membership.role, 'member:view')
      ? db.invite.findPendingByWorkspace(workspaceId)
      : Promise.resolve([]),
  ])

  return {
    workspace,
    currentUserId: user.id,
    currentUserRole: membership.role,
    members,
    invites,
  }
}

export async function getWorkspace(workspaceId: string) {
  const { workspace } = await requireMembership(workspaceId, 'workspace:view')
  return workspace
}

export async function getWorkspaceMembers(workspaceId: string) {
  const { db } = await requireMembership(workspaceId, 'member:view')
  return db.member.findManyByWorkspace(workspaceId)
}

export async function getPendingInvites(workspaceId: string) {
  const { db } = await requireMembership(workspaceId, 'workspace:invite')
  return db.invite.findPendingByWorkspace(workspaceId)
}

export async function inviteMember(input: {
  workspaceId: string
  email: string
  role: Exclude<WorkspaceRole, 'owner'>
}) {
  const { workspaceId, role } = input
  const email = normalizeEmail(input.email)

  assert(email, 'Email is required', 'VALIDATION_ERROR', 422)
  // role type excludes 'owner' already; no runtime check needed

  const { db, workspace, user, membership } = await requireMembership(
    workspaceId,
    'workspace:invite'
  )

  assert(
    membership.role === 'owner' || membership.role === 'admin',
    'Only admins or owners can invite members',
    'FORBIDDEN',
    403
  )

  const existingInvite = await db.invite.findPendingByWorkspaceAndEmail(workspaceId, email)
  assert(!existingInvite, 'An invite already exists for this email', 'CONFLICT', 409)

  const members = await db.member.findManyByWorkspace(workspaceId)
  const alreadyMember = members.some(
    (member) => normalizeEmail(member.email) === email
  )
  assert(!alreadyMember, 'This user is already a member', 'CONFLICT', 409)

  const invite: WorkspaceInvite = {
    id: crypto.randomUUID(),
    workspace_id: workspaceId,
    email,
    role,
    token: createToken(),
    invited_by: user.id,
    accepted_at: null,
    expires_at: futureIso(7),
    created_at: new Date().toISOString(),
  }

  await db.invite.create(invite)

  await sendWorkspaceInviteEmail({
    email,
    workspaceName: workspace.name,
    token: invite.token,
    role,
  })

  return {
    ok: true,
    invite,
  }
}

export async function revokeInvite(input: {
  workspaceId: string
  inviteId: string
}) {
  const { workspaceId, inviteId } = input
  const { db } = await requireMembership(workspaceId, 'workspace:invite')

  const invite = await db.invite.findById(inviteId)
  assert(invite, 'Invite not found', 'NOT_FOUND', 404)
  assert(invite.workspace_id === workspaceId, 'Invite does not belong to this workspace', 'FORBIDDEN', 403)
  assert(!invite.accepted_at, 'Accepted invites cannot be revoked', 'CONFLICT', 409)

  await db.invite.revoke(inviteId)

  return { ok: true }
}

export async function updateMemberRole(input: {
  workspaceId: string
  memberId: string
  role: Exclude<WorkspaceRole, 'owner'>
}) {
  const { workspaceId, memberId, role } = input
  const { db, membership, workspace } = await requireMembership(
    workspaceId,
    'member:change_role'
  )

  const target = await db.member.findById(memberId)
  assert(target, 'Member not found', 'NOT_FOUND', 404)
  assert(target.workspace_id === workspaceId, 'Member does not belong to this workspace', 'FORBIDDEN', 403)

  assert(target.role !== 'owner', 'Owner role cannot be changed', 'CONFLICT', 409)
  assert(target.user_id !== membership.user_id, 'You cannot change your own role', 'CONFLICT', 409)

  if (membership.role === 'admin') {
    assert(
      ROLE_RANK[target.role] < ROLE_RANK.admin,
      'Admins cannot modify admins or owners',
      'FORBIDDEN',
      403
    )
    assert(role !== 'admin', 'Admins cannot promote users to admin', 'FORBIDDEN', 403)
  }

  assert(workspace.owner_id !== target.user_id, 'Workspace owner cannot be modified', 'CONFLICT', 409)

  await db.member.updateRole(memberId, role)

  return { ok: true }
}

export async function removeMember(input: {
  workspaceId: string
  memberId: string
}) {
  const { workspaceId, memberId } = input
  const { db, membership, workspace } = await requireMembership(
    workspaceId,
    'member:remove'
  )

  const target = await db.member.findById(memberId)
  assert(target, 'Member not found', 'NOT_FOUND', 404)
  assert(target.workspace_id === workspaceId, 'Member does not belong to this workspace', 'FORBIDDEN', 403)

  assert(target.user_id !== membership.user_id, 'You cannot remove yourself', 'CONFLICT', 409)
  assert(target.user_id !== workspace.owner_id, 'Workspace owner cannot be removed', 'CONFLICT', 409)

  if (membership.role === 'admin') {
    assert(
      ROLE_RANK[target.role] < ROLE_RANK.admin,
      'Admins cannot remove admins or owners',
      'FORBIDDEN',
      403
    )
  }

  await db.member.remove(memberId)

  if (db.workspace.updateMemberCount) {
    await db.workspace.updateMemberCount(workspaceId)
  }

  return { ok: true }
}

/**
 * Optional helper for public invite acceptance flows.
 * The integrator can attach their own "create membership / claim account" logic here.
 */
export async function getInviteByTokenForAcceptFlow(
  workspaceId: string,
  token: string
) {
  const db = await getDb()
  const invites = await db.invite.findPendingByWorkspace(workspaceId)

  const invite = invites.find(
    (item) => item.token === token && !item.accepted_at
  )

  assert(invite, 'Invite not found or expired', 'NOT_FOUND', 404)
  assert(
    new Date(invite.expires_at).getTime() > Date.now(),
    'Invite has expired',
    'GONE',
    410
  )

  return invite
}