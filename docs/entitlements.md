# Access entitlements

AXScout stores paid and manually granted access in `public.user_entitlements`.
The table is the shared source of truth for manual beta access today and Stripe
subscription synchronization later.

## Table structure

Each row grants one `premium` or `pro` tier from one source to one Supabase Auth
user. The `(user_id, tier, source)` combination is unique. `status = 'active'`
rows count only while `expires_at` is null or in the future. Optional Stripe IDs
are reserved for later subscription synchronization. RLS allows authenticated
users to read only their own rows; writes require a trusted server/service-role
operation or direct administrative SQL.

Sources are `manual`, `stripe`, `promo`, and `internal`. Statuses are `active`,
`inactive`, `expired`, and `revoked`.

## Tier hierarchy and features

Access is cumulative: Free < Premium < Pro. Pro therefore includes every
Premium feature.

| Feature key | Required tier |
| --- | --- |
| `predictions_full` | Premium |
| `pitcher_explorer` | Premium |
| `matchups_interactive` | Premium |
| `scouting_report_export` | Pro |

Unauthenticated users and authenticated users without a current entitlement
receive Free access.

## Implemented paywall behavior

- **Predictions:** Everyone can see model performance tracking. Free users see
  one deterministic featured upcoming prediction (highest confidence, with the
  existing date/game ordering as the tie-breaker); remaining premium fields are
  locked. Premium and Pro users see every prediction and full details.
- **Pitcher Archetype Explorer:** `/pitchers` requires Premium, while the
  Archetype Library and archetype summaries under `/pitchers/archetypes` remain
  free.
- **Matchups:** Everyone can view the default matchup preview and selectors.
  Custom URL/filter updates are enforced as Premium on the server, and the
  update button is disabled for Free users.
- **Scouting Report exports:** The report page remains public. Generating and
  copying Markdown, HTML, or plain-text exports requires Pro. Export data is
  passed to the client export component only for Pro users.

Client-side scouting report export is currently backed by a server-side render
gate. Any future PDF, download, or API export endpoint must repeat the Pro check
inside its server action or route handler.

## Manual grants

Run administrative SQL in a trusted Supabase environment. Replace
`<USER_UUID>` with the user's `auth.users.id` value.

### Grant Premium

```sql
insert into public.user_entitlements (
  user_id,
  tier,
  source,
  status,
  notes
)
values (
  '<USER_UUID>',
  'premium',
  'manual',
  'active',
  'Premium beta tester'
)
on conflict (user_id, tier, source)
do update set
  status = 'active',
  expires_at = null,
  updated_at = now();
```

### Grant Pro

```sql
insert into public.user_entitlements (
  user_id,
  tier,
  source,
  status,
  notes
)
values (
  '<USER_UUID>',
  'pro',
  'manual',
  'active',
  'Pro beta tester'
)
on conflict (user_id, tier, source)
do update set
  status = 'active',
  expires_at = null,
  updated_at = now();
```

### Revoke manual access

```sql
update public.user_entitlements
set status = 'revoked',
    updated_at = now()
where user_id = '<USER_UUID>'
  and tier in ('premium', 'pro')
  and source = 'manual';
```

### Grant temporary Pro access

```sql
insert into public.user_entitlements (
  user_id,
  tier,
  source,
  status,
  expires_at,
  notes
)
values (
  '<USER_UUID>',
  'pro',
  'manual',
  'active',
  now() + interval '30 days',
  '30-day Pro beta access'
)
on conflict (user_id, tier, source)
do update set
  status = 'active',
  expires_at = now() + interval '30 days',
  updated_at = now();
```

## Future Stripe synchronization

A later Stripe webhook implementation should upsert rows with `source =
'stripe'`, save `stripe_customer_id` and `stripe_subscription_id`, and map the
subscription product/price to `premium` or `pro`. Subscription activation,
renewal, cancellation, and expiration events should update `status`,
`starts_at`, `expires_at`, and `updated_at` on that Stripe-sourced row. Manual,
promo, and internal rows must remain independent so a Stripe cancellation does
not revoke access granted by another source.

Never expose the Supabase service-role key in browser code. Stripe checkout and
webhooks are intentionally outside this foundation.
