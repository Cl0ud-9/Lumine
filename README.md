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
- 🎨 **Premium Aesthetic** - Glassmorphism, pastel gradients, and "bubbly" animations.
- 🔄 **Interactive Parallax** - Floating UI elements that react to mouse movement and tilt.
- 🎵 **Music & Audio** - Romantic background music starts on the celebration page, with a mute/unmute button. Some browsers block autoplay; if that happens the button shows as muted and one tap starts the music. The clip plays once (it does not loop).
- 🖱️ **Custom Cursor** - A heart cursor with a glowing trail on desktop (hidden on touch devices and simplified when "reduce motion" is on).
- 🔐 **Secure Authentication** - User accounts managed via Supabase Auth, with email confirmation on signup.
- 🗑️ **Account Management** - Users can permanently delete their account directly from the Dashboard.
- 📱 **Fully Responsive** - Flawless experience on mobile and desktop.
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
│   ├── lib/                     # Supabase client, logger & validation helpers
│   ├── assets/                  # Cursor images
│   ├── email_templates/         # HTML templates for system emails
│   └── index.css                # Global styles & Tailwind directives
│
├── public/                      # Static assets (favicon, background music in audio/)
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
