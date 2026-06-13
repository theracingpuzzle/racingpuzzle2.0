// ─── delete-user Edge Function ────────────────────────────────────────────────
// Deletes the authenticated user's account from Supabase Auth.
// Data rows are deleted client-side first (in legal.js authDeleteAccount).
// This function handles the auth record deletion which requires the service role key.
//
// Deploy:
//   supabase functions deploy delete-user --no-verify-jwt
//   (JWT verification is done manually below so we can read the user ID)
//
// Call from client:
//   POST https://<project>.supabase.co/functions/v1/delete-user
//   Authorization: Bearer <user JWT>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // ── 1. Verify the caller's JWT and get their user ID ──────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userJwt = authHeader.replace('Bearer ', '');

    // Use a regular (anon-key) client to verify the user's JWT
    const supabaseUrl     = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // ── 2. Delete all user data rows (belt-and-braces — client does this too) ─
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const tables = [
      'profile_observations',
      'profile_targets',
      'horse_reviews',
      'horse_profiles',
      'bets',
      'daily_log',
      'rules',
      'settings',
      'bank',
    ];

    for (const table of tables) {
      const { error } = await adminClient.from(table).delete().eq('user_id', userId);
      if (error) {
        console.error(`Error deleting from ${table}:`, error.message);
        // Continue — don't abort on partial failures
      }
    }

    // ── 3. Delete the auth user ───────────────────────────────────────────────
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Error deleting auth user:', deleteError.message);
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`User deleted successfully: ${userId}`);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
