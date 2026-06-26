# Authentication

AX Scout uses Supabase Auth with `@supabase/ssr` and the Next.js App Router.
The dashboard remains public; account-only data is added after the server has
verified the current user.

## Authentication flow

- `/signup` validates full name, email, and password in a Server Action and
  calls `supabase.auth.signUp()`.
- `full_name` is stored in `auth.users.raw_user_meta_data`. The existing
  `auth.users` trigger uses that metadata to create the matching `profiles`
  row.
- When email confirmation is enabled, Supabase redirects to
  `/auth/callback`. The route exchanges the PKCE code for a cookie-backed
  session and then redirects to `/dashboard`.
- `/login` validates credentials in a Server Action and calls
  `signInWithPassword()`.
- Logout calls `signOut()`, invalidates the rendered layout, and redirects to
  `/login`.

Set `NEXT_PUBLIC_SITE_URL` to the production origin in Vercel. Add both the
production callback URL and local callback URL to Supabase Auth redirect URLs:

```text
https://your-domain.example/auth/callback
http://localhost:3000/auth/callback
```

## Session management

`lib/supabase/client.ts` creates browser clients and
`lib/supabase/server.ts` creates a new cookie-aware client per server request.
Next.js 16 renamed Middleware to Proxy, so the root `proxy.ts` calls
`lib/supabase/proxy.ts` before application routes render. It verifies claims
and writes refreshed access and refresh tokens to both the request and
response cookies. Server Components and Server Actions use `getUser()` when
they need the current verified user.

## Profile creation and editing

The database trigger is responsible for inserting one `profiles` row per new
`auth.users` row. The application expects `profiles.id` to equal
`auth.users.id`, with `full_name` and nullable `username` columns. `/profile`
is server-protected and allows the owner to update those two fields. Email is
read from the verified Auth user and is not edited through the profile table.

The `profiles` table should have RLS enabled with owner-only select and update
policies based on `(select auth.uid()) = id`. Username should have a unique
constraint if usernames must be globally unique.

## Favorite team storage

`user_favorite_teams` stores the authenticated user ID and operational team
ID. The unique `(user_id, team_id)` constraint prevents duplicates. Dashboard
Server Actions verify the user, validate that the team exists, then upsert or
delete the selection. The dashboard reads selections for the verified user
and joins them to public season and rolling aggregates by team abbreviation.

The table should have RLS enabled with owner-only select, insert, and delete
policies based on `(select auth.uid()) = user_id`. The operational `teams`
table must allow authenticated users to select team IDs and display fields.
Never expose the Supabase service-role key to the browser.

## Verification checklist

1. Confirm the Auth trigger copies `raw_user_meta_data ->> 'full_name'` into
   `profiles.full_name`.
2. Confirm RLS policies allow each user to read/update only their profile and
   read/insert/delete only their favorite rows.
3. Confirm Supabase email templates link to the configured callback URL.
4. Test signup with email confirmation both enabled and disabled.
5. Test login, refresh, logout, profile editing, and favorite persistence in a
   production-preview deployment.
