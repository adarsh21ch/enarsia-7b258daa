import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProspects } from '@/hooks/useProspects';
import { Header } from '@/components/layout/Header';
import { ProspectTable } from '@/components/prospects/ProspectTable';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { prospects, loading, addProspect, updateProspect, deleteProspect, importProspects } = useProspects();

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Follow-Up List</h1>
          <p className="text-sm text-muted-foreground">
            Manage and track your sales prospects
          </p>
        </div>
        <ProspectTable
          prospects={prospects}
          loading={loading}
          onAdd={addProspect}
          onUpdate={updateProspect}
          onDelete={deleteProspect}
          onImport={importProspects}
        />
      </main>
    </div>
  );
}
