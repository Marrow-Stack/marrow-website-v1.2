# MarrowStack Auth Block

A hardened authentication backend for Next.js 14+, NextAuth.js v4, Supabase, bcryptjs, and Zod. It is designed to be copied into a project, wired to your database and session layer, and shipped as a secure server-only auth module [web:163][web:186].

## Overview

This block handles email/password registration, login, email verification, password reset, password change, OAuth sign-in, role-based access control, auth event logging, and account lockout. The architecture keeps sensitive operations on the server, which matches Next.js server-side auth guidance and Supabase server-side auth patterns [web:146][web:152][web:177].

## What you get

- Credentials login with bcrypt password checks.
- GitHub and Google OAuth providers.
- Email verification with expiring tokens.
- Password reset with expiring tokens.
- Password change for signed-in users.
- Profile read/update/delete helpers.
- Role helpers for `user`, `admin`, and `super_admin`.
- Auth event audit logging.
- Login lockout after repeated failures.
- Safe server-side Supabase service-role access [web:171][web:137].

## File placement

Place the backend in a server-only file such as `src/lib/auth.ts` or `src/server/auth/index.ts`. The module should not be imported into client components because it relies on privileged secrets and server-only session logic [web:146][web:137].

## Environment variables

Set these before using the module:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_SECRET=your_nextauth_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

The service role key must remain server-only because it bypasses row-level security and can perform elevated database actions [web:137][web:152].

## Database requirements

The module expects a `profiles` table with fields for:

- identity and contact data,
- password hash,
- provider IDs,
- role,
- verification tokens,
- reset tokens,
- failed login attempts,
- lockout time,
- sign-in counters,
- timestamps.

It also expects an `auth_events` table for audit logging. Supabase’s Next.js guidance and auth docs support this style of server-side account management and profile storage [web:163][web:186].

## How to use it

### NextAuth route

```ts
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
```

### Protected server action

```ts
'use server'

import { getServerSession } from 'next-auth'
import { authOptions, requireAdmin, getDashboardStats } from '@/lib/auth'

export async function loadAdminStats() {
  const session = await getServerSession(authOptions)
  requireAdmin(session)
  return getDashboardStats()
}
```

### Role-protected route

```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, requireSuperAdmin, updateUserRole } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  requireSuperAdmin(session)

  const { userId, role } = await req.json()
  await updateUserRole(userId, role)

  return NextResponse.json({ ok: true })
}
```

## Auth flow

### Registration

Use `registerUser()` to create a new account. It validates input, hashes the password, generates a verification token, and creates the profile record.

### Email verification

Use `verifyEmail(token)` to activate an account after the user confirms their email.

### Login

The Credentials provider checks the password with bcrypt, blocks locked accounts, increments failed attempts on bad passwords, and updates sign-in counters on success.

### Password reset

Use `requestPasswordReset(email)` to create a reset token, then `resetPassword(token, newPassword)` to finalize the password change.

### Change password

Use `changePassword(userId, currentPassword, newPassword)` for authenticated users who want to update their existing password.

## Role model

The block supports:

- `user`
- `admin`
- `super_admin`

The helpers `hasRole`, `requireRole`, `requireAdmin`, and `requireSuperAdmin` are included so you can guard dashboard pages, moderation tools, and billing screens cleanly.

## Security behavior

This backend is built around server-side trust boundaries. That means:

- the service role key stays on the server,
- role checks happen before mutations,
- lockout protects against brute-force attacks,
- verification and reset tokens expire,
- and auth events are recorded for auditing [web:171][web:164][web:177].

Supabase also documents rate limits for auth flows, so you should still add your own request throttling around sign-up, sign-in, and password reset endpoints for better abuse resistance [web:171].

## Recommended structure

A good production structure looks like this:

```txt
src/
  lib/
    auth.ts
  app/
    api/
      auth/
        [...nextauth]/
          route.ts
    auth/
      signin/
      signup/
      reset/
```

This keeps the backend reusable while letting each app define its own UI and route structure.

## Integration notes

If you use Supabase types, generate and keep your database types in sync with your schema. Typed schema access makes the backend safer and easier to maintain over time [web:127][web:163].

For Next.js, keep auth and mutation logic on the server. That aligns with the framework’s recommended authentication model and reduces the chance of leaking privileged logic to the client [web:146][web:177].

## Troubleshooting

### Missing environment variable
Confirm all required env vars are present in your local and production environments.

### Login always fails
Check that `password_hash` exists and that the password was hashed with bcrypt when the user was created.

### OAuth users are not linking
Make sure GitHub and Google provider settings are correct and the email is available from the provider response.

### Verification tokens expire too soon
Adjust the token lifetime constants in the backend if your product needs a longer verification window.

### Admin actions fail
Verify the session contains `session.user.id` and `session.user.role`, and confirm the role is `admin` or `super_admin`.

## Copy-paste checklist

Before shipping, verify:

- server-only file placement,
- env vars set,
- `profiles` table created,
- `auth_events` table created,
- RLS policies configured,
- lockout trigger enabled,
- NextAuth route wired,
- OAuth credentials configured,
- password reset flow tested,
- auth event logging working.

## Final note

This auth block is intended to be copied, wired, and shipped without needing to rewrite the underlying rules. It follows the server-first auth approach recommended for modern Next.js and Supabase applications [web:146][web:163][web:186].