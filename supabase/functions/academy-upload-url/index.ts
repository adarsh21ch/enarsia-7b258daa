import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: authError } = await userClient.auth.getUser(token);
    if (authError || !claims?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: isAdmin } = await serviceClient.rpc('has_role', {
      _user_id: claims.user.id,
      _role: 'admin',
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { file_name, file_size, content_type, purpose } = body ?? {};

    if (!file_name || !file_size || !content_type || !purpose) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: file_name, file_size, content_type, purpose',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (purpose !== 'academy-video' && purpose !== 'academy-thumbnail') {
      return new Response(JSON.stringify({ error: 'Invalid purpose' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (purpose === 'academy-video') {
      if (!allowedVideoTypes.includes(content_type)) {
        return new Response(JSON.stringify({ error: 'Invalid video type (MP4/WebM/MOV)' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (file_size > 1024 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: 'Max video size 1GB' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      if (!allowedImageTypes.includes(content_type)) {
        return new Response(JSON.stringify({ error: 'Invalid image type (JPG/PNG/WebP)' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (file_size > 10 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: 'Max thumbnail size 10MB' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const sanitizedName = file_name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uuid = crypto.randomUUID();
    const folder = purpose === 'academy-video' ? 'academy/videos' : 'academy/thumbnails';
    const objectKey = `${folder}/${claims.user.id}/${uuid}-${sanitizedName}`;

    // R2 secrets
    const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')!;
    const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')!;
    const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')!;
    const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME')!;
    const R2_PUBLIC_URL = Deno.env.get('R2_PUBLIC_URL') ?? '';

    const region = 'auto';
    const service = 's3';
    const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const expiresIn = 3600;

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
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const stringToSign = [algorithm, amzDate, credentialScope, canonicalRequestHashHex].join('\n');

    const kDate = await hmacSha256(
      encoder.encode(`AWS4${R2_SECRET_ACCESS_KEY}`).buffer as ArrayBuffer,
      dateStamp
    );
    const kRegion = await hmacSha256(kDate, region);
    const kService = await hmacSha256(kRegion, service);
    const kSigning = await hmacSha256(kService, 'aws4_request');
    const signatureBuffer = await hmacSha256(kSigning, stringToSign);
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    queryParams.set('X-Amz-Signature', signature);
    const presignedUrl = `https://${host}${canonicalUri}?${queryParams.toString()}`;

    const publicUrl = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL.replace(/\/$/, '')}/${objectKey}`
      : '';

    return new Response(
      JSON.stringify({
        upload_url: presignedUrl,
        object_key: objectKey,
        public_url: publicUrl,
        content_type,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('academy-upload-url error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
