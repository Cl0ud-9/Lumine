import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY;

let supabase;

if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
    console.warn('Missing Supabase Environment Variables. App will not function correctly.');
    // Dummy client to prevent crash on load
    supabase = {
        from: () => ({
            select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: { message: 'Supabase not connected' } }) }) }),
            insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Supabase not connected' } }) }) }),
            update: () => ({ eq: () => Promise.resolve({ error: { message: 'Supabase not connected' } }) })
        })
    };
}

export { supabase };
