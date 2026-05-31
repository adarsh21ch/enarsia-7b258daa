import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useContentAccounts } from '@/hooks/useContentAccounts';

interface Ctx {
  activeAccountId: string | null;
  setActiveAccountId: (id: string | null) => void;
}

const CreatorAccountContext = createContext<Ctx>({ activeAccountId: null, setActiveAccountId: () => {} });

const STORAGE_KEY = 'creator.activeAccountId';

export function CreatorAccountProvider({ children }: { children: ReactNode }) {
  const { accounts } = useContentAccounts();
  const [activeAccountId, setActiveAccountIdState] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });

  const setActiveAccountId = (id: string | null) => {
    setActiveAccountIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  // Auto-pick first account when none chosen or selection no longer exists
  useEffect(() => {
    if (accounts.length === 0) return;
    if (!activeAccountId || !accounts.find((a) => a.id === activeAccountId)) {
      setActiveAccountId(accounts[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  return (
    <CreatorAccountContext.Provider value={{ activeAccountId, setActiveAccountId }}>
      {children}
    </CreatorAccountContext.Provider>
  );
}

export const useCreatorAccount = () => useContext(CreatorAccountContext);
