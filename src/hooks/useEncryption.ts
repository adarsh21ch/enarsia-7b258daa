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
  const [isReady, setIsReady] = useState(hasEncryptionKey());

  // Fetch encryption key once when user logs in
  useEffect(() => {
    if (!user) {
      clearEncryptionKey();
      setIsReady(false);
      return;
    }

    // Already have the key
    if (hasEncryptionKey()) {
      setIsReady(true);
      return;
    }

    const fetchKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-encryption-key');
        
        if (error) {
          console.warn('Failed to fetch encryption key, falling back to edge function:', error.message);
          return;
        }

        if (data?.key) {
          setEncryptionKey(data.key);
          setIsReady(true);
        }
      } catch (err) {
        console.warn('Error fetching encryption key:', err);
      }
    };

    fetchKey();
  }, [user]);

  // Client-side encryption (instant, no network call)
  const encryptFields = useCallback(async (data: { phone?: string; email?: string }) => {
    // Use client-side encryption if key is available
    if (hasEncryptionKey()) {
      return clientEncryptFields(data);
    }
    
    // Fallback to edge function if key not available
    try {
      const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
        body: { action: 'encrypt', data }
      });
      if (error) return data;
      return result?.encrypted || data;
    } catch {
      return data;
    }
  }, []);

  // Client-side decryption (instant, no network call)
  const decryptFields = useCallback(async (data: { phone?: string; email?: string }) => {
    // Use client-side decryption if key is available
    if (hasEncryptionKey()) {
      return clientDecryptFields(data);
    }
    
    // Fallback to edge function if key not available
    try {
      const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
        body: { action: 'decrypt', data }
      });
      if (error) return data;
      return result?.decrypted || data;
    } catch {
      return data;
    }
  }, []);

  // Batch decryption (instant, no network call)
  const decryptBatch = useCallback(async <T extends { phone?: string; email?: string }>(records: T[]): Promise<T[]> => {
    if (records.length === 0) return records;
    
    // Use client-side decryption if key is available
    if (hasEncryptionKey()) {
      return clientDecryptBatch(records);
    }
    
    // Fallback to edge function if key not available
    try {
      const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
        body: { action: 'decrypt-batch', data: { records } }
      });
      if (error) return records;
      return result?.decrypted || records;
    } catch {
      return records;
    }
  }, []);

  // Batch encryption (instant, no network call)
  const encryptBatch = useCallback(async <T extends { phone?: string; email?: string }>(records: T[]): Promise<T[]> => {
    if (records.length === 0) return records;
    
    // Use client-side encryption if key is available
    if (hasEncryptionKey()) {
      return clientEncryptBatch(records);
    }
    
    // Fallback to edge function if key not available
    try {
      const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
        body: { action: 'encrypt-batch', data: { records } }
      });
      if (error) return records;
      return result?.encrypted || records;
    } catch {
      return records;
    }
  }, []);

  return { 
    encryptFields, 
    decryptFields, 
    decryptBatch, 
    encryptBatch,
    isReady, // True when client-side encryption is available
  };
}
