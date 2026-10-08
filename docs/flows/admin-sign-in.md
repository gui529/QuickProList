# Flow: Admin sign-in

Access to `/admin` and `/admin/campaigns` requires an authenticated user whose email exists in the `admins` table.

---

## Pages

| URL | Gate |
|-----|------|
| `/login` | Public (`app/login/page.tsx` + `LoginForm.tsx`) |
| `/admin` | `getAdminSession()` or redirect `/login?error=not_an_admin` |
| `/admin/campaigns` | Same |

---

## Steps

### 1. Open `/login`

- **Sign in with Google** → Auth.js `signIn('google', { redirectTo: '/admin' })` (`next-auth`).
- Optional **QA sign-in** when `qaLoginAllowed(host)` is true: password field → `signIn('qa', { secret, redirectTo: '/admin' })` (`lib/qa-login.ts`).

### 2. Session check

`lib/auth.ts`:

- `auth()` session must have `user.email`.
- Email must match a row in `admins` (Neon) case-insensitively.

### 3. Admin area

`app/admin/layout.tsx` renders `AdminSidebar` + child page.

Sign out: `signOut({ redirectTo: '/login' })` from `AdminClient`.

---

## API auth pattern

Routes that call `requireAdmin()` return 401/403 JSON when not signed in or not in `admins` (e.g. `POST /api/campaigns/send`, `GET /api/list-business`, curated mutations).

---

## Key files

`app/login/page.tsx`, `app/login/LoginForm.tsx`, `lib/auth.ts`, `lib/auth-config.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/admin/page.tsx`.
