import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { S3Client, GetObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.624.0';
import { getSignedUrl } from 'https://esm.sh/@aws-sdk/s3-request-presigner@3.624.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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
      // First get the lead
      const { data: lead } = await serviceClient
        .from('funnel_leads')
        .select('funnel_id')
        .eq('access_token', lead_token)
        .maybeSingle();

      if (lead?.funnel_id) {
        // Then check if that funnel uses this asset
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

    // Generate signed playback URL
    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${Deno.env.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!,
        secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
      },
    });

    const command = new GetObjectCommand({
      Bucket: Deno.env.get('R2_BUCKET_NAME')!,
      Key: asset.r2_object_key,
    });

    // URL valid for 4 hours
    const expiresIn = 4 * 60 * 60;
    const playbackUrl = await getSignedUrl(r2Client, command, { expiresIn });

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    console.log(`Generated playback URL for asset ${asset_id}`);

    return new Response(
      JSON.stringify({
        playback_url: playbackUrl,
        expires_at: expiresAt,
        asset: {
          id: asset.id,
          title: asset.title,
          duration_seconds: asset.duration_seconds,
          mime_type: asset.mime_type,
        },
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
