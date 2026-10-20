// Vercel serverless function + daily cron (see "crons" in vercel.json).
//
// Supabase's free plan PAUSES a project after about a week without activity, which takes the whole app
// down until someone restores it by hand in the dashboard. This endpoint runs a harmless, read-only
// query against the database once a day so the project never counts as inactive.
//
// It calls the same public `check_invite_exists` function the recipient page uses, with a token that can
// never exist, so it reads one indexed row lookup and writes nothing.
//
// Configuration: it reuses the VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY environment variables that the
// build already needs (Vercel exposes project env vars to functions at runtime). Optionally set a
// CRON_SECRET env var in Vercel; Vercel then sends it as `Authorization: Bearer <secret>` on cron calls
// and this function rejects anything else.
//
// A non-2xx response is returned when the database can't be reached, which shows up as a failed run in
// Vercel -> Project -> Cron Jobs, so a paused or broken project is noticed instead of silently ignored.

const PING_TOKEN = 'keepalive-ping';
const TIMEOUT_MS = 15000;

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    const secret = process.env.CRON_SECRET;
    if (secret && req.headers.authorization !== `Bearer ${secret}`) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) {
        return res.status(500).json({ ok: false, error: 'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set for this deployment' });
    }

    const startedAt = Date.now();
    try {
        const response = await fetch(`${url}/rest/v1/rpc/check_invite_exists`, {
            method: 'POST',
            headers: {
                apikey: key,
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url_token: PING_TOKEN }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });

        if (!response.ok) {
            return res.status(502).json({ ok: false, supabaseStatus: response.status, ms: Date.now() - startedAt });
        }
        return res.status(200).json({ ok: true, ms: Date.now() - startedAt });
    } catch (error) {
        return res.status(502).json({ ok: false, error: String(error?.message || error), ms: Date.now() - startedAt });
    }
}
