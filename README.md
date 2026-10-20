# 💝 Lumine - Digital Proposal Experience

An interactive, premium web application designed to create unforgettable "Will you be my Valentine?" moments. 

Built with **React**, **Framer Motion**, and **Supabase**, Lumine combines playful animations with real-time tracking to help you pop the question in style.

[![License: MIT](https://img.shields.io/badge/License-MIT-pink.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green.svg)](https://supabase.com/)

---

## 🎥 What This Does

Lumine allows users to generate personalized proposal links that initiate a playful and romantic flow:

```text
💌 Create Link → 🔗 Send to Partner → 💖 Interactive Proposal → 🥂 Celebration & Stats
```

**For the Sender:** A dashboard to create links and track real-time stats (views, "No" clicks, time to "Yes").  
**For the Recipient:** A beautiful, animated experience where the "No" button jumps to a new spot every time it is clicked (and shrinks after enough tries) until they say "Yes"!

---

## ✨ Features

- 💌 **Interactive Proposal Page** - the "No" button dodges to a new position on every click and gets smaller the more it is pressed; "Yes" triggers a celebration.
- 📊 **Real-Time Dashboard** - Track exactly when they opened it and how long it took them to say yes.
- 🎨 **Premium Aesthetic** - Frosted-glass cards, pastel gradients, and "bubbly" animations - one consistent icon set (Material Symbols) and colour theme on every page.
- 🔄 **Interactive Parallax** - Floating UI elements that react to mouse movement and tilt.
- 🎵 **Music & Audio** - Romantic background music starts on the celebration page, with a mute/unmute button. Some browsers block autoplay; if that happens the button shows as muted and one tap starts the music. The clip plays once (it does not loop).
- 🖱️ **Custom Cursor** - A heart cursor that turns into a pointing glove over buttons, with a short sparkly trail. It is aligned to the real click point, steps aside for the normal text caret over inputs, hides when the mouse leaves the window, and is off on touch devices / simplified when "reduce motion" is on.
- 🔐 **Secure Authentication** - User accounts managed via Supabase Auth, with email confirmation on signup.
- 🗑️ **Account Management** - Users can permanently delete their account directly from the Dashboard.
- 📱 **Fully Responsive** - Checked from 320px phones to 1920px desktops, in portrait and landscape: no sideways scrolling at any size, compact layouts for short (landscape) screens, and modals that scroll inside the screen instead of being clipped.
- ⚡ **Fast** - About 213KB / 277KB total for the proposal / login pages (the 480KB icon font is cut to 6KB), Lighthouse 97-100 performance on desktop and 92-97 on a throttled mobile profile, steady 60fps in testing. See [Performance](#-performance).
- ♿ **Accessible** - Zero axe-core violations across every page and dialog: contrast, landmarks, labelled controls, 24px+ tap targets, Escape closes dialogs, decorative icons hidden from screen readers.
- 💨 **Fun & Playful** - Thematic "Delete" warnings and bouncy interactions.

---

## 🧠 User Flow

```text
[User] → 📝 Dashboard (Create URL) → [Share Link] → 🌹 Partner (Interacts) → 📊 Stats Update
```

---

## 📁 Project Structure

```text
Lumine/
│
├── src/
│   ├── components/              # Reusable UI components (Modals, Cursor, etc.)
│   ├── pages/                   # Main pages (Dashboard, Proposal, Celebration, auth pages)
│   ├── context/                 # App-wide state (current proposal step)
│   ├── hooks/                   # Shared hooks (page title, floating particles, Escape key)
│   ├── lib/                     # Supabase client, lightweight public RPC helper, config, logger, validation
│   ├── assets/                  # Cursor images (heart + glove)
│   ├── email_templates/         # HTML templates for system emails
│   └── index.css                # Global styles & Tailwind directives
│
├── public/                      # Static assets: favicon, robots.txt, audio/, fonts/ (self-hosted fonts + icon subset)
├── scripts/update-icons.mjs     # Regenerates / verifies the icon-font subset (npm run icons / icons:check)
├── supabase_schema.sql          # Database schema for a NEW project
├── supabase_upgrade.sql         # Safe-to-re-run upgrade for an EXISTING project
├── vercel.json                  # Vercel routing (SPA rewrite) & cache headers
├── .env.example                 # Template for required environment variables
├── tailwind.config.js           # Tailwind CSS configuration
├── vite.config.ts               # Vite build configuration
└── README.md
```

---

## 📦 Requirements

| Requirement | Purpose |
|------------|---------|
| **Node.js 20.19+** (or 22.12+) | Runtime environment (required by Vite 7) |
| **npm / yarn** | Package manager |
| **Supabase Project** | Backend (Auth & Database) |

---

## 🛠️ Installation

### 1️⃣ Clone Repository

```bash
git clone https://github.com/Cl0ud-9/Lumine.git
```

Then open it in your code editor.

---

### 2️⃣ Install Dependencies

```bash
npm install
```

---

### 3️⃣ Configure Environment Variables

A `.env.example` file is already included in the project root. Just copy it and fill in your credentials:

```bash
cp .env.example .env
```

Then open `.env` and replace the placeholders with your actual Supabase credentials:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

You can find both values in your [Supabase Dashboard](https://supabase.com/dashboard) → **Project Settings → API**.

---

### 4️⃣ Set Up Database

**New project:** run the contents of `supabase_schema.sql` in your Supabase SQL Editor to create the
tables, policies and functions.

That includes the `delete_my_account()` function that powers **Delete Forever** on the dashboard (it
removes the auth user itself, not just their links) and adds `invites` to the `supabase_realtime`
publication so new visits and "Yes" answers show up live.

**Project you already set up earlier?** Do *not* re-run `supabase_schema.sql` (the tables already exist,
so it would error). Run `supabase_upgrade.sql` instead - it only replaces the functions and enables
realtime, never touches your data, and is safe to run more than once. Until `delete_my_account()` exists,
the dashboard falls back to deleting only the user's links before signing them out.

---

### 5️⃣ Configure Email (Auth SMTP)

Supabase's **built-in email sender is not meant for production use** - it's rate-limited to a
handful of emails per hour and sends from a shared, often spam-flagged address. Signup
confirmation and password-reset emails will be unreliable (or silently never arrive) until you
connect a real provider:

1. Sign up with an SMTP provider (e.g. [Resend](https://resend.com), [Postmark](https://postmarkapp.com), or [SendGrid](https://sendgrid.com) - all have usable free tiers).
2. In your Supabase Dashboard, go to **Project Settings → Authentication → SMTP Settings** and enable **Custom SMTP** with that provider's credentials.
3. While you're there, go to **Authentication → Email Templates** and paste in the HTML from `src/email_templates/lumine_confirm_signup.html` and `src/email_templates/lumine_password_reset.html` for the "Confirm signup" and "Reset password" templates respectively.

Skipping this step is fine for quick local testing (Supabase's default sender still works for a
couple of emails), but don't rely on it for anything you're actually sending to someone.

---

### 6️⃣ Run Locally

```bash
npm run dev
```

The app root (`/`) is the **recipient-facing proposal page** - it expects a `?token=...` query
string from a link generated in the dashboard, so opening it directly with nothing after it will
just show an "Invalid Link" screen. To actually use the app locally:

1. Visit `http://localhost:5173/auth/register` and create an account.
2. Log in, then create a proposal URL from the Dashboard.
3. Open the **generated link** (something like `http://localhost:5173/?token=...`) to see the actual proposal flow.

---

## ⚡ Performance

Measured on the production build against a local mock backend, with Lighthouse 13 (mobile = its throttled
"slow 4G + 4x CPU" profile) and a real-browser frame-pacing script:

| Page | Perf mobile | LCP mobile | Perf desktop | Accessibility | Transfer |
|------|:-----------:|:----------:|:------------:|:-------------:|:--------:|
| Login | 74 → **93** | 5.9 s → **2.9 s** | 95 → **100** | 88 → **100** | 808 KB → **277 KB** |
| Sign up | 72 → **92** | 5.9 s → **3.1 s** | 94 → **100** | 88 → **100** | 809 KB → **277 KB** |
| Proposal (what the recipient opens) | 77 → **97** | 5.2 s → **2.4 s** | 98 → **100** | 100 | 728 KB → **213 KB** |

Layout shift is 0.000 on every page. Frame rate went from 41-52 fps to a steady **60 fps** on the proposal and
celebration pages, and the Guide dialog from 26 to 60 fps.

What made the difference:

- **Icon font 480 KB → 6 KB.** Only the ~35 glyphs the app uses are shipped (see [Fonts & icons](#-fonts--icons)).
- **Self-hosted, preloaded fonts** instead of a third-party stylesheet that blocked first paint.
- **The recipient's page no longer loads the Supabase client.** It makes 3 tiny RPC calls with a plain `fetch`
  (`src/lib/publicRpc.js`); `@supabase/supabase-js` (~45 KB gzipped) only loads for login / dashboard.
- **Framer Motion loads lazily** (`<LazyMotion>` + `m.*` components) and the celebration screen is its own chunk.
- **No live backdrop blur where things move behind it.** `backdrop-filter` re-blurs everything behind an element
  on every frame it changes; on the proposal / celebration cards (hearts and confetti float behind them) and on
  the modal overlays that alone cost 10-35 fps. Those use a denser flat fill instead (`.sticker-card--flat`).
- **`dvh` units** so full-screen pages don't scroll a few pixels on phones because of the browser's address bar.

To re-measure: `npm run build && npm run preview`, then run Lighthouse from Chrome DevTools (use an
incognito window). `ANALYZE=1 npm run build` writes a bundle-size report to `stats.html`.

---

## 🔤 Fonts & icons

Everything is served from `/public/fonts` - no Google Fonts requests. The five text fonts are the Latin
subsets of Inter, Fredoka, Pacifico, Plus Jakarta Sans and Quicksand (declared in `src/index.css`).

Icons use **Material Symbols Outlined**, but only a *subset* font containing the icons the code uses. That
keeps it at ~6 KB, with one catch: **an icon that is not in the subset renders as plain text** (you would see the
word "lightbulb"). To make that impossible to forget:

```bash
npm run icons         # scan src/, download a fresh subset from Google Fonts, update the references
npm run icons:check   # fails if the code uses an icon the font doesn't contain (also part of `npm run lint`)
```

**Adding a new icon:** use it in JSX as usual (`<span className="material-symbols-outlined">rocket_launch</span>`),
run `npm run icons`, and commit the changed files in `public/fonts`, `src/index.css` and `index.html`. The font
file name contains a content hash, so browsers that cached the old font fetch the new one automatically.

---

## 🧰 Development notes

A few things that look odd but are deliberate - each one fixed a real bug:

- **Use `m.div`, not `motion.div`.** Animations are lazy-loaded through `<LazyMotion strict>`; a stray
  `motion.*` import throws in development. The feature set (`src/lib/motionFeatures.js`) is `domAnimation`;
  switch it to `domMax` if you ever add `layout` / `layoutId` / `drag`.
- **`.sticker-card--flat` must stay `transform-style: flat`.** The proposal card tilts with the mouse using
  `preserve-3d`. A `backdrop-filter` silently forces flat rendering; removing it without forcing flat made
  Chromium mis-hit-test parts of the Yes button.
- **Dialogs: panel `overflow-hidden`, content in `.modal-scroll`.** Putting `overflow-y: auto` on the panel
  itself made decorative blobs hanging past its edge produce a sideways scrollbar.
- **Short screens (landscape phones):** layouts shrink with the arbitrary variant
  `[@media(max-height:500px)]:...`, so the whole proposal fits without scrolling.
- **The "No" button** is positioned *after* its new label renders (a layout effect) and accounts for its random
  tilt, so it can never land on top of "Yes". A "Yes" click within 450 ms of a "No" is ignored, because mashing
  "No" on a phone otherwise sent stray taps to "Yes" while the button was still sliding.
---

## 🔧 Deployment

Ready to share the love with the world?

1. Build the project:
   ```bash
   npm run build
   ```
2. Deploy the `dist/` folder to your favorite host (Vercel, Netlify, etc.).
3. Ensure your production environment variables are set in your hosting dashboard.
4. In your Supabase Dashboard go to **Authentication → URL Configuration** and set **Site URL** to your
   deployed address (e.g. `https://your-app.vercel.app`), and add `https://your-app.vercel.app/**` to
   **Redirect URLs**. Without this, confirmation and password-reset emails can link back to the wrong
   address (often `localhost`).

The app is a single-page app, so every path (`/auth/verify`, `/admin/analytics`, ...) must serve
`index.html`. `vercel.json` already does this on Vercel; on Netlify or similar hosts add an equivalent
rewrite rule (e.g. a `_redirects` file containing `/* /index.html 200`), otherwise refreshing or opening
a deep link returns a 404.

---

## 🐛 Troubleshooting

| Issue | Solution |
|------|----------|
| Login fails | Check Supabase URL/Key in `.env` |
| Styles broken | Ensure Tailwind is running (`npm run dev`) |
| Icons show as words (e.g. "lightbulb") | The icon isn't in the font subset - run `npm run icons` (see [Fonts & icons](#-fonts--icons)) |
| A new `motion.div` throws "strict mode" | Use `m.div` - animations are lazy-loaded (see [Development notes](#-development-notes)) |
| Animations laggy | Enable hardware acceleration (browser settings) |
| Confirmation/reset email never arrives | Configure custom SMTP - see [step 5](#5️⃣-configure-email-auth-smtp) above. Supabase's default sender is rate-limited and unreliable. |
| Everything suddenly fails / the app can't reach the database | On Supabase's free plan a project **pauses after about a week of no activity**. Open the Supabase dashboard and click **Restore project**. To prevent it, ping the database every few days from a scheduled job, or move to a paid plan. |
| `npm install` / `npm run build` errors about the Node version | Use Node 20.19+ (or 22.12+) - see Requirements |
| "Delete Forever" removes links but the account still exists | Your database is missing `delete_my_account()` - run `supabase_upgrade.sql` (step 4) |
| App shows a blank/error page on startup | You're likely missing `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` in `.env` - the app now fails fast with a clear console error instead of silently breaking later |

---

## 📜 Acknowledgements

- [React](https://reactjs.org/)
- [Framer Motion](https://www.framer.com/motion/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/)

---

## ⚖️ License

Licensed under the **MIT License**.

---

**Made with ❤️ for the ones who ask**
