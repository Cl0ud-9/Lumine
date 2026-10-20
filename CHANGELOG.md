# Changelog

What changed in each version of Lumine. To take a new version into your own copy, pull it in and, if the notes say
so, re-run `supabase_upgrade.sql` in your Supabase SQL editor (it is safe to run more than once).

The format follows [Keep a Changelog](https://keepachangelog.com), and the versions follow
[Semantic Versioning](https://semver.org).

## [1.0.0] - 2026-10-20

The first tagged version.

### The proposal

- An interactive "Will you be my Valentine?" page. The **No** button jumps to a new spot on every click, shrinks the
  more it is pressed, and can never land on top of **Yes**. A **Yes** tapped within a moment of a **No** is ignored, so
  mashing No on a phone cannot answer by accident.
- A celebration page with confetti, music (with a mute button) and a heart you can press and hold.
- A heart cursor that turns into a pointing glove over buttons, aligned to the real click point, with a short trail.
  Off on touch devices and simplified when the reader asked for reduced motion.

### The dashboard

- Create links and watch real-time stats: when a link was opened, every visit, "No" clicks and the time to "Yes".
- Accounts with email confirmation and password reset, and a real **Delete account** that removes the auth user too
  (`delete_my_account()`).
- Each link keeps its newest 200 visit timestamps and 50 "Yes" timestamps (`append_capped()`); the Visits counter is
  always the exact total, and the dashboard says when the list was trimmed.

### Speed and reach

- Works from 320 px phones to 1920 px desktops, portrait and landscape, with no sideways scrolling and a compact
  layout for short screens.
- Lighthouse 97-100 on desktop and 92-98 on a throttled mobile profile, a steady 60 fps, and zero axe-core violations
  on every page and dialog.
- The icon font went from 480 KB to 6 KB (only the glyphs in use), fonts are self-hosted, the recipient's page no
  longer loads the Supabase client, and Framer Motion loads lazily.

### Running it

- A free Supabase project plus a Vercel deployment. A daily cron (`/api/keepalive`) keeps the free Supabase plan from
  pausing the project.
- `supabase_upgrade.sql` brings an existing database up to date without touching its data.
- `npm run icons` regenerates the icon font, and `npm run lint` fails if the code uses an icon that is not in it.
