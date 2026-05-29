import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  setEncryptionKey,
  hasEncryptionKey,
  clearEncryptionKey,
  encryptFields as clientEncryptFields,
  decryptFields as clientDecryptFields,
  encryptBatch as clientEncryptBatch,
  decryptBatch as clientDecryptBatch,
} from '@/lib/encryption';

export function useEncryption() {
  const { user } = useAuth();
  // SECURITY: the raw encryption key is no longer exposed to clients.
  // All encrypt/decrypt operations round-trip through the `encrypt-data`
  // edge function. `isReady` stays false so callers always use the server path.
  const [isReady] = useState(false);

  useEffect(() => {
    if (!user) {
      clearEncryptionKey();
    }
  }, [user]);


  // Helper to ensure valid session before edge function calls
  const ensureValidSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        return false;
      }
      // Check if session is about to expire (within 60 seconds)
      const expiresAt = sessionData.session.expires_at;
      if (expiresAt && (expiresAt * 1000) - Date.now() < 60000) {
        const { error: refreshError } = await supabase.auth.refreshSession();
        return !refreshError;
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  // Client-side encryption (instant, no network call)
  const encryptFields = useCallback(async (data: { phone?: string; email?: string }) => {
    // Use client-side encryption if key is available
    if (hasEncryptionKey()) {
      return clientEncryptFields(data);
    }
    
    // Fallback to edge function if key not available - but validate session first
    try {
      const hasSession = await ensureValidSession();
      if (!hasSession) return data; // Return original data gracefully
      
      const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
        body: { action: 'encrypt', data }
      });
      if (error) return data;
      return result?.encrypted || data;
    } catch {
      return data;
    }
  }, [ensureValidSession]);

  // Client-side decryption (instant, no network call)
  const decryptFields = useCallback(async (data: { phone?: string; email?: string }) => {
    // Use client-side decryption if key is available
    if (hasEncryptionKey()) {
      return clientDecryptFields(data);
    }
    
    // Fallback to edge function if key not available - but validate session first
    try {
      const hasSession = await ensureValidSession();
      if (!hasSession) return data; // Return original data gracefully
      
      const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
        body: { action: 'decrypt', data }
      });
      if (error) return data;
      return result?.decrypted || data;
    } catch {
      return data;
    }
  }, [ensureValidSession]);

  // Batch decryption (instant, no network call)
  const decryptBatch = useCallback(async <T extends { phone?: string; email?: string }>(records: T[]): Promise<T[]> => {
    if (records.length === 0) return records;
    
    // Use client-side decryption if key is available
    if (hasEncryptionKey()) {
      return clientDecryptBatch(records);
    }
    
    // Fallback to edge function if key not available - but validate session first
    try {
      const hasSession = await ensureValidSession();
      if (!hasSession) return records; // Return original records gracefully
      
      const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
        body: { action: 'decrypt-batch', data: { records } }
      });
      if (error) return records;
      return result?.decrypted || records;
    } catch {
      return records;
    }
  }, [ensureValidSession]);

  // Batch encryption (instant, no network call)
  const encryptBatch = useCallback(async <T extends { phone?: string; email?: string }>(records: T[]): Promise<T[]> => {
    if (records.length === 0) return records;
    
    // Use client-side encryption if key is available
    if (hasEncryptionKey()) {
      return clientEncryptBatch(records);
    }
    
    // Fallback to edge function if key not available - but validate session first
    try {
      const hasSession = await ensureValidSession();
      if (!hasSession) return records; // Return original records gracefully
      
      const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
        body: { action: 'encrypt-batch', data: { records } }
      });
      if (error) return records;
      return result?.encrypted || records;
    } catch {
      return records;
    }
  }, [ensureValidSession]);

  return { 
    encryptFields, 
    decryptFields, 
    decryptBatch, 
    encryptBatch,
    isReady, // True when client-side encryption is available
  };
}
