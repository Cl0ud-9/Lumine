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
**For the Recipient:** A beautiful, animated experience with a "No" button that playfully runs away until they say "Yes"!

---

## ✨ Features

- 💌 **Interactive Proposal Page** - "No" button evades the cursor; "Yes" triggers a celebration.
- 📊 **Real-Time Dashboard** - Track exactly when they opened it and how long it took them to say yes.
- 🎨 **Premium Aesthetic** - Glassmorphism, pastel gradients, and "bubbly" animations.
- 🔄 **Interactive Parallax** - Floating UI elements that react to mouse movement and tilt.
- 🎵 **Music & Audio** - Automatic romantic background music with dedicated mute/unmute controls.
- 🖱️ **Custom Cursor** - A sparkly, animated custom cursor that enhances the immersive feel.
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
│   ├── pages/                   # Main pages (Dashboard, Proposal, Login)
│   ├── lib/                     # Supabase client & shared utilities
│   ├── assets/                  # Images, audio, and cursor assets
│   ├── email_templates/         # HTML templates for system emails
│   └── index.css                # Global styles & Tailwind directives
│
├── public/                      # Static assets
├── supabase_schema.sql          # Database schema definitions
├── .env.example                 # Template for required environment variables
├── tailwind.config.js           # Tailwind CSS configuration
├── vite.config.ts               # Vite build configuration
└── README.md
```

---

## 📦 Requirements

| Requirement | Purpose |
|------------|---------|
| **Node.js 18+** | Runtime environment |
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

Run the contents of `supabase_schema.sql` in your Supabase SQL Editor to set up the necessary tables and policies.

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

---

## 🐛 Troubleshooting

| Issue | Solution |
|------|----------|
| Login fails | Check Supabase URL/Key in `.env` |
| Styles broken | Ensure Tailwind is running (`npm run dev`) |
| Animations laggy | Enable hardware acceleration (browser settings) |
| Confirmation/reset email never arrives | Configure custom SMTP - see [step 5](#5️⃣-configure-email-auth-smtp) above. Supabase's default sender is rate-limited and unreliable. |
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
