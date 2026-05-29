import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const APP_URL = "https://ncall.nevorai.com";
const DEFAULT_TITLE = "Nevorai CRM — Your personal CRM for network marketers.";
const DEFAULT_DESC =
  "Manage leads, forms, follow-ups, tasks, and tracking with Nevorai CRM.";
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
<meta property="og:site_name" content="Nevorai CRM"/>
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
    const type = url.searchParams.get("type");
    const slug = url.searchParams.get("slug");
    const token = url.searchParams.get("token");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
        description = data.description || `Watch this video on Nevorai CRM`;
        image = data.thumbnail_url || DEFAULT_IMAGE;
      }
      redirectUrl = `${APP_URL}/f/${slug}`;
      canonicalUrl = redirectUrl;
    } else if (type === "form" && token) {
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
          description = form.description || `Fill out this form on Nevorai CRM`;
        }
      }
      redirectUrl = `${APP_URL}/share/form/${token}`;
      canonicalUrl = `https://nevorai.com/f/${token}`;
    } else {
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
    console.error("ogshare error:", err);
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
