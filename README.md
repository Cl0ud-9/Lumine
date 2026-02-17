# 💝 Lumine - Digital Proposal Experience

An interactive, premium web application designed to create unforgettable "Will you be my Valentine?" moments. 

Built with **React**, **Framer Motion**, and **Supabase**, Lumine combines playful animations with real-time tracking to help you pop the question in style.

[![License: MIT](https://img.shields.io/badge/License-MIT-pink.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.0+-blue.svg)](https://reactjs.org/)
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
- 🔐 **Secure Authentication** - User accounts managed via Supabase Auth.
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
rom_site/
│
├── src/
│   ├── components/              # Reusable UI components (Modals, Cursor, etc.)
│   ├── pages/                   # Main pages (Dashboard, Proposal, Login)
│   ├── api/                     # Supabase client and API logic
│   ├── email_templates/         # HTML templates for system emails
│   └── index.css                # Global styles & Tailwind directives
│
├── public/                      # Static assets
├── supabase_schema.sql          # Database schema definitions
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
git clone https://github.com/yourusername/lumine.git
```

Then open it in your code editor.

---

### 2️⃣ Install Dependencies

```bash
npm install
```

---

### 3️⃣ Configure Environment Variables

Create a `.env` file in the root directory and add your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

---

### 4️⃣ Set Up Database

Run the contents of `supabase_schema.sql` in your Supabase SQL Editor to set up the necessary tables and policies.

---

### 5️⃣ Run Locally

```bash
npm run dev
```

Visit `http://localhost:5173` to see the app in action!

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

**Made with ❤️ for the ones who ask.**
