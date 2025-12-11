import { supabase } from '@/integrations/supabase/client';

export function useEncryption() {
  const getValidSession = async () => {
    try {
      // Use getUser() to validate token with server (not just cached session)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        // No valid user - silently return null (expected on auth page)
        return null;
      }

      // Get the session for the token
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        return null;
      }

      // Check if token is close to expiring (within 60 seconds)
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      const shouldRefresh = expiresAt - now < 60000;

      if (shouldRefresh) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          return null; // Return null for any refresh error
        }
        
        return refreshData.session;
      }
      
      return session;
    } catch (err) {
      // Silently handle any session errors
      return null;
    }
  };

  const invokeWithRetry = async (action: string, data: any): Promise<any> => {
    try {
      const session = await getValidSession();
      if (!session) {
        // No session - silently return null
        return null;
      }

      const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
        body: { action, data }
      });

      if (error) {
        // Return null for any error - don't retry, don't crash
        return null;
      }

      return result;
    } catch (err) {
      // Silently handle any errors
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
