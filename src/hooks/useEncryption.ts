import { supabase } from '@/integrations/supabase/client';

export function useEncryption() {
  const getValidSession = async () => {
    // Always try to refresh the session first to ensure we have a valid token
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (!refreshError && refreshData.session) {
      return refreshData.session;
    }

    // Fallback to getSession if refresh fails
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.warn('No active session available');
      return null;
    }

    return session;
  };

  const invokeWithRetry = async (action: string, data: any, retries = 2): Promise<any> => {
    const session = await getValidSession();
    if (!session) {
      console.warn(`No active session for ${action}, returning original data`);
      return null;
    }

    try {
      const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
        body: { action, data }
      });

      if (error) {
        // If it's an auth error and we have retries left, force refresh and retry
        if (retries > 0 && (error.message?.includes('401') || error.message?.includes('token') || error.message?.includes('Unauthorized') || error.message?.includes('Invalid'))) {
          console.log(`Auth error on ${action}, forcing session refresh and retrying (${retries} retries left)...`);
          const { data: newSession } = await supabase.auth.refreshSession();
          if (newSession?.session) {
            return invokeWithRetry(action, data, retries - 1);
          }
        }
        console.error(`${action} error:`, error);
        return null;
      }

      return result;
    } catch (err) {
      console.error(`${action} failed:`, err);
      return null;
    }
  };

  const encryptFields = async (data: { phone?: string; email?: string }) => {
    const result = await invokeWithRetry('encrypt', data);
    return result?.encrypted || data;
  };

  const decryptFields = async (data: { phone?: string; email?: string }) => {
    const result = await invokeWithRetry('decrypt', data);
    return result?.decrypted || data;
  };

  const decryptBatch = async <T extends { phone?: string; email?: string }>(records: T[]): Promise<T[]> => {
    if (records.length === 0) return records;
    const result = await invokeWithRetry('decrypt-batch', { records });
    return result?.decrypted || records;
  };

  const encryptBatch = async <T extends { phone?: string; email?: string }>(records: T[]): Promise<T[]> => {
    if (records.length === 0) return records;
    const result = await invokeWithRetry('encrypt-batch', { records });
    return result?.encrypted || records;
  };

  return { encryptFields, decryptFields, decryptBatch, encryptBatch };
}
