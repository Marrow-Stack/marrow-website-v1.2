# Teaspace Backend README

This README explains how to use the reusable backend module for the Teaspace workspace block. The backend is designed as a server-only business logic layer for a Next.js App Router project, with authentication and database access injected by the app that uses it.[cite:132][cite:133]

## Purpose

The module gives a production-style backend surface for common workspace operations:

- Read workspace data.
- Read members and pending invites.
- Invite users.
- Revoke invites.
- Change member roles.
- Remove members.
- Enforce role-based permissions in one place.[cite:132]

This approach keeps the frontend block thin and makes the backend service the single source of truth for permissions and membership rules, which is a common server-action-oriented pattern in Next.js applications.[cite:126][cite:132]

## What is included

The backend file exposes a reusable set of functions and types:

- `getWorkspaceBundle(workspaceId)`
- `getWorkspace(workspaceId)`
- `getWorkspaceMembers(workspaceId)`
- `getPendingInvites(workspaceId)`
- `inviteMember({ workspaceId, email, role })`
- `revokeInvite({ workspaceId, inviteId })`
- `updateMemberRole({ workspaceId, memberId, role })`
- `removeMember({ workspaceId, memberId })`
- `canDo(role, action)`
- `TeaspaceError`

The module is intentionally transport-agnostic, meaning it does not force Prisma, Drizzle, Supabase, Clerk, NextAuth, or any one auth/database stack; instead, it asks the integrator to provide a database adapter and current-user resolver.[cite:127][cite:132]

## File location

Place the backend file somewhere server-only, such as:

```txt
src/lib/teaspace-backend.ts
```

Because the module is intended for server-side execution and invite/email logic should remain on the server, it should not be imported into client components directly.[cite:132][cite:133]

## Installation flow

### 1. Copy the backend file

Copy the provided backend code into:

```txt
src/lib/teaspace-backend.ts
```

Keep the `'use server'` directive at the top so the file is clearly treated as server-side logic in a Next.js App Router codebase.[cite:132]

### 2. Implement `getCurrentUser()`

This function must return the authenticated user for the current request.

Required return shape:

```ts
export type CurrentUser = {
  id: string
  email?: string | null
}
```

If there is no signed-in user, it should return `null`. The backend uses this function to block unauthorized access before workspace operations are executed.[cite:132]

Example skeleton:

```ts
async function getCurrentUser(): Promise<CurrentUser | null> {
  // Read session/cookie/token here
  // Return { id, email } for signed-in users
  // Return null if unauthenticated
  return null
}
```

### 3. Implement `getDb()`

This function must return an object matching the `DbAdapter` contract. The adapter separates storage details from business logic, which makes the backend reusable across database libraries and project templates.[cite:127][cite:132]

Required contract:

```ts
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
```

Example skeleton:

```ts
async function getDb(): Promise<DbAdapter> {
  return {
    workspace: {
      findById: async (workspaceId) => null,
      updateMemberCount: async (workspaceId) => {},
    },
    member: {
      findManyByWorkspace: async (workspaceId) => [],
      findByWorkspaceAndUser: async (workspaceId, userId) => null,
      findById: async (memberId) => null,
      updateRole: async (memberId, role) => {},
      remove: async (memberId) => {},
    },
    invite: {
      findPendingByWorkspace: async (workspaceId) => [],
      findById: async (inviteId) => null,
      create: async (invite) => {},
      revoke: async (inviteId) => {},
      findPendingByWorkspaceAndEmail: async (workspaceId, email) => null,
    },
  }
}
```

### 4. Implement optional email sending

The backend contains an optional `sendWorkspaceInviteEmail()` function. This is where invite delivery should happen if the host app wants email-based onboarding. Admin invite flows in Supabase are server-side capabilities, so email-trigger logic belongs in this layer rather than the client.[cite:133][cite:130]

Example skeleton:

```ts
async function sendWorkspaceInviteEmail(input: {
  email: string
  workspaceName: string
  token: string
  role: Exclude<WorkspaceRole, 'owner'>
}) {
  // Call Resend / Postmark / SES / Supabase admin invite here
}
```

## Data model expectations

The backend assumes three main entities:

### Workspace

```ts
export type Workspace = {
  id: string
  name: string
  slug: string
  owner_id: string
  plan: 'free' | 'pro' | 'enterprise'
  logo_url?: string | null
  settings?: Record<string, unknown> | null
  created_at: string
}
```

### WorkspaceMember

```ts
export type WorkspaceMember = {
  id: string
  workspace_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  joined_at: string
  email: string
  name?: string | null
  avatar_url?: string | null
}
```

### WorkspaceInvite

```ts
export type WorkspaceInvite = {
  id: string
  workspace_id: string
  email: string
  role: 'admin' | 'member' | 'viewer'
  token: string
  invited_by?: string | null
  accepted_at?: string | null
  expires_at: string
  created_at: string
}
```

If the consuming app uses different table or field names, the app should adapt those differences inside `getDb()` rather than rewriting the core backend logic.

## Role system

The permission model is rank-based:

| Role | Rank | Meaning |
|------|------|---------|
| `viewer` | 0 | Can access workspace data only.[cite:132] |
| `member` | 1 | Standard participant role. |
| `admin` | 2 | Can invite users and manage lower-ranked members. |
| `owner` | 3 | Full control including billing/delete level actions. |

The `canDo(role, action)` helper compares the user role against the minimum role required for each action, centralizing authorization policy in one place.[cite:132]

## Permission rules enforced by the backend

The backend enforces these rules before mutating data:

