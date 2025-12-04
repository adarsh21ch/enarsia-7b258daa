import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Play, FileText, Award } from 'lucide-react';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const learningModules = [
  { title: 'Getting Started', icon: Play, lessons: 5, completed: 0 },
  { title: 'Follow-Up Mastery', icon: FileText, lessons: 8, completed: 0 },
  { title: 'Conversion Tactics', icon: Award, lessons: 6, completed: 0 },
  { title: 'Advanced Strategies', icon: BookOpen, lessons: 10, completed: 0 },
];

export default function Learn() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-4">
        <h1 className="text-2xl font-bold">LearnUp</h1>
        <p className="text-sm text-muted-foreground">Level up your skills</p>
      </header>

      <main className="container py-4 px-4 space-y-4">
        {learningModules.map((module, index) => {
          const Icon = module.icon;
          return (
            <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base mb-1">{module.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {module.completed}/{module.lessons} lessons completed
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Coming Soon
                </div>
              </CardContent>
            </Card>
          );
        })}
      </main>

      <BottomNav />
    </div>
  );
}
