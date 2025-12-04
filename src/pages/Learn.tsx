import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { BookOpen, Play, FileText, Award, Lock } from 'lucide-react';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

const learningModules = [
  { title: 'Getting Started', icon: Play, lessons: 5, completed: 0, color: 'from-blue-500/20 to-blue-500/5' },
  { title: 'Follow-Up Mastery', icon: FileText, lessons: 8, completed: 0, color: 'from-violet-500/20 to-violet-500/5' },
  { title: 'Conversion Tactics', icon: Award, lessons: 6, completed: 0, color: 'from-amber-500/20 to-amber-500/5' },
  { title: 'Advanced Strategies', icon: BookOpen, lessons: 10, completed: 0, color: 'from-emerald-500/20 to-emerald-500/5' },
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-24">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img 
              src={nevoraLogo} 
              alt="NevorAI Logo" 
              className="h-10 w-10 rounded-xl object-cover shadow-md"
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight">NevorAI</h1>
              <p className="text-[10px] text-muted-foreground font-medium">Never miss a followup Again</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-4 px-4 space-y-4">
        <div className="mb-5">
          <h2 className="text-2xl font-bold tracking-tight">LearnUp</h2>
          <p className="text-sm text-muted-foreground">Level up your skills</p>
          <div className="flex items-center gap-1 mt-2">
            <div className="w-8 h-1 bg-primary rounded-full" />
            <div className="w-2 h-1 bg-primary/50 rounded-full" />
            <div className="w-1 h-1 bg-primary/30 rounded-full" />
          </div>
        </div>
        {learningModules.map((module, index) => {
          const Icon = module.icon;
          return (
            <div
              key={index}
              className={cn(
                "relative overflow-hidden rounded-2xl p-4",
                "bg-gradient-to-br backdrop-blur-sm",
                "shadow-lg shadow-black/5 border border-white/10",
                "transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer",
                module.color
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-card/50 backdrop-blur-sm shadow-inner">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{module.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {module.completed}/{module.lessons} lessons completed
                  </p>
                  <div className="h-1.5 bg-muted/50 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${(module.completed / module.lessons) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg">
                  <Lock className="h-3 w-3" />
                  <span>Soon</span>
                </div>
              </div>
              {/* Decorative element */}
              <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5" />
            </div>
          );
        })}
      </main>

      <BottomNav />
    </div>
  );
}
