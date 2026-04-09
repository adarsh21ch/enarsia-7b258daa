import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Phone, User, Tag, Filter, RefreshCw, Users, BarChart2, Calendar, PlusCircle, Upload } from 'lucide-react';
import {
  FourPanelOverlay,
  OnboardingTooltip,
  StepPill,
  Confetti,
  useTargetHighlight,
} from './OnboardingPrimitives';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';
import { toast } from 'sonner';

interface StepDef {
  icon: React.ReactNode;
  title: string;
  description: string;
  selector: string;
  navigateTo: string;
  trigger: 'click' | 'delay' | 'gotit';
  delayMs?: number;
  skipLabel?: string;
  gotItLabel?: string;
}

const STEPS: Record<number, StepDef> = {
  1: {
    icon: <Phone className="h-5 w-5 text-[#2563EB]" />,
    title: 'Your Calling Workspace',
    description: 'This is where you manage all your prospects. Every row is one person. Tap any row to open their profile.',
    selector: '[data-onboarding="lead-list"]',
    navigateTo: '/dashboard',
    trigger: 'gotit',
  },
  2: {
    icon: <User className="h-5 w-5 text-[#2563EB]" />,
    title: 'Open a Prospect',
    description: 'Tap this prospect to open their full profile, call history, and notes.',
    selector: '[data-onboarding="lead-row-1"]',
    navigateTo: '/dashboard',
    trigger: 'click',
  },
  3: {
    icon: <Tag className="h-5 w-5 text-[#2563EB]" />,
    title: 'Update Their Status',
    description: 'After every call, update the status here — Interested, Follow-up, Not Interested, Video Send, and more.',
    selector: '[data-onboarding="response-select"]',
    navigateTo: '/dashboard',
    trigger: 'click',
  },
  4: {
    icon: <Filter className="h-5 w-5 text-[#2563EB]" />,
    title: 'Filter Your Prospects',
    description: 'Use Retargeting to filter prospects by their stage. Tap it to explore all filter options.',
    selector: '[data-onboarding="retargeting-btn"]',
    navigateTo: '/dashboard',
    trigger: 'click',
  },
  5: {
    icon: <RefreshCw className="h-5 w-5 text-[#2563EB]" />,
    title: 'Open Follow-Up',
    description: 'Now let\'s explore your Follow-Up dashboard. Tap Follow-Up in the menu below.',
    selector: '[data-onboarding="nav-followup"]',
    navigateTo: '/dashboard',
    trigger: 'click',
  },
  6: {
    icon: <Users className="h-5 w-5 text-[#2563EB]" />,
    title: 'See Prospects by Stage',
    description: 'Tap Prospects to see all your leads organized by their current tag or stage.',
    selector: '[data-onboarding="prospects-tab"]',
    navigateTo: '/listup',
    trigger: 'click',
  },
  7: {
    icon: <Tag className="h-5 w-5 text-[#2563EB]" />,
    title: 'Filter by Tag',
    description: 'Tap any tag to instantly see prospects at that stage. Try Enrolment or Interested.',
    selector: '[data-onboarding="tag-filter-row"]',
    navigateTo: '/listup',
    trigger: 'click',
  },
  8: {
    icon: <BarChart2 className="h-5 w-5 text-[#2563EB]" />,
    title: 'Check Your Numbers',
    description: 'See your daily performance stats. Tap TrackUp in the menu below.',
    selector: '[data-onboarding="nav-trackup"]',
    navigateTo: '/listup',
    trigger: 'click',
  },
  9: {
    icon: <Calendar className="h-5 w-5 text-[#2563EB]" />,
    title: 'Your Daily Activity Tracker',
    description: 'This grid tracks Leads, Responses, Not Picked, Video Sends, and Enrolments day by day — updated automatically.',
    selector: '[data-onboarding="trackup-table"]',
    navigateTo: '/tracking',
    trigger: 'delay',
    delayMs: 5000,
    gotItLabel: 'Got it →',
  },
  10: {
    icon: <PlusCircle className="h-5 w-5 text-[#2563EB]" />,
    title: 'Create Your Own Sheet',
    description: 'You\'ve been using demo data. Now create YOUR sheet — tap + Add Sheet, name it, and start adding real prospects.',
    selector: '[data-onboarding="add-sheet-btn"]',
    navigateTo: '/dashboard',
    trigger: 'click',
  },
  11: {
    icon: <Upload className="h-5 w-5 text-[#2563EB]" />,
    title: 'Add Your First Real Lead',
    description: 'Import contacts from a file, or add your first lead manually. This is your real CRM — let\'s fill it up.',
    selector: '[data-onboarding="import-btn"]',
    navigateTo: '/dashboard',
    trigger: 'click',
    skipLabel: 'Skip — You can add leads anytime from the Calling tab.',
  },
};

