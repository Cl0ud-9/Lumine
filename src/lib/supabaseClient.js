import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail fast and loud on a missing config instead of silently falling back to a placeholder
// project - that used to turn a one-line .env mistake into a confusing runtime network error
// deep inside whichever Supabase call happened to run first.
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase configuration. Copy .env.example to .env and set ' +
        'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see README.md).'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