- Unauthenticated users are rejected.
- Non-members cannot access workspace data.
- Only admins and owners can invite users.
- Owner role cannot be invited.
- Duplicate pending invites are rejected.
- Existing members cannot be invited again.
- Owners cannot be demoted.
- Users cannot change their own role.
- Users cannot remove themselves.
- Admins cannot manage owners.
- Admins cannot promote someone else to admin.
- Admins cannot remove other admins.

These checks are important because production backends should treat the UI as untrusted and re-check permissions at the server boundary.[cite:126][cite:132]

## Using the backend in the Teaspace block

The intended pattern is to keep the UI block simple and pass data and handlers from the server-backed integration layer.

### Read initial data

Use `getWorkspaceBundle(workspaceId)` from a server component, route handler, or server action wrapper to fetch all data required by the block in one call.

Example:

```ts
import { getWorkspaceBundle } from '@/lib/teaspace-backend'

export async function getPageData(workspaceId: string) {
  return getWorkspaceBundle(workspaceId)
}
```

Expected return shape:

```ts
{
  workspace,
  currentUserId,
  currentUserRole,
  members,
  invites,
}
```

This is the best default read API for the block because it returns the workspace record plus current-user context and related collections in one place.

### Wire invite action

```ts
import { inviteMember } from '@/lib/teaspace-backend'

await inviteMember({
  workspaceId,
  email,
  role,
})
```

Use this when the block submits an invitation form.

### Wire revoke invite

```ts
import { revokeInvite } from '@/lib/teaspace-backend'

await revokeInvite({
  workspaceId,
  inviteId,
})
```

Use this for pending invite rows.

### Wire role update

```ts
import { updateMemberRole } from '@/lib/teaspace-backend'

await updateMemberRole({
  workspaceId,
  memberId,
  role,
})
```

Use this for role dropdown changes.

### Wire member removal

```ts
import { removeMember } from '@/lib/teaspace-backend'

await removeMember({
  workspaceId,
  memberId,
})
```

Use this for remove-member actions.

## Suggested integration architecture

A practical production setup is:

1. A server component loads `getWorkspaceBundle(workspaceId)`.
2. The Teaspace UI receives `workspace`, `members`, `invites`, `currentUserId`, and `currentUserRole` as props.
3. Client-side interactions submit to server actions or route handlers.
4. Those server endpoints call the backend functions in `teaspace-backend.ts`.
5. The page revalidates or refreshes after mutation.

This structure matches the App Router server-first model, where mutations and protected logic are handled on the server rather than exposed in the browser.[cite:132]

## Error handling

The backend throws `TeaspaceError` for business and permission failures.

Shape:

```ts
export class TeaspaceError extends Error {
  code: string
  status: number
}
```

Examples of error codes used by the module:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `VALIDATION_ERROR`
- `GONE`

Recommended usage pattern:

```ts
try {
  await inviteMember({ workspaceId, email, role })
} catch (error) {
  if (error instanceof TeaspaceError) {
    return {
      ok: false,
      code: error.code,
      message: error.message,
      status: error.status,
    }
  }

  throw error
}
```

This helps the UI show user-friendly errors while still preserving strict server-side enforcement.

## Invite acceptance flow

The module includes `getInviteByTokenForAcceptFlow(workspaceId, token)` for public invite acceptance pages.

It verifies:

- the invite exists,
- the invite belongs to the workspace,
- the invite has not been accepted,
- and the invite has not expired.

The host app should use this as a validation step before creating or linking a user account and then inserting a workspace member record.

Suggested acceptance flow:

1. User opens invite link.
2. App extracts `workspaceId` and `token`.
3. App calls `getInviteByTokenForAcceptFlow(workspaceId, token)`.
4. App authenticates or creates the user.
5. App creates a member row with the invited role.
6. App marks the invite as accepted.

## Supabase notes

If the host app uses Supabase, this backend still fits well because Supabase supports typed database integrations and server-side invite flows. Keeping the adapter and invite logic server-side also aligns with Supabase’s admin invite capabilities, which should not be exposed directly to the client.[cite:127][cite:133][cite:130]

## Security checklist

Before shipping, verify the following:

- `getCurrentUser()` cannot be spoofed by client input.
- `getDb()` only exposes server-side credentials.
- Invite tokens are generated server-side.
- Email sending happens server-side.
- UI never decides permission outcomes on its own.
- Every mutation goes through the backend module.
- Owner-protection rules are not removed.
- Self-removal and self-role-change rules match product policy.

These checks matter because server actions and protected mutations should remain authoritative on the server, even if the frontend already hides restricted controls.[cite:132][cite:133]

## Common customization points

Apps integrating this backend commonly customize:

- table names and field names inside the adapter,
- invite expiration duration,
- admin vs owner policy,
- whether admins can promote to admin,
- member count recalculation,
- audit logs,
- notification dispatch,
- organization billing hooks,
- soft-delete instead of hard delete.

The safest place for those changes is inside this backend module or the adapter layer, not directly in the UI.

## Minimal shipping checklist

To make the Teaspace backend usable in a real app, complete this checklist:

- Copy the backend file.
- Implement `getCurrentUser()`.
- Implement `getDb()`.
- Connect email sending if invite emails are required.
- Ensure the UI block calls only exported backend functions.
- Catch `TeaspaceError` and surface messages cleanly.
- Test owner, admin, member, and viewer permission paths.
- Test duplicate invite and expired invite cases.

## Recommended next step

Once this README is in place, the fastest production path is to create one concrete adapter version for the stack being used by the Teamspace block, such as Supabase or Prisma, and keep the exported business logic unchanged.[cite:127][cite:133]