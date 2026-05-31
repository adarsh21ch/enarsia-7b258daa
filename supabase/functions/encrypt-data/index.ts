import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY') || '';

// AES-256-GCM via Web Crypto. Backward compatible with legacy XOR ('ENC:') records:
// new writes use 'ENC2:' (random IV per call, authenticated), reads transparently
// fall back to the old XOR routine so existing rows still decrypt.
const NEW_PREFIX = 'ENC2:';
const LEGACY_PREFIX = 'ENC:';

let cachedKey: CryptoKey | null = null;
async function getAesKey(): Promise<CryptoKey | null> {
  if (!ENCRYPTION_KEY) return null;
  if (cachedKey) return cachedKey;
  // Derive a stable 256-bit key from ENCRYPTION_KEY via SHA-256
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ENCRYPTION_KEY));
  cachedKey = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  return cachedKey;
}

function b64encode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function b64decode(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function encrypt(text: string): Promise<string> {
  if (!text) return text;
  const key = await getAesKey();
  if (!key) return text;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text)),
  );
  const combined = new Uint8Array(iv.length + ct.length);
  combined.set(iv, 0);
  combined.set(ct, iv.length);
  return NEW_PREFIX + b64encode(combined);
}

function decryptLegacyXor(encryptedText: string): string {
  try {
    const base64Data = encryptedText.slice(LEGACY_PREFIX.length);
    const encryptedBytes = b64decode(base64Data);
    const keyBytes = new TextEncoder().encode(ENCRYPTION_KEY);
    const decrypted = new Uint8Array(encryptedBytes.length);
    for (let i = 0; i < encryptedBytes.length; i++) {
      decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Legacy decryption error:', error);
    return encryptedText;
  }
}

async function decrypt(encryptedText: string): Promise<string> {
  if (!encryptedText || !ENCRYPTION_KEY) return encryptedText;
  if (encryptedText.startsWith(NEW_PREFIX)) {
    try {
      const key = await getAesKey();
      if (!key) return encryptedText;
      const combined = b64decode(encryptedText.slice(NEW_PREFIX.length));
      const iv = combined.slice(0, 12);
      const ct = combined.slice(12);
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
      return new TextDecoder().decode(pt);
    } catch (error) {
      console.error('AES decryption error:', error);
      return encryptedText;
    }
  }
  if (encryptedText.startsWith(LEGACY_PREFIX)) {
    return decryptLegacyXor(encryptedText);
  }
  return encryptedText;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT is already verified by Supabase (verify_jwt = true in config.toml)
    // No need for manual getUser() call - if we reach here, the request is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing authenticated request');

    const { action, data } = await req.json();
    console.log(`Processing ${action} request`);

    if (action === 'encrypt') {
      // Encrypt phone and email fields
      const result: Record<string, string> = {};
      
      if (data.phone) {
        result.phone = encrypt(data.phone);
        console.log('Phone encrypted');
      }
      if (data.email) {
        result.email = encrypt(data.email);
        console.log('Email encrypted');
      }
      
      return new Response(
        JSON.stringify({ encrypted: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } 
    
    if (action === 'decrypt') {
      // Decrypt phone and email fields
      const result: Record<string, string> = {};
      
      if (data.phone) {
        result.phone = decrypt(data.phone);
      }
      if (data.email) {
        result.email = decrypt(data.email);
      }
      
      return new Response(
        JSON.stringify({ decrypted: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (action === 'decrypt-batch') {
      // Decrypt multiple records at once
      const decryptedRecords = data.records.map((record: any) => ({
        ...record,
        phone: record.phone ? decrypt(record.phone) : record.phone,
        email: record.email ? decrypt(record.email) : record.email,
      }));
      
      console.log(`Decrypted ${decryptedRecords.length} records`);
      
      return new Response(
        JSON.stringify({ decrypted: decryptedRecords }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'encrypt-batch') {
      // Encrypt multiple records at once (for bulk imports)
      const encryptedRecords = data.records.map((record: any) => ({
        ...record,
        phone: record.phone ? encrypt(record.phone) : record.phone,
        email: record.email ? encrypt(record.email) : record.email,
      }));
      
      console.log(`Encrypted ${encryptedRecords.length} records`);
      
      return new Response(
        JSON.stringify({ encrypted: encryptedRecords }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in encrypt-data function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
