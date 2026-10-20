## What this changes

<!-- A sentence or two: what was wrong or missing, and what you did about it. Link the issue it follows from. -->

## Pictures

<!-- For anything visual, before and after, on a phone and on desktop. -->

## Checklist

- [ ] `npm run lint` and `npm run build` pass
- [ ] Checked at 320 px, on a landscape phone and on a wide desktop: no sideways scrolling, nothing important cut off
- [ ] Accessible: labels, visible focus, contrast of at least 4.5:1, tap targets of at least 24 px, decorative icons `aria-hidden`
- [ ] Animations use `m.*` (not `motion.*`); the recipient's page does not import `@supabase/supabase-js`
- [ ] New icons: I ran `npm run icons` and committed the result
- [ ] Database changes are in both `supabase_schema.sql` and `supabase_upgrade.sql`, and the upgrade is safe to re-run
- [ ] I have the right to submit this, and I agree to clause 8 of the [license](../LICENSE)
