import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useEncryption() {
  const encryptFields = useCallback(async (data: { phone?: string; email?: string }) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
        body: { action: 'encrypt', data }
      });

      if (error) {
        console.error('Encryption error:', error);
        return data; // Return original on error
      }

      return result.encrypted;
    } catch (err) {
      console.error('Encryption failed:', err);
      return data;
    }
  }, []);

  const decryptFields = useCallback(async (data: { phone?: string; email?: string }) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
        body: { action: 'decrypt', data }
      });

      if (error) {
        console.error('Decryption error:', error);
        return data;
      }

      return result.decrypted;
    } catch (err) {
      console.error('Decryption failed:', err);
      return data;
    }
  }, []);

  const decryptBatch = useCallback(async <T extends { phone?: string; email?: string }>(records: T[]): Promise<T[]> => {
    if (records.length === 0) return records;

    try {
      const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
        body: { action: 'decrypt-batch', data: { records } }
      });

      if (error) {
        console.error('Batch decryption error:', error);
        return records;
      }

      return result.decrypted;
    } catch (err) {
      console.error('Batch decryption failed:', err);
      return records;
    }
  }, []);

  return { encryptFields, decryptFields, decryptBatch };
}
