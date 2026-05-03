# Admin Backend README

This backend is designed as a **server-only** data access and admin action layer for a Next.js App Router project. The module uses the `'use server'` directive so every exported function runs on the server, which is the correct place for sensitive operations like admin checks, database writes, and privileged Supabase access. [web:146]

## What this backend does

It provides reusable logic for:

- dashboard metrics,
- revenue and signup reports,
- user search and pagination,
- role updates,
- banning users,
- purchase lookup,
- affiliate reporting,
- feature flag management,
- CSV export.

It is meant to be imported by your admin pages, server actions, or route handlers, while the UI stays focused on rendering and form handling. [web:146]

## Before you start

Make sure your app has these environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The service role key must stay server-side only because it bypasses RLS and grants elevated access. [web:137]

## Install requirements

If you are generating typed Supabase queries, keep the generated `database.types.ts` file in sync with your schema. Supabase supports generating these types from the dashboard or CLI, which helps keep your backend strongly typed. [web:127]

Example CLI flow:

```bash
npx supabase login
npx supabase init
npx supabase gen types typescript --project-id "$PROJECT_REF" --schema public > database.types.ts
```

## File placement

Place the backend in a server-only folder, for example:

```txt
src/lib/admin-backend.ts
```

Do not import this file into client components. In Next.js, server functions can be shared by server and client components only through safe server action patterns, but the privileged logic itself must stay on the server. [web:146]

## How to use it

### 1. Import the functions

Use only the functions you need in your admin pages or server actions.

```ts
import {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUserRole,
  banUser,
  getUserPurchases,
  searchUsers,
  getAffiliateLeaderboard,
  getAffiliateEarningsDetail,
  getAllFeatureFlags,
  getFeatureFlag,
  setFeatureFlag,
  deleteFeatureFlag,
  getAllUserEmails,
  getRecentActivity,
  exportPurchasesCSV,
  hasAdminAccess,
  hasSuperAdminAccess,
  requireAdmin,
  requireSuperAdmin,
} from '@/lib/admin-backend'
```

### 2. Protect routes with auth

Always validate the session before calling privileged functions. The helper guards are already included, so you should call `requireAdmin()` or `requireSuperAdmin()` at the top of protected server actions or route handlers. Next.js recommends validating authentication and authorization on the server before performing sensitive operations. [web:146]

```ts
export async function adminPageAction(session: AdminSession) {
  requireAdmin(session)
  return getDashboardStats()
}
```

### 3. Call data functions from server code

Example dashboard loader:

```ts
export async function loadAdminDashboard() {
  const stats = await getDashboardStats()
  const users = await getAllUsers({ page: 1, pageSize: 25 })
  const revenue = await getRevenueByMonth(6)

  return {
    stats,
    users,
    revenue,
  }
}
```

## Function guide

### Dashboard and analytics

- `getDashboardStats()` returns the main KPIs for the admin dashboard.
- `getRevenueByMonth(months)` loads monthly revenue and purchase counts.
- `getSignupsByDay(days)` loads daily signups.
- `getBlockStats()` summarizes purchases by block.
- `getRecentActivity(limit)` combines recent purchases and signups into one feed.

Use these functions for overview cards, charts, and activity panels.

### Users

- `getAllUsers({ page, pageSize, search, role })` returns a paginated user list.
- `getUserById(userId)` returns one user profile.
- `searchUsers(query, limit)` returns lightweight search results for autocomplete.
- `updateUserRole(userId, role)` updates a user role.
- `banUser(userId)` changes the user to `banned`.
- `getUserPurchases(userId)` returns a user’s purchase history.
- `getAllUserEmails({ proOnly })` returns a list of emails for campaigns or exports.

### Affiliates

- `getAffiliateLeaderboard(limit)` returns top affiliate earners.
- `getAffiliateEarningsDetail(affiliateUserId)` returns detailed earnings rows.

Use these for affiliate dashboards, payout review, and operational reporting.

### Feature flags

- `getAllFeatureFlags()` returns every flag.
- `getFeatureFlag(key)` resolves whether a flag is enabled.
- `setFeatureFlag(key, enabled, opts)` creates or updates a flag.
- `deleteFeatureFlag(key)` removes a flag.

This is useful for gradual rollouts and admin-controlled feature toggles.

### Export

- `exportPurchasesCSV()` returns a CSV string.

Use it to generate downloads or administrative reports.

## Example usage patterns

### Dashboard page

```ts
export default async function AdminDashboardPage() {
  const stats = await getDashboardStats()
  const users = await getAllUsers({ page: 1, pageSize: 25 })

  return { stats, users }
}
```

### User detail page

```ts
export default async function UserPage({ userId }: { userId: string }) {
  const user = await getUserById(userId)
  const purchases = await getUserPurchases(userId)

  return { user, purchases }
}
```

### Role change action

```ts
export async function changeRole(session: AdminSession, userId: string, role: UserRole) {
  requireSuperAdmin(session)
  await updateUserRole(userId, role)
}
```

### Feature flag action

```ts
export async function toggleFlag(session: AdminSession, key: string, enabled: boolean) {
  requireAdmin(session)
  await setFeatureFlag(key, enabled, { rolloutPct: enabled ? 100 : 0 })
}
```

## Database requirements

Your database must provide the following tables or equivalents:

- `profiles`
- `purchases`
- `feature_flags`
- `affiliate_earnings`

Your app must also provide these RPCs if you use the report helpers:

- `revenue_by_month`
- `signups_by_day`

If your schema differs, keep the backend file unchanged and adapt the table names inside a future adapter layer or replace the direct queries in one place.

## Security notes

- Keep `SUPABASE_SERVICE_ROLE_KEY` only on the server. [web:137]
- Never expose the service role key to browser code. [web:137]
- Keep admin mutations behind server actions or route handlers. [web:146]
- Validate user role before performing writes. [web:146]
- Only return data the UI actually needs. [web:146]

## Generated types

If you want stronger type safety, generate `database.types.ts` from your Supabase schema and use it in your local client or adapter code. Supabase supports generating and using schema-derived types for tables, inserts, updates, and joins. [web:127]

## Troubleshooting

### Missing environment variable

If the app throws a missing env var error, confirm both required variables are set in your deployment environment.

### Permission errors

If the action fails with admin errors, confirm the session object contains a valid user id and a valid role.

### Empty tables or reports

If dashboard values are all zero, confirm your Supabase tables have matching columns and your RPC functions return the expected shapes.

### CSV export issues

If the CSV contains unexpected values, verify the `purchases` table includes the fields used in the exporter and that the `profiles` relation is available.

## Recommended workflow

1. Generate Supabase types.
2. Copy the backend file into your app.
3. Connect it to your auth/session source.
4. Verify the `profiles`, `purchases`, `feature_flags`, and affiliate tables.
5. Wire the functions into your admin pages.
6. Add server-side guards for every mutation.
7. Test the admin, super admin, and banned flows.

## Deployment checklist

- Server environment variables set.
- Supabase service role key not exposed to client code.
- DB tables and RPCs exist.
- Admin guards applied.
- CSV export tested.
- Role changes and bans tested.
- Feature flag writes tested.
- Pagination and search verified.

This backend is ready for teams that want a clean admin service layer without rewriting business logic for each page. [web:146][web:127]