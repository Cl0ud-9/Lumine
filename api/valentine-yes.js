import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const { token } = await request.json();

        if (!token) {
            return new Response(JSON.stringify({ error: 'Token is required' }), { status: 400 });
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Supabase credentials missing');
            return new Response(JSON.stringify({ success: true, warning: 'Backend not configured' }), { status: 200 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Check if token exists and isn't used
        const { data: invite, error: fetchError } = await supabase
            .from('invites')
            .select('id, used')
            .eq('token', token)
            .single();

        if (fetchError || !invite) {
            // Token not found, return success (idempotent/secure)
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        if (invite.used) {
            // Already used, return success
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        // 2. Mark as used
        const { error: updateError } = await supabase
            .from('invites')
            .update({ used: true, used_at: new Date().toISOString() })
            .eq('token', token);

        if (updateError) {
            console.error('Error updating invite:', updateError);
        }

        // 3. Log response
        const { error: insertError } = await supabase
            .from('responses')
            .insert({
                token: token,
                answered_at: new Date().toISOString()
            });

        if (insertError) {
            console.error('Error recording response:', insertError);
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error('API Error:', error);
        // Always return success to frontend
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
}
