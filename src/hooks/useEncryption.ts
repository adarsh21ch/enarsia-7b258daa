import { supabase } from '@/integrations/supabase/client';

export function useEncryption() {
  const getValidSession = async () => {
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
            refreshError?.status === 403) {
          await supabase.auth.signOut();
          return null;
        }
        return session; // Return original session as fallback for other errors
      }
      
      return refreshData.session;
    }
    
    return session;
  };

  const invokeWithRetry = async (action: string, data: any, retries = 1): Promise<any> => {
    const session = await getValidSession();
    if (!session) {
      // No session - silently return null, don't log warning
      return null;
    }

    try {
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
          (error as any).status === 401 ||
          (error as any).context?.status === 401;

        if (retries > 0 && isAuthError) {
          console.log(`Auth error on ${action}, refreshing session and retrying... (${retries} retries left)`);
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.warn('Session refresh failed, signing out...');
            await supabase.auth.signOut();
            return null;
          }
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
