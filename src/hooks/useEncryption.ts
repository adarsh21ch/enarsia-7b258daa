import { supabase } from '@/integrations/supabase/client';

export function useEncryption() {
  const getValidSession = async () => {
    // First try to refresh the session to ensure token is valid
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.warn('No active session available');
      return null;
    }

    // Check if token is about to expire (within 60 seconds)
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    
    if (expiresAt && expiresAt - now < 60) {
      console.log('Session token expiring soon, refreshing...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        console.warn('Failed to refresh session:', refreshError?.message);
        return session; // Return original session as fallback
      }
      return refreshData.session;
    }

    return session;
  };

  const invokeWithRetry = async (action: string, data: any, retries = 1): Promise<any> => {
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
        // If it's an auth error and we have retries left, refresh and retry
        if (retries > 0 && (error.message?.includes('401') || error.message?.includes('token') || error.message?.includes('Unauthorized'))) {
          console.log(`Auth error on ${action}, refreshing session and retrying...`);
          await supabase.auth.refreshSession();
          return invokeWithRetry(action, data, retries - 1);
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
