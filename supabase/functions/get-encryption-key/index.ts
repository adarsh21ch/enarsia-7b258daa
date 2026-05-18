import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'No authorization header', code: 'NO_AUTH' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('Auth error:', authError?.message || 'No user');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', code: 'TOKEN_EXPIRED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) {
      console.error('ENCRYPTION_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Encryption key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ key: encryptionKey }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=3600',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
