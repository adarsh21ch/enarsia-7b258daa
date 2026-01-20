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
    // No user - clear key and don't fetch
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

    let isCancelled = false;

    const fetchKey = async (retryCount = 0) => {
      try {
        // Get current session to ensure we have a valid token
        const { data: sessionData } = await supabase.auth.getSession();
        
        // No valid session - don't attempt fetch (prevents 401 on auth pages)
        if (!sessionData?.session?.access_token) {
          return;
        }

        // Check if session is about to expire (within 60 seconds)
        const expiresAt = sessionData.session.expires_at;
        if (expiresAt && (expiresAt * 1000) - Date.now() < 60000) {
          // Try to refresh first
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.log('Session expiring soon and refresh failed, skipping encryption key fetch');
            return;
          }
        }

        if (isCancelled) return;

        const { data, error } = await supabase.functions.invoke('get-encryption-key');
        
        if (isCancelled) return;

        if (error) {
          // Handle token expired - try to refresh session once
          if (error.message?.includes('401') || error.message?.includes('TOKEN_EXPIRED')) {
            if (retryCount === 0) {
              const { error: refreshError } = await supabase.auth.refreshSession();
              if (!refreshError && !isCancelled) {
                // Retry with refreshed token
                return fetchKey(1);
              }
            }
            // After retry or if refresh failed, proceed without encryption key
            return;
          }
          console.warn('Failed to fetch encryption key:', error.message);
          return;
        }

        if (data?.key && !isCancelled) {
          setEncryptionKey(data.key);
          setIsReady(true);
        }
      } catch (err) {
        // Silently handle errors to prevent blank screens
        if (!isCancelled) {
          console.warn('Error fetching encryption key:', err);
        }
      }
    };

    // Small delay to ensure auth state is fully settled
    const timeoutId = setTimeout(() => {
      fetchKey();
    }, 100);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
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
