import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { S3Client, PutObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.624.0';
import { getSignedUrl } from 'https://esm.sh/@aws-sdk/s3-request-presigner@3.624.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Parse request body
    const { file_name, file_size, content_type } = await req.json();

    // Validate inputs
    if (!file_name || !file_size || !content_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: file_name, file_size, content_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedTypes.includes(content_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Only MP4, WebM, and MOV are allowed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024;
    if (file_size > maxSize) {
      return new Response(
        JSON.stringify({ error: 'File too large. Maximum size is 500MB.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique asset ID and object key
    const assetId = crypto.randomUUID();
    const fileExtension = file_name.split('.').pop() || 'mp4';
    const objectKey = `videos/${userId}/${assetId}.${fileExtension}`;

    // Create video_assets record with status 'processing'
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: insertError } = await serviceClient
      .from('video_assets')
      .insert({
        id: assetId,
        owner_user_id: userId,
        title: file_name.replace(/\.[^/.]+$/, ''), // Remove extension for title
        r2_object_key: objectKey,
        file_size_bytes: file_size,
        mime_type: content_type,
        status: 'processing',
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create video asset record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create R2 client
    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${Deno.env.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!,
        secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
      },
    });

    // Generate presigned upload URL (valid for 1 hour)
    const command = new PutObjectCommand({
      Bucket: Deno.env.get('R2_BUCKET_NAME')!,
      Key: objectKey,
      ContentType: content_type,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

    console.log(`Created upload URL for asset ${assetId}`);

    return new Response(
      JSON.stringify({
        upload_url: uploadUrl,
        object_key: objectKey,
        asset_id: assetId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
