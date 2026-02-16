import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const APP_URL = "https://app.nevorai.com";
const DEFAULT_TITLE = "NevorAI - Never Miss a Followup Again";
const DEFAULT_DESC =
  "Manage your sales prospects, track conversions, and close more deals with NevorAI.";
const DEFAULT_IMAGE = `${APP_URL}/icons/icon-512.png`;

function buildHtml(
  title: string,
  description: string,
  image: string,
  canonicalUrl: string,
  redirectUrl: string
): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:image" content="${esc(image)}"/>
<meta property="og:url" content="${esc(canonicalUrl)}"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="NevorAI"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(description)}"/>
<meta name="twitter:image" content="${esc(image)}"/>
<meta http-equiv="refresh" content="0;url=${esc(redirectUrl)}"/>
</head>
<body>
<script>window.location.replace("${redirectUrl.replace(/"/g, '\\"')}");</script>
<p>Redirecting to <a href="${esc(redirectUrl)}">${esc(title)}</a>…</p>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type"); // "funnel" or "form"
    const slug = url.searchParams.get("slug"); // funnel slug
    const token = url.searchParams.get("token"); // form share token

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let title = DEFAULT_TITLE;
    let description = DEFAULT_DESC;
    let image = DEFAULT_IMAGE;
    let redirectUrl = APP_URL;
    let canonicalUrl = APP_URL;

    if (type === "funnel" && slug) {
      const { data } = await supabase
        .from("funnels")
        .select("title, description, thumbnail_url")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (data) {
        title = data.title || DEFAULT_TITLE;
        description = data.description || `Watch this video on NevorAI`;
        image = data.thumbnail_url || DEFAULT_IMAGE;
      }
      redirectUrl = `${APP_URL}/f/${slug}`;
      canonicalUrl = redirectUrl;
    } else if (type === "form" && token) {
      // Look up the form via the share token
      const { data: share } = await supabase
        .from("nevora_form_shares")
        .select("form_id")
        .eq("token", token)
        .maybeSingle();

      if (share?.form_id) {
        const { data: form } = await supabase
          .from("nevora_forms")
          .select("title, description")
          .eq("id", share.form_id)
          .maybeSingle();

        if (form) {
          title = form.title || DEFAULT_TITLE;
          description = form.description || `Fill out this form on NevorAI`;
        }
      }
      redirectUrl = `${APP_URL}/share/form/${token}`;
      canonicalUrl = `https://nevorai.com/f/${token}`;
    } else {
      // Fallback — redirect to app home
      redirectUrl = APP_URL;
    }

    const html = buildHtml(title, description, image, canonicalUrl, redirectUrl);

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (err) {
    console.error("og-share error:", err);
    // On error, redirect to app home
    const fallback = buildHtml(
      DEFAULT_TITLE,
      DEFAULT_DESC,
      DEFAULT_IMAGE,
      APP_URL,
      APP_URL
    );
    return new Response(fallback, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }
});