export function OnboardingOverlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useProfile();
  const {
    currentStep, isOnboarding, isCompleted, showWelcome, loading,
    startTour, advanceStep, skipStep, completeOnboarding, requiredTab,
  } = useOnboarding();

  const [showCompletion, setShowCompletion] = useState(false);

  const stepDef = STEPS[currentStep];
  const targetRect = useTargetHighlight(
    isOnboarding && stepDef ? stepDef.selector : null,
    isOnboarding
  );

  // Navigate to correct tab when step changes
  useEffect(() => {
    if (!isOnboarding || !stepDef) return;
    if (location.pathname !== stepDef.navigateTo) {
      navigate(stepDef.navigateTo);
    }
  }, [currentStep, isOnboarding]);

  // Auto-advance for delay triggers
  useEffect(() => {
    if (!isOnboarding || !stepDef || stepDef.trigger !== 'delay') return;
    const timer = setTimeout(() => advanceStep(), stepDef.delayMs || 5000);
    return () => clearTimeout(timer);
  }, [currentStep, isOnboarding, stepDef]);

  // Click triggers — listen for click on target element
  useEffect(() => {
    if (!isOnboarding || !stepDef) return;
    if (stepDef.trigger !== 'click') return;

    let cleanup: (() => void) | null = null;

    const poll = setInterval(() => {
      const el = document.querySelector(stepDef.selector);
      if (el) {
        clearInterval(poll);
        const handler = () => {
          setTimeout(() => advanceStep(), 400);
        };
        el.addEventListener('click', handler, { once: true, capture: true });
        cleanup = () => el.removeEventListener('click', handler, true);
      }
    }, 300);

    return () => {
      clearInterval(poll);
      cleanup?.();
    };
  }, [currentStep, isOnboarding, stepDef]);

  // Show completion screen when step goes to 12
  useEffect(() => {
    if (currentStep === 12 || (isCompleted && !showCompletion)) {
      // Only show completion if we just finished (not on page reload)
    }
  }, [currentStep, isCompleted]);

  // Handle step advance to 12 → show completion
  const handleGotIt = useCallback(async () => {
    if (currentStep === 11) {
      await completeOnboarding();
      setShowCompletion(true);
    } else {
      await advanceStep();
    }
  }, [currentStep, advanceStep, completeOnboarding]);

  const handleSkip = useCallback(async () => {
    if (currentStep === 11) {
      await completeOnboarding();
      setShowCompletion(true);
    } else {
      await skipStep();
    }
  }, [currentStep, skipStep, completeOnboarding]);

  // Completion screen
  if (showCompletion) {
    const firstName = profile?.display_name?.split(' ')[0] || 'there';
    return (
      <>
        <Confetti />
        <div className="fixed inset-0 z-[10000] bg-white flex items-center justify-center p-6">
          <div className="max-w-sm w-full text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
            {/* Animated checkmark */}
            <div className="mx-auto w-20 h-20 rounded-full bg-[#2563EB]/10 flex items-center justify-center">
              <svg viewBox="0 0 52 52" className="w-12 h-12">
                <circle cx="26" cy="26" r="24" fill="none" stroke="#2563EB" strokeWidth="2" className="animate-[draw-circle_0.6s_ease_forwards]" />
                <path fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M14 27l8 8 16-16" className="animate-[draw-check_0.4s_0.4s_ease_forwards]" style={{ strokeDasharray: 48, strokeDashoffset: 48 }} />
              </svg>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 500, color: '#111' }}>
              You're all set, {firstName}! 🎉
            </h1>
            <p style={{ fontSize: 14, color: '#666', maxWidth: 280, margin: '0 auto', lineHeight: 1.6 }}>
              You now know Nevora AI inside out. Your leads are ready. Time to start calling and building your team.
            </p>
            <button
              onClick={() => {
                setShowCompletion(false);
                navigate('/dashboard');
              }}
              style={{
                width: '100%',
                height: 48,
                borderRadius: 12,
                background: '#2563EB',
                color: 'white',
                fontWeight: 600,
                fontSize: 16,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Start Calling →
            </button>
            <button
              onClick={() => {
                setShowCompletion(false);
                navigate('/dashboard');
              }}
              style={{ fontSize: 13, color: '#999', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Explore on my own
            </button>
          </div>
        </div>
      </>
    );
  }

  // Nothing to show
  if (isCompleted && !showWelcome) return null;
  if (currentStep >= 12) return null;

  // Welcome screen (step 0)
  if (showWelcome) {
    return (
      <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-6">
        <div
          className="bg-white rounded-[14px] p-6 max-w-sm w-full space-y-5 animate-in fade-in zoom-in-95 duration-300 text-center"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}
        >
          <img src={nevoraLogo} alt="Nevora AI" className="w-16 h-16 rounded-2xl shadow-lg mx-auto" />
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>Welcome to Nevora AI! 👋</h1>
          <p style={{ fontSize: 14, color: '#666' }}>
            Let's take a 2-minute tour so you understand every feature. You can skip any step.
          </p>
          <button
            onClick={() => startTour()}
            disabled={loading}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 12,
              background: '#2563EB',
              color: 'white',
              fontWeight: 700,
              fontSize: 16,
              border: 'none',
              cursor: 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading ? 'Setting up...' : 'Start Tour'} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Steps 1-11
  if (!stepDef || !isOnboarding) return null;

  return (
    <>
      <StepPill step={currentStep} total={11} />
      <FourPanelOverlay targetRect={targetRect} />
      <OnboardingTooltip
        targetRect={targetRect}
        step={currentStep}
        totalSteps={11}
        icon={stepDef.icon}
        title={stepDef.title}
        description={stepDef.description}
        onGotIt={handleGotIt}
        onSkip={handleSkip}
        gotItLabel={stepDef.gotItLabel}
        skipLabel={stepDef.skipLabel}
        isLastStep={currentStep === 11}
      />
    </>
  );
}
