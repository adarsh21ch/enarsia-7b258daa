import { supabase } from '@/integrations/supabase/client';

export function useEncryption() {
  const getValidSession = async () => {
    try {
      // First try to get the current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        // No session - don't log warning, this is expected on auth page
        return null;
      }

      // Check if token is close to expiring (within 60 seconds)
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      const shouldRefresh = expiresAt - now < 60000;

      if (shouldRefresh) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          // Session is invalid - sign out to force re-login
          if (refreshError?.message?.includes('session_not_found') || 
              refreshError?.message?.includes('Invalid') ||
              refreshError?.message?.includes('Refresh Token Not Found') ||
              refreshError?.status === 403 ||
              refreshError?.status === 400) {
            await supabase.auth.signOut();
            return null;
          }
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

  const invokeWithRetry = async (action: string, data: any, retries = 1): Promise<any> => {
    try {
      const session = await getValidSession();
      if (!session) {
        // No session - silently return null, don't log warning
        return null;
      }

      const { data: result, error } = await supabase.functions.invoke('encrypt-data', {
        body: { action, data }
      });

      if (error) {
        // Check for auth errors - look in message, status, and context
        const isAuthError = 
          error.message?.includes('401') || 
          error.message?.includes('token') || 
          error.message?.includes('Unauthorized') || 
          error.message?.includes('Invalid') ||
          error.message?.includes('non-2xx') ||
          error.message?.includes('expired') ||
          (error as any).status === 401 ||
          (error as any).context?.status === 401;

        if (retries > 0 && isAuthError) {
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            await supabase.auth.signOut();
            return null;
          }
          return invokeWithRetry(action, data, retries - 1);
        }
        // Return null for any error - don't crash the app
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
