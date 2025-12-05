import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY') || '';

// Simple XOR-based encryption with Base64 encoding for demonstration
// In production, consider using Web Crypto API for stronger encryption
function encrypt(text: string): string {
  if (!text || !ENCRYPTION_KEY) return text;
  
  const textBytes = new TextEncoder().encode(text);
  const keyBytes = new TextEncoder().encode(ENCRYPTION_KEY);
  const encrypted = new Uint8Array(textBytes.length);
  
  for (let i = 0; i < textBytes.length; i++) {
    encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  
  // Add prefix to identify encrypted data
  return 'ENC:' + btoa(String.fromCharCode(...encrypted));
}

function decrypt(encryptedText: string): string {
  if (!encryptedText || !ENCRYPTION_KEY) return encryptedText;
  
  // Check if data is encrypted (has our prefix)
  if (!encryptedText.startsWith('ENC:')) {
    return encryptedText; // Return as-is if not encrypted
  }
  
  try {
    const base64Data = encryptedText.slice(4); // Remove 'ENC:' prefix
    const encryptedBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const keyBytes = new TextEncoder().encode(ENCRYPTION_KEY);
    const decrypted = new Uint8Array(encryptedBytes.length);
    
    for (let i = 0; i < encryptedBytes.length; i++) {
      decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedText; // Return original if decryption fails
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user is authenticated with proper JWT validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client and verify the JWT token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('JWT validation failed:', authError?.message || 'No user found');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

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
