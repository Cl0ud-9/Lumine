import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const { creator_id } = await request.json();

        if (!creator_id) {
            return new Response(JSON.stringify({ error: 'Creator ID is required' }), { status: 400 });
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Supabase credentials missing');
            return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: invites, error } = await supabase
            .from('invites')
            .select('*')
            .eq('creator_id', creator_id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching dashboard:', error);
            return new Response(JSON.stringify({ error: 'Failed to fetch data' }), { status: 500 });
        }

        return new Response(JSON.stringify({ invites }), { status: 200 });

    } catch (error) {
        console.error('Dashboard API Error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}
