import { supabase } from '@/integrations/supabase/client';

export function useEncryption() {
  const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  };

  const encryptFields = async (data: { phone?: string; email?: string }) => {
    try {
      const session = await getSession();
      if (!session) {
        console.warn('No active session for encryption, returning original data');
        return data;
      }

      const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
        body: { action: 'encrypt', data }
      });

      if (error) {
        console.error('Encryption error:', error);
        return data;
      }

      return result.encrypted;
    } catch (err) {
      console.error('Encryption failed:', err);
      return data;
    }
  };

  const decryptFields = async (data: { phone?: string; email?: string }) => {
    try {
      const session = await getSession();
      if (!session) {
        console.warn('No active session for decryption, returning original data');
        return data;
      }

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
  };

  const decryptBatch = async <T extends { phone?: string; email?: string }>(records: T[]): Promise<T[]> => {
    if (records.length === 0) return records;

    try {
      const session = await getSession();
      if (!session) {
        console.warn('No active session for batch decryption, returning original data');
        return records;
      }

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
  };

  const encryptBatch = async <T extends { phone?: string; email?: string }>(records: T[]): Promise<T[]> => {
    if (records.length === 0) return records;

    try {
      const session = await getSession();
      if (!session) {
        console.warn('No active session for batch encryption, returning original data');
        return records;
      }

      const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
        body: { action: 'encrypt-batch', data: { records } }
      });

      if (error) {
        console.error('Batch encryption error:', error);
        return records;
      }

      return result.encrypted;
    } catch (err) {
      console.error('Batch encryption failed:', err);
      return records;
    }
  };

  return { encryptFields, decryptFields, decryptBatch, encryptBatch };
}
