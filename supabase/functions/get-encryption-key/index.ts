import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('No or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'No authorization header', code: 'NO_AUTH' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Basic token validation - JWT tokens are typically 3 parts separated by dots
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.log('Invalid JWT format - not 3 parts');
      return new Response(
        JSON.stringify({ error: 'Invalid token format', code: 'INVALID_TOKEN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create Supabase client with the user's token for validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Use getClaims() for faster validation - it validates the JWT locally
    // This is more reliable than getUser() which makes a network request
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.log('Claims validation failed:', claimsError?.message || 'No claims found');
      
      // Fallback to getUser() if getClaims fails (for older tokens)
      const { data: userData, error: authError } = await supabase.auth.getUser();
      
      if (authError || !userData?.user) {
        console.log('Auth error:', authError?.message || 'No user found');
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token', code: 'TOKEN_EXPIRED' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Verified user via getUser():', userData.user.id);
    } else {
      console.log('Verified user via getClaims():', claimsData.claims.sub);
    }

    // Return the encryption key
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
          'Cache-Control': 'private, max-age=3600'
        } 
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
