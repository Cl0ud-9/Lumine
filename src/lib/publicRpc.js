import { supabaseUrl, supabaseAnonKey } from './config';

/**
 * Calls a public (anon-callable) Postgres function through PostgREST with a plain fetch.
 *
 * The recipient's proposal page only ever needs a handful of these RPCs (check the invite, record
 * a visit / a "No" / a "Yes"). Using the full @supabase/supabase-js client for that meant every
 * recipient - usually someone opening a link on a phone - downloaded and parsed ~45KB of gzipped
 * JavaScript (auth, realtime, storage...) they never use. This helper is ~0.5KB and keeps the
 * same `{ data, error }` result shape as `supabase.rpc`, so callers don't change.
 *
 * `keepalive` lets the request finish even if the page navigates away right after (the Yes click
 * immediately starts a transition to the next screen).
 */
export async function publicRpc(name, args = {}) {
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
            method: 'POST',
            headers: {
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(args),
            keepalive: true,
        });

        const text = await response.text();
        let body = null;
        try {
            body = text ? JSON.parse(text) : null;
        } catch {
            body = text;
        }

        if (!response.ok) {
            const error = new Error(body?.message || response.statusText || 'Request failed');
            error.code = body?.code;
            error.status = response.status;
            return { data: null, error };
        }
        return { data: body, error: null };
    } catch (error) {
        // Network failure / CORS / offline - same contract as a Supabase error result.
        return { data: null, error };
    }
}
