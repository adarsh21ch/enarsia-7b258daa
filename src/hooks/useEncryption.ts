import { supabase } from '@/integrations/supabase/client';

export function useEncryption() {
  // Simplified invoke - edge function validates JWT, no need for client-side validation
  // This removes 4-5 redundant HTTP requests per encryption call
  const invokeEncryptFunction = async (action: string, data: any): Promise<any> => {
    try {
      // First check if we have a valid session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // No session - try to refresh
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          console.warn('No valid session for encryption, returning original data');
          return null;
        }
      }

      const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
        body: { action, data }
      });

      if (error) {
        // Check if it's an auth error (401)
        const errorMessage = error.message || '';
        if (errorMessage.includes('401') || errorMessage.includes('Invalid or expired token')) {
          // Try to refresh session once
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError) {
            // Retry the request after refresh
            const { data: retryResult, error: retryError } = await supabase.functions.invoke('encrypt-data', {
              body: { action, data }
            });
            if (!retryError) {
              return retryResult;
            }
          }
        }
        console.warn('Encryption function error:', error.message);
        return null;
      }

      return result;
    } catch (err) {
      // Silently handle any errors - return null so calling code uses original data
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
