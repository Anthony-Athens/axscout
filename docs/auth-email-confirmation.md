# Auth Email Confirmation

AXScout uses Supabase's PKCE email confirmation flow. Signup passes
`/auth/callback` as `emailRedirectTo`. The callback exchanges the one-time code
for a cookie-backed session and redirects to the Login page with a stable
success or failure flag.

## Application behavior

- Successful exchange: `/login?confirmed=true`
- Missing or invalid code: `/login?error=auth_callback_failed`
- Signup without an immediate session: Login displays instructions to check
  email and explains that the confirmation link returns to AXScout.

The callback uses the incoming request origin for its final redirect, so local,
preview, apex-domain, and `www` traffic remain on the same origin.

## Supabase Auth configuration

Configure the Supabase project under **Authentication > URL Configuration**.

Site URL:

```text
https://www.axscout.com
```

Allowed Redirect URLs:

```text
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
https://www.axscout.com/auth/callback
https://axscout.com/auth/callback
```

Port 3001 is included because Next.js may select it when port 3000 is already
occupied.

## Environment configuration

Set the canonical production origin:

```text
NEXT_PUBLIC_SITE_URL=https://www.axscout.com
```

When `NEXT_PUBLIC_SITE_URL` is unavailable, signup falls back to `VERCEL_URL`
or the current request host and forwarded protocol. Do not set this variable to
a path; it must be an origin without `/auth/callback` appended.

## Verification

1. Sign up with a new email address.
2. Confirm that Login displays the check-email instructions.
3. Open the Supabase confirmation link.
4. Confirm the browser lands on `/login?confirmed=true` and displays the
   success alert.
5. Test an expired or altered callback code and confirm the friendly failure
   alert appears.
