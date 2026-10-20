# Security policy

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Report it privately through GitHub: open the [Security tab](https://github.com/Cl0ud-9/Lumine/security) and choose
**Report a vulnerability**, or go straight to
[the advisory form](https://github.com/Cl0ud-9/Lumine/security/advisories/new). Only the maintainer sees what you send.

Please include what you found, how to reproduce it, and what you think an attacker could do with it.

The maintainer aims to answer within a week. Fixes for confirmed problems are released as soon as they are ready, and
you will be credited in the notes unless you would rather not be.

## What counts

Examples of things worth reporting:

- A way to read, change or delete another user's links or account (a gap in the row-level security policies or in the
  `SECURITY DEFINER` functions in `supabase_schema.sql`).
- A way to learn a link's token without being given it, or to list other people's links.
- Script or markup injection through a recipient name, a URL parameter, or anything else shown on a page.
- A way around the login, email confirmation or password-reset flow.
- Abuse of the public tracking functions (`track_visit`, `track_yes`, `track_no`, `check_invite_exists`) that goes
  beyond what a link's token already allows.
- A way to make `/api/keepalive` do anything other than one read-only database ping.

Not in scope: problems in Supabase, Vercel or GitHub themselves, settings you chose yourself, and findings that need
access to your own Supabase or Vercel account. The Supabase **anon key** that ships in the website is public by
design; row-level security is what protects the data.

## Supported versions

Only the latest release, and the current `main`, get security fixes. Lumine is deployed as a copy in your own
accounts, so to receive a fix you pull it in and, if the release notes say so, re-run `supabase_upgrade.sql`.

## Keeping your own deployment safe

- Keep row-level security **enabled** on the `invites` table (the schema does this) and never disable it to "make a
  query work".
- Put only the **anon** key in `VITE_SUPABASE_ANON_KEY`. Anything starting with `VITE_` is shipped to every visitor's
  browser, so never put the `service_role` key there.
- Never commit `.env`; it is git-ignored.
- Set a `CRON_SECRET` environment variable in Vercel so only Vercel's own cron can call `/api/keepalive`.
- Use a real SMTP provider for Supabase Auth emails, and set the **Site URL** and **Redirect URLs** to your own domain.
