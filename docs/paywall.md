# Paywall manual testing

Use unauthenticated, manually granted Premium, and manually granted Pro test
accounts. Grant and revoke examples are in `docs/entitlements.md`.

## Unauthenticated or Free

- `/predictions` shows performance cards before upcoming predictions.
- Exactly one upcoming prediction exposes full details; all remaining rows mask
  the lean, probability, confidence, edge, explanation, and archetype matchup.
- `/pitchers` shows education, a link to the free Archetype Library, and a
  locked Explorer card.
- `/pitchers/archetypes` and its detail routes remain visible.
- `/matchups` shows the default PIT / Paul Skenes / CHC preview when that data
  is available. Selectors remain visible, but Update Matchup is disabled.
- Supplying custom matchup query parameters still renders the default preview.
- `/scouting-report` remains visible, but export generation and copy controls
  are replaced by a Pro lock card.

## Premium

- `/predictions` exposes all prediction details.
- `/pitchers` exposes the complete Explorer, filters, table, and pitcher links.
- `/matchups` enables Update Matchup and applies custom selections.
- `/scouting-report` export remains locked.

## Pro

- All Premium behavior works.
- `/scouting-report` shows Generate Report and all three copy controls.

All locked CTAs must link to `/contact`; no CTA should link to Stripe.
