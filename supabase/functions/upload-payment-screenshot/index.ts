import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// AWS Signature V4 helpers
function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return toHex(hashBuffer);
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  let keyBuffer: ArrayBuffer;
  
  if (key instanceof Uint8Array) {
    // Create a proper ArrayBuffer copy from Uint8Array
    keyBuffer = new Uint8Array(key).buffer as ArrayBuffer;
  } else {
    keyBuffer = key as ArrayBuffer;
  }
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(keyBuffer),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + secretKey), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { lead_id, access_token, file_name, content_type } = await req.json();

    if (!lead_id || !access_token || !file_name || !content_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate lead and access token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: lead, error: leadError } = await supabase
      .from('funnel_leads')
      .select('id, access_token, funnel_id')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead || lead.access_token !== access_token) {
      return new Response(
        JSON.stringify({ error: 'Invalid lead or access token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // R2 credentials
    const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const bucketName = Deno.env.get('R2_BUCKET_NAME');
    const accountId = Deno.env.get('R2_ACCOUNT_ID');

    if (!accessKeyId || !secretAccessKey || !bucketName || !accountId) {
      console.error('Missing R2 credentials');
      return new Response(
        JSON.stringify({ error: 'Storage not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const host = `${accountId}.r2.cloudflarestorage.com`;
    const region = 'auto';
    const service = 's3';

    // Generate unique key for payment screenshot
    const extension = file_name.split('.').pop() || 'jpg';
    const objectKey = `payment-screenshots/${lead.funnel_id}/${lead_id}/${Date.now()}.${extension}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const expiresSeconds = 3600;

    const credential = `${accessKeyId}/${dateStamp}/${region}/${service}/aws4_request`;

    const canonicalQueryString = [
      `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
      `X-Amz-Credential=${encodeURIComponent(credential)}`,
      `X-Amz-Date=${amzDate}`,
      `X-Amz-Expires=${expiresSeconds}`,
      `X-Amz-SignedHeaders=content-type%3Bhost`,
    ].sort().join('&');

    const canonicalHeaders = `content-type:${content_type}\nhost:${host}\n`;
    const signedHeaders = 'content-type;host';

    const canonicalRequest = [
      'PUT',
      `/${bucketName}/${objectKey}`,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const hashedCanonicalRequest = await sha256(canonicalRequest);

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      `${dateStamp}/${region}/${service}/aws4_request`,
      hashedCanonicalRequest,
    ].join('\n');

    const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
    const signatureBuffer = await hmacSha256(signingKey, stringToSign);
    const signature = toHex(signatureBuffer);

    const presignedUrl = `https://${host}/${bucketName}/${objectKey}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

    // Public URL using r2.dev public endpoint
    const R2_PUBLIC_BASE = 'https://pub-d0cae7c30eea4f949d9c33c730813937.r2.dev';
    const publicUrl = `${R2_PUBLIC_BASE}/${bucketName}/${objectKey}`;

    console.log('Generated presigned URL for payment screenshot:', { objectKey, leadId: lead_id });

    return new Response(
      JSON.stringify({
        upload_url: presignedUrl,
        object_key: objectKey,
        public_url: publicUrl,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating upload URL:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
