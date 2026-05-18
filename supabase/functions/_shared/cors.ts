const ALLOWED_ORIGINS = [
  'https://app.nevorai.com',
  'https://ncall.nevorai.com',
  'https://nevorai.com',
  'https://ncall.lovable.app',
];

export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.lovable.app');
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

// Use this only for truly public endpoints (create-funnel-lead, og-share, razorpay-webhook)
export const publicCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
