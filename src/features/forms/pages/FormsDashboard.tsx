import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { FormsListTab } from '../components/FormsListTab';
import { CreateFormInline } from '../components/CreateFormInline';
import formsLogo from '@/assets/nevorai-forms-logo.png';
import type { NevoraFormWithFields } from '../types';

export default function FormsDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('my-forms');
  const [editingForm, setEditingForm] = useState<NevoraFormWithFields | null>(null);

  useEffect(() => {
    if (!user && !authLoading) navigate('/auth');
  }, [user, authLoading, navigate]);

  const handleEdit = (form: NevoraFormWithFields) => {
    setEditingForm(form);
    setActiveTab('create');
  };

  const handleCreateSuccess = () => {
    setEditingForm(null);
    setActiveTab('my-forms');
  };

  if (!user) return null;

  return (
    <div className="app-layout bg-background">
      <header className="fixed-header z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={formsLogo} alt="Enarsia Forms" width={28} height={28} className="rounded-md shrink-0" loading="lazy" />
          <h1 className="text-base font-semibold tracking-tight">Enarsia Forms</h1>
        </div>
      </header>

      <main className="scrollable-content">
        <div className="max-w-4xl mx-auto py-4 px-4 pb-20">
          <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); if (v === 'my-forms') setEditingForm(null); }}>
            <TabsList className="grid w-full grid-cols-2 h-10 bg-blue-50/80 dark:bg-blue-950/30 p-1 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
              <TabsTrigger
                value="my-forms"
                className="rounded-lg text-sm font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-blue-900/40 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-blue-200/50 dark:data-[state=active]:border-blue-800/50 transition-all"
              >
                My Forms
              </TabsTrigger>
              <TabsTrigger
                value="create"
                className="rounded-lg text-sm font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-blue-900/40 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-blue-200/50 dark:data-[state=active]:border-blue-800/50 transition-all"
              >
                {editingForm ? 'Edit Form' : 'Create Form'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-forms" className="mt-4">
              <FormsListTab onEdit={handleEdit} />
            </TabsContent>

            <TabsContent value="create" className="mt-4">
              <CreateFormInline
                key={editingForm?.id || 'new'}
                editingForm={editingForm}
                onSuccess={handleCreateSuccess}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
