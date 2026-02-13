import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const { creator_id, girlfriend_name, boyfriend_name } = await request.json();

        if (!creator_id || !girlfriend_name || !boyfriend_name) {
            return new Response(JSON.stringify({ error: 'All fields are required' }), { status: 400 });
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Generate a random token (simple random string)
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        const { data, error } = await supabase
            .from('invites')
            .insert({
                creator_id,
                girlfriend_name,
                boyfriend_name,
                token
            })
            .select()
            .single();

        if (error) {
            console.error('Error generating invite:', error);
            return new Response(JSON.stringify({ error: 'Failed to create invite' }), { status: 500 });
        }

        // Return the full URL (assuming frontend sends origin, or we construct it)
        // For now, just sending back the token and let frontend construct the URL
        return new Response(JSON.stringify({ success: true, token, invite: data }), { status: 200 });

    } catch (error) {
        console.error('Generate API Error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}
