# Public access verification

AXScout analytics are public. Predictions expose all details, the pitcher explorer
renders its normal filters and profiles, matchup query parameters are honored,
and scouting reports can be generated and copied without an account or tier.

The former entitlement resolver, locked components, beta access prompts, and
unused entitlement table definition have been removed. Existing deployed
`user_entitlements` tables are not queried; no live database migration is needed.

Authentication remains for account profiles, saving favorite teams, and blog
administration. Missing-data and pending-operation controls remain unchanged.

## Regression checklist

In a signed-out browser, on desktop and mobile:

- Open `/predictions` and inspect multiple rows and their explanations.
- Open `/pitchers`, apply filters, and follow a pitcher profile link.
- Open `/matchups`, change selections, and submit Update Matchup.
- Reload the resulting matchup URL and confirm selections persist.
- Open `/scouting-report`, generate a report, and copy each export format.
- Navigate through dashboard, team/player trends, pitcher map and archetypes.
- Refresh each previously restricted route and confirm no upgrade UI appears.
- Confirm `/profile` and blog administration still require authentication.

## Verified locally — 2026-09-10

- Production build, TypeScript, ESLint, and `git diff --check` passed.
- Signed-out HTTP checks returned 200 without paywall prompts for `/`,
  `/dashboard`, `/trends/team`, `/trends/individual`, `/scouting-report`,
  `/predictions`, `/matchups`, `/pitchers`, `/pitchers/694973`, `/pitchers/map`,
  `/pitchers/archetypes`, `/pitchers/archetypes/archetype-3-pitcher-archetypes-v1`,
  `/blog`, and `/contact`.
- `/betting` retains its existing 308 redirect to `/predictions`.
- `/profile` and `/blog/admin` retain their 307 redirects to `/login`.
- Browser checks showed five upcoming predictions with lean, probability,
  confidence, edge, archetype details, and explanations; refresh preserved them.
- Pitcher search for Skenes worked and survived refresh. His profile opened
  through its link and refreshed normally.
- Changing the matchup opponent to NYY updated the rendered matchup and URL;
  refresh preserved NYY instead of reverting to the old CHC-only preview.
- Scouting report generation and Markdown, HTML, and plain-text clipboard
  exports succeeded while signed out; generation remained available on refresh.
- At a 390 × 844 mobile viewport, predictions remained exposed, matchup controls
  were enabled, pitcher filtering/profile navigation worked, and Markdown export
  succeeded. The matchup layout was visually inspected. Desktop browser checks
  used the normal viewport; existing responsive classes were preserved.
- Final application/schema search found no premium, entitlement, subscription,
  upgrade, locked-state, or former feature-access checks.

## Files changed

Updated:

- `app/predictions/page.tsx`
- `app/pitchers/page.tsx`
- `app/matchups/page.tsx`
- `app/scouting-report/page.tsx`
- `app/profile/page.tsx`
- `components/MatchupControls.tsx`
- `app/contact/page.tsx`
- `app/contact/ContactForm.tsx`
- `app/api/contact/route.ts`
- `supabase/schema.sql` (only the unused entitlement table definition)
- `docs/contact-collaboration.md`
- `docs/paywall.md`

Deleted:

- `lib/access/entitlements.ts`
- `components/access/LockedFeatureCard.tsx`
- `components/access/PremiumBadge.tsx`
- `components/access/UpgradeCta.tsx`
- `docs/entitlements.md`

No live database was changed. Analytics queries, prediction models, session
refresh, profile data access, and saved-team/blog authorization were preserved.
