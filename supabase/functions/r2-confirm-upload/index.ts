import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { S3Client, HeadObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.624.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
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

    // Parse request
    const { asset_id, title, duration_seconds } = await req.json();

    if (!asset_id) {
      return new Response(
        JSON.stringify({ error: 'Missing asset_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the asset record
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: asset, error: fetchError } = await serviceClient
      .from('video_assets')
      .select('*')
      .eq('id', asset_id)
      .eq('owner_user_id', userId)
      .single();

    if (fetchError || !asset) {
      console.error('Asset fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Video asset not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify file exists in R2
    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${Deno.env.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!,
        secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
      },
    });

    try {
      const headCommand = new HeadObjectCommand({
        Bucket: Deno.env.get('R2_BUCKET_NAME')!,
        Key: asset.r2_object_key,
      });
      
      await r2Client.send(headCommand);
      console.log(`File verified in R2: ${asset.r2_object_key}`);
    } catch (error) {
      console.error('File not found in R2:', error);
      
      // Update status to failed
      await serviceClient
        .from('video_assets')
        .update({ status: 'failed' })
        .eq('id', asset_id);

      return new Response(
        JSON.stringify({ error: 'File not found in storage. Upload may have failed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update asset to ready status
    const updateData: Record<string, unknown> = {
      status: 'ready',
      updated_at: new Date().toISOString(),
    };

    if (title) {
      updateData.title = title;
    }

    if (duration_seconds) {
      updateData.duration_seconds = duration_seconds;
    }

    const { data: updatedAsset, error: updateError } = await serviceClient
      .from('video_assets')
      .update(updateData)
      .eq('id', asset_id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update asset status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Confirmed upload for asset ${asset_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        asset: updatedAsset,
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
