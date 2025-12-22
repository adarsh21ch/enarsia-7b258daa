import { supabase } from '@/integrations/supabase/client';

export function useEncryption() {
  // Always get fresh session before calling edge function
  const invokeEncryptFunction = async (action: string, data: any): Promise<any> => {
    try {
      // Force refresh to get a valid token
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      
      if (sessionError || !session) {
        console.warn('No valid session for encryption, returning original data');
        return null;
      }

      const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
        body: { action, data }
      });

      if (error) {
        console.warn('Encryption function error:', error.message);
        return null;
      }

      return result;
    } catch (err) {
      console.warn('Encryption hook error:', err);
      return null;
    }
  };

  const encryptFields = async (data: { phone?: string; email?: string }) => {
    const result = await invokeEncryptFunction('encrypt', data);
    return result?.encrypted || data;
  };

  const decryptFields = async (data: { phone?: string; email?: string }) => {
    const result = await invokeEncryptFunction('decrypt', data);
    return result?.decrypted || data;
  };

  const decryptBatch = async <T extends { phone?: string; email?: string }>(records: T[]): Promise<T[]> => {
    if (records.length === 0) return records;
    const result = await invokeEncryptFunction('decrypt-batch', { records });
    return result?.decrypted || records;
  };

  const encryptBatch = async <T extends { phone?: string; email?: string }>(records: T[]): Promise<T[]> => {
    if (records.length === 0) return records;
    const result = await invokeEncryptFunction('encrypt-batch', { records });
    return result?.encrypted || records;
  };

  return { encryptFields, decryptFields, decryptBatch, encryptBatch };
}
