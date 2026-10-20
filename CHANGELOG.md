# Changelog

What changed in each version of Lumine. To take a new version into your own copy, pull it in and, if the notes say
so, re-run `supabase_upgrade.sql` in your Supabase SQL editor (it is safe to run more than once).

The format follows [Keep a Changelog](https://keepachangelog.com), and the versions follow
[Semantic Versioning](https://semver.org).

## [Unreleased]

## [1.2.0] - 2026-10-21

*Faster, safer, smoother.* ([release](https://github.com/Cl0ud-9/Lumine/releases/tag/v1.2.0))

**Upgrading:** pull the new version, then re-run `supabase_upgrade.sql` once in your Supabase SQL editor (it is safe to
repeat and never touches your data). Without it everything keeps working, but Delete account only removes links and
visit history is not capped.

### The proposal

- The **No** button now slides to its new spot (the first jump used to teleport), and the **Yes** button glides to the
  centre when No leaves. No can no longer land on top of Yes, which it did in about 1 in 30 placements.
- A **Yes** tapped within a moment of a **No** is ignored, so mashing No on a phone cannot answer by accident.
- The cursor is aligned to the real click point (the heart was about 20 px off), turns into a pointing glove over
  buttons, keeps a short trail that can no longer streak across the screen, steps aside for the text caret over
  inputs, and hides when the mouse leaves the window.
- Short (landscape) screens get a compact layout, and titles shrink on very narrow phones.

### The dashboard

- **Delete account** now removes the auth user too (`delete_my_account()`), not only the links.
- Each link keeps its newest 200 visit timestamps and 50 "Yes" timestamps (`append_capped()`); the Visits counter is
  always the exact total, and the dashboard says when the list was trimmed.
- Dialogs scroll inside the screen; the Guide dialog no longer scrolls sideways. Escape closes dialogs.

### Speed, reach and accessibility

- Lighthouse 97-100 on desktop and 92-98 on a throttled mobile profile, a steady 60 fps, and zero axe-core violations
  on every page and dialog. No sideways scrolling from 320 px to 1920 px.
- The icon font went from 480 KB to 6 KB (only the glyphs in use), fonts are self-hosted, the recipient's page no
  longer loads the Supabase client, and Framer Motion loads lazily.
- Emoji headings were replaced with the app's own icons; contrast, landmarks, tap targets and screen-reader labels fixed.

### Running it

- A daily cron (`/api/keepalive`) keeps the free Supabase plan from pausing the project.
- `supabase_upgrade.sql` brings an existing database up to date without touching its data.
- `npm run icons` regenerates the icon font, and `npm run lint` fails if the code uses an icon that is not in it.
- Source-available `LICENSE`, `NOTICE`, contributing and security docs, issue forms and CI.

## [1.1] - 2026-02-20

*Polished & Secure.* ([release](https://github.com/Cl0ud-9/Lumine/releases/tag/v1.1))

### Auth and account

- Email confirmation on signup, so there are no more ghost accounts.
- Account deletion with a themed confirmation dialog, straight from the dashboard.

### Visuals and animations

- Custom cursor alignment fixed: the hotspot and the sparkle trail are in sync.
- The celebration burst starts from the right icon; the "Invalid Link" bounce is smoother; flickering on the
  celebration page (mute button, Yes button, heart icon) is fixed.

### Audio, tech and cleanup

- New background music on the celebration page.
- Modernised ESLint configuration, Vite 7, and a fix for 404s on client-side routes after deploying.

## [1.0.0] - 2026-02-17

*The Romantic Launch - the first release.* ([release](https://github.com/Cl0ud-9/Lumine/releases/tag/v1.0.0))

- The interactive "Will you be my Valentine?" flow with an evading **No** button and a celebration on **Yes**.
- A parallax effect, a real-time dashboard to create links and watch views and responses, background music with a
  mute button, glassmorphism styling with custom cursors, full responsiveness, and Supabase-powered accounts.

[Unreleased]: https://github.com/Cl0ud-9/Lumine/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/Cl0ud-9/Lumine/compare/v1.1...v1.2.0
[1.1]: https://github.com/Cl0ud-9/Lumine/compare/v1.0.0...v1.1
[1.0.0]: https://github.com/Cl0ud-9/Lumine/releases/tag/v1.0.0
