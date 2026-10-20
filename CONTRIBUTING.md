# Contributing to Lumine

Thanks for wanting to help. Bug reports, ideas and pull requests are all welcome. Please keep to the
[code of conduct](CODE_OF_CONDUCT.md).

Lumine is source-available, not open source: see [LICENSE](LICENSE). You may fork this repository to prepare
contributions, but not to publish or share your own copies. By opening a pull request you agree to clause 8 of the
license: you have the right to submit the change, and it becomes part of Lumine under the author's terms.

## Before you start

- **Found a bug?** Search the [issues](https://github.com/Cl0ud-9/Lumine/issues) first, then open one. Include the
  page, your browser and device, and a screenshot of what you saw.
- **Have an idea?** Open an issue before writing code, so we can agree on the approach. Large changes that were not
  discussed may be closed.
- **Found a security problem?** Do not open a public issue. Report it privately: see [SECURITY.md](SECURITY.md).

## Setup

Requirements: Node 20.19 or newer (22.12+ also works) and a free [Supabase](https://supabase.com) project.

```bash
git clone https://github.com/<your-account>/Lumine.git
cd Lumine
npm install
cp .env.example .env      # then fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev               # http://localhost:5173
npm run lint              # eslint + the icon-font check
npm run build             # type-check + production build
```

Run `supabase_schema.sql` in your Supabase SQL editor first. The [README](README.md) walks
through it, including email settings.

## What a pull request needs

- `npm run lint` and `npm run build` pass. CI runs both.
- **Responsive.** Check a 320 px phone, a landscape phone and a wide desktop. No sideways scrolling at any size, and
  nothing important below the fold on a short screen (see the `[@media(max-height:500px)]` pattern in the code).
- **Accessible.** Real labels, visible focus, text contrast of at least 4.5:1, tap targets of at least 24 px, and
  decorative icons marked `aria-hidden`. Dialogs close with Escape. Run [axe](https://www.deque.com/axe/) on anything
  you touch.
- **Fast.** Keep the recipient's page light: it must not import `@supabase/supabase-js` (use `src/lib/publicRpc.js`).
  Avoid a live `backdrop-filter` over anything that animates. Run Lighthouse on pages you change.
- **Animations use `m.*`, not `motion.*`.** They are lazy-loaded through `<LazyMotion strict>`.
- **New icons:** use the icon in JSX, then run `npm run icons` and commit the changed files in `public/fonts`,
  `src/index.css` and `index.html`. `npm run lint` fails if you forget.
- **Database changes** go in BOTH `supabase_schema.sql` (new projects) and `supabase_upgrade.sql` (existing ones). The
  upgrade script must stay safe to run more than once and must never touch existing data.
- Visual changes include before and after pictures, on a phone and on desktop.
- Text shown to people is short, warm and plain, in the same voice as the rest of the app.

## Style

Match the surrounding code. Comments are short and explain why, not what. Plain wording in docs and in text shown on
screen, with no marketing language.
