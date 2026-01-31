import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-lead-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
  const encoder = new TextEncoder();
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    const leadToken = req.headers.get('x-lead-token');

    let userId: string | null = null;
    let leadId: string | null = null;
    let isLeadAuth = false;

    // Try JWT auth first
    if (authHeader?.startsWith('Bearer ')) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const token = authHeader.replace('Bearer ', '');
      const { data: claims, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && claims?.user) {
        userId = claims.user.id;
      }
    }

    // If no JWT, try lead token auth
    if (!userId && leadToken) {
      const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const { data: lead, error: leadError } = await serviceClient
        .from('funnel_leads')
        .select('id, funnel_id, access_token')
        .eq('access_token', leadToken)
        .single();

      if (!leadError && lead) {
        leadId = lead.id;
        isLeadAuth = true;
      }
    }

    // Require at least one valid auth method
    if (!userId && !leadId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - valid JWT or lead token required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { file_name, file_size, content_type } = await req.json();

    if (!file_name || !file_size || !content_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: file_name, file_size, content_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For lead auth, only allow image uploads for payment proofs
    if (isLeadAuth) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(content_type)) {
        return new Response(
          JSON.stringify({ error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed for payment proofs.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const maxSize = 10 * 1024 * 1024; // 10MB for images
      if (file_size > maxSize) {
        return new Response(
          JSON.stringify({ error: 'File too large. Maximum size is 10MB for payment proofs.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // For JWT auth (funnel owners), allow videos
      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
      if (!allowedTypes.includes(content_type)) {
        return new Response(
          JSON.stringify({ error: 'Invalid file type. Only MP4, WebM, and MOV are allowed.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const maxSize = 500 * 1024 * 1024; // 500MB for videos
      if (file_size > maxSize) {
        return new Response(
          JSON.stringify({ error: 'File too large. Maximum size is 500MB.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const timestamp = Date.now();
    const sanitizedName = file_name.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Different paths for lead uploads vs owner uploads
    let objectKey: string;
    if (isLeadAuth) {
      objectKey = `payment-proofs/${leadId}/${timestamp}-${sanitizedName}`;
    } else {
      objectKey = `videos/${userId}/${timestamp}-${sanitizedName}`;
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Only create video_assets record for JWT auth (video uploads)
    let assetId: string | null = null;
    if (!isLeadAuth) {
      const { data: asset, error: insertError } = await serviceClient
        .from('video_assets')
        .insert({
          owner_user_id: userId,
          title: file_name.replace(/\.[^/.]+$/, ''),
          r2_object_key: objectKey,
          file_size_bytes: file_size,
          mime_type: content_type,
          status: 'processing',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Database insert error:', JSON.stringify(insertError, null, 2));
        return new Response(
          JSON.stringify({ error: 'Failed to create video asset record', details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      assetId = asset.id;
    }

    // Generate AWS Signature V4 presigned URL for R2
    const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')!;
    const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')!;
    const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')!;
    const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME')!;

    const region = 'auto';
    const service = 's3';
    const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const expiresIn = 3600; // 1 hour

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const signedHeaders = 'content-type;host';
    
    const queryParams = new URLSearchParams({
      'X-Amz-Algorithm': algorithm,
      'X-Amz-Credential': `${R2_ACCESS_KEY_ID}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': expiresIn.toString(),
      'X-Amz-SignedHeaders': signedHeaders,
    });

    const canonicalUri = `/${R2_BUCKET_NAME}/${objectKey}`;
    const canonicalQueryString = queryParams.toString().split('&').sort().join('&');
    const canonicalHeaders = `content-type:${content_type}\nhost:${host}\n`;
    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalRequest = [
      'PUT',
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

    // Build public URL
    const R2_PUBLIC_URL = Deno.env.get('R2_PUBLIC_URL');
    const publicUrl = R2_PUBLIC_URL 
      ? `${R2_PUBLIC_URL}/${objectKey}`
      : `https://${host}/${R2_BUCKET_NAME}/${objectKey}`;

    console.log(`Created upload URL for ${isLeadAuth ? 'lead' : 'user'} - object: ${objectKey}`);

    return new Response(
      JSON.stringify({
        upload_url: presignedUrl,
        object_key: objectKey,
        asset_id: assetId,
        content_type: content_type,
        public_url: publicUrl,
        auth_type: isLeadAuth ? 'lead' : 'jwt',
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
