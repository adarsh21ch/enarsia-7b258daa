import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const encoder = new TextEncoder();

async function hmacSha256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { asset_id, lead_token } = await req.json();

    if (!asset_id) {
      return new Response(
        JSON.stringify({ error: 'Missing asset_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if this is an authenticated user request
    const authHeader = req.headers.get('Authorization');
    let hasAccess = false;

    if (authHeader?.startsWith('Bearer ')) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        const userId = user.id;
        
        // Check if user owns the asset
        const { data: asset } = await serviceClient
          .from('video_assets')
          .select('owner_user_id')
          .eq('id', asset_id)
          .single();

        if (asset?.owner_user_id === userId) {
          hasAccess = true;
          console.log(`Access granted: user ${userId} owns asset ${asset_id}`);
        } else {
          // Check if user has a funnel using this asset
          const { data: funnel } = await serviceClient
            .from('funnels')
            .select('id')
            .eq('video_asset_id', asset_id)
            .eq('owner_user_id', userId)
            .limit(1)
            .maybeSingle();

          if (funnel) {
            hasAccess = true;
            console.log(`Access granted: user ${userId} has funnel using asset ${asset_id}`);
          }
        }
      }
    }

    // Check lead token access (for public funnel viewers)
    if (!hasAccess && lead_token) {
      const { data: lead } = await serviceClient
        .from('funnel_leads')
        .select('funnel_id')
        .eq('access_token', lead_token)
        .maybeSingle();

      if (lead?.funnel_id) {
        const { data: funnel } = await serviceClient
          .from('funnels')
          .select('video_asset_id')
          .eq('id', lead.funnel_id)
          .maybeSingle();

        if (funnel?.video_asset_id === asset_id) {
          hasAccess = true;
          console.log(`Access granted via lead token for asset ${asset_id}`);
        }
      }
    }

    // For public published funnels, allow access
    if (!hasAccess) {
      const { data: publishedFunnel } = await serviceClient
        .from('funnels')
        .select('id')
        .eq('video_asset_id', asset_id)
        .eq('is_published', true)
        .limit(1)
        .maybeSingle();

      if (publishedFunnel) {
        hasAccess = true;
        console.log(`Access granted: asset ${asset_id} is in published funnel`);
      }
    }

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the asset
    const { data: asset, error: fetchError } = await serviceClient
      .from('video_assets')
      .select('*')
      .eq('id', asset_id)
      .eq('status', 'ready')
      .single();

    if (fetchError || !asset) {
      console.error('Asset fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Video asset not found or not ready' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate AWS Signature V4 presigned URL for R2
    const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')!;
    const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')!;
    const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')!;
    const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME')!;

    const region = 'auto';
    const service = 's3';
    const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const objectKey = asset.r2_object_key;
    
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const expiresIn = 14400; // 4 hours

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const signedHeaders = 'host';
    
    const queryParams = new URLSearchParams({
      'X-Amz-Algorithm': algorithm,
      'X-Amz-Credential': `${R2_ACCESS_KEY_ID}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': expiresIn.toString(),
      'X-Amz-SignedHeaders': signedHeaders,
    });

    const canonicalUri = `/${R2_BUCKET_NAME}/${objectKey}`;
    const canonicalQueryString = queryParams.toString().split('&').sort().join('&');
    const canonicalHeaders = `host:${host}\n`;
    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalRequest = [
      'GET',
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const canonicalRequestHash = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(canonicalRequest)
    );
    const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      canonicalRequestHashHex,
    ].join('\n');

    const kDate = await hmacSha256(encoder.encode(`AWS4${R2_SECRET_ACCESS_KEY}`).buffer as ArrayBuffer, dateStamp);
    const kRegion = await hmacSha256(kDate, region);
    const kService = await hmacSha256(kRegion, service);
    const kSigning = await hmacSha256(kService, 'aws4_request');
    const signatureBuffer = await hmacSha256(kSigning, stringToSign);
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    queryParams.set('X-Amz-Signature', signature);
    const presignedUrl = `https://${host}${canonicalUri}?${queryParams.toString()}`;

    const expiresAt = new Date(now.getTime() + expiresIn * 1000).toISOString();

    console.log(`Generated playback URL for asset ${asset_id}`);

    return new Response(
      JSON.stringify({
        playback_url: presignedUrl,
        expires_at: expiresAt,
        asset: {
          id: asset.id,
          title: asset.title,
          duration_seconds: asset.duration_seconds,
          mime_type: asset.mime_type,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
