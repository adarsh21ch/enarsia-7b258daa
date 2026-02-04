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
          console.log('No session token available, skipping encryption key fetch');
          return;
        }

        // Check if session is about to expire (within 60 seconds)
        const expiresAt = sessionData.session.expires_at;
        const now = Date.now();
        if (expiresAt && (expiresAt * 1000) - now < 60000) {
          console.log('Session expiring soon, attempting refresh...');
          // Try to refresh first
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshData?.session) {
            console.log('Session refresh failed, skipping encryption key fetch');
            return;
          }
          console.log('Session refreshed successfully');
        }

        if (isCancelled) return;

        const { data, error } = await supabase.functions.invoke('get-encryption-key');
        
        if (isCancelled) return;

        if (error) {
          const errorMessage = error.message || '';
          const is401 = errorMessage.includes('401') || errorMessage.includes('non-2xx');
          
          // Handle token expired - try to refresh session once
          if (is401 && retryCount === 0) {
            console.log('Encryption key fetch failed with 401, attempting session refresh...');
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshData?.session && !isCancelled) {
              console.log('Session refreshed, retrying encryption key fetch...');
              // Small delay after refresh to ensure new token is used
              await new Promise(resolve => setTimeout(resolve, 100));
              return fetchKey(1);
            }
            console.log('Session refresh failed or cancelled, proceeding without encryption key');
            return;
          }
          
          // After retry or other errors, proceed without encryption key
          console.warn('Failed to fetch encryption key:', errorMessage);
          return;
        }

        if (data?.key && !isCancelled) {
          setEncryptionKey(data.key);
          setIsReady(true);
          console.log('Encryption key loaded successfully');
        }
      } catch (err) {
        // Silently handle errors to prevent blank screens
        if (!isCancelled) {
          console.warn('Error fetching encryption key (caught):', err);
        }
      }
    };

    // Small delay to ensure auth state is fully settled
    const timeoutId = setTimeout(() => {
      fetchKey();
    }, 200); // Increased delay for better auth state settling

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
