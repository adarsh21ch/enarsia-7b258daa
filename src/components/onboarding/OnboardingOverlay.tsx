import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useProfile } from '@/hooks/useProfile';
import { ArrowRight, Phone, User, Tag, Filter, RefreshCw, Users, BarChart2, Calendar, PlusCircle, Upload } from 'lucide-react';
import {
  HighlightBox,
  LightDimOverlay,
  TopTooltipBanner,
  Confetti,
  useTargetHighlight,
} from './OnboardingPrimitives';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

interface StepDef {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionHint?: string;
  selector: string;
  navigateTo: string;
}

const STEPS: Record<number, StepDef> = {
  1: {
    icon: <Phone className="h-5 w-5 text-[#2563EB]" />,
    title: 'Your Calling Workspace',
    description: 'This is where you manage all your prospects. Every row is one person you can call and track.',
    actionHint: 'Try scrolling through your lead list below',
    selector: '[data-onboarding="lead-list"]',
    navigateTo: '/dashboard',
  },
  2: {
    icon: <User className="h-5 w-5 text-[#2563EB]" />,
    title: 'Open a Prospect',
    description: 'Tap any prospect row to see their full profile, call history, and notes.',
    actionHint: 'Try tapping a prospect — then press Got it',
    selector: '[data-onboarding="lead-row-1"]',
    navigateTo: '/dashboard',
  },
  3: {
    icon: <Tag className="h-5 w-5 text-[#2563EB]" />,
    title: 'Update Their Status',
    description: 'After each call, update the response — Interested, Follow-up, Not Interested, etc.',
    actionHint: 'Try selecting a response tag, then press Got it',
    selector: '[data-onboarding="response-select"]',
    navigateTo: '/dashboard',
  },
  4: {
    icon: <Filter className="h-5 w-5 text-[#2563EB]" />,
    title: 'Filter Your Prospects',
    description: 'Use Retargeting to filter prospects by their stage or status.',
    actionHint: 'Try tapping Retargeting to explore filters',
    selector: '[data-onboarding="retargeting-btn"]',
    navigateTo: '/dashboard',
  },
  5: {
    icon: <RefreshCw className="h-5 w-5 text-[#2563EB]" />,
    title: 'Go to Follow-Up',
    description: 'The Follow-Up tab shows your daily activity feed and prospect overview.',
    actionHint: 'Tap Follow-Up in the bottom menu',
    selector: '[data-onboarding="nav-followup"]',
    navigateTo: '/dashboard',
  },
  6: {
    icon: <Users className="h-5 w-5 text-[#2563EB]" />,
    title: 'See Prospects by Stage',
    description: 'Tap "Prospects" tab to see all your leads organized by their current stage.',
    actionHint: 'Tap the Prospects tab above',
    selector: '[data-onboarding="prospects-tab"]',
    navigateTo: '/listup',
  },
  7: {
    icon: <Tag className="h-5 w-5 text-[#2563EB]" />,
    title: 'Filter by Tag',
    description: 'Tap any tag to instantly see prospects at that stage. Try Enrolment or Interested.',
    actionHint: 'Try tapping a tag to filter',
    selector: '[data-onboarding="tag-filter-row"]',
    navigateTo: '/listup',
  },
  8: {
    icon: <BarChart2 className="h-5 w-5 text-[#2563EB]" />,
    title: 'Open TrackUp',
    description: 'TrackUp shows your daily performance numbers and tracking history.',
    actionHint: 'Tap TrackUp in the bottom menu',
    selector: '[data-onboarding="nav-trackup"]',
    navigateTo: '/listup',
  },
  9: {
    icon: <Calendar className="h-5 w-5 text-[#2563EB]" />,
    title: 'Your Daily Tracker',
    description: 'This grid tracks Leads, Responses, Video Sends, and Enrolments — updated automatically every day.',
    actionHint: 'Explore the tracking table below',
    selector: '[data-onboarding="trackup-table"]',
    navigateTo: '/tracking',
  },
  10: {
    icon: <PlusCircle className="h-5 w-5 text-[#2563EB]" />,
    title: 'Create Your Own Sheet',
    description: "You've been using demo data. Create YOUR sheet — tap + Add Sheet, name it, and start adding real leads.",
    actionHint: 'Tap the + Add Sheet button',
    selector: '[data-onboarding="add-sheet-btn"]',
    navigateTo: '/dashboard',
  },
  11: {
    icon: <Upload className="h-5 w-5 text-[#2563EB]" />,
    title: 'Add Your First Lead',
    description: "Import contacts from a file, or add your first lead manually. This is your real CRM!",
    actionHint: 'Tap Import to add leads from a file',
    selector: '[data-onboarding="import-btn"]',
    navigateTo: '/dashboard',
  },
};

export function OnboardingOverlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useProfile();
  const {
    currentStep, isOnboarding, isCompleted, showWelcome, loading,
    startTour, advanceStep, skipStep, completeOnboarding,
  } = useOnboarding();

  const [showCompletion, setShowCompletion] = useState(false);
  const advancingRef = useRef(false);

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

  // Handle Got It — ONLY way to advance (no auto-advance)
  const handleGotIt = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    try {
      if (currentStep === 11) {
        await completeOnboarding();
        setShowCompletion(true);
      } else {
        await advanceStep();
      }
    } finally {
      advancingRef.current = false;
    }
  }, [currentStep, advanceStep, completeOnboarding]);

  const handleSkip = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    try {
      if (currentStep === 11) {
        await completeOnboarding();
        setShowCompletion(true);
      } else {
        await skipStep();
      }
    } finally {
      advancingRef.current = false;
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
              You now know Nevora AI inside out. Your leads are ready. Time to start calling!
            </p>
            <button
              onClick={() => { setShowCompletion(false); navigate('/dashboard'); }}
              style={{
                width: '100%', height: 48, borderRadius: 12, background: '#2563EB',
                color: 'white', fontWeight: 600, fontSize: 16, border: 'none', cursor: 'pointer',
              }}
            >
              Start Calling →
            </button>
            <button
              onClick={() => { setShowCompletion(false); navigate('/dashboard'); }}
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
            Let's take a quick tour so you understand every feature. You can skip any step.
          </p>
          <button
            onClick={() => startTour()}
            disabled={loading}
            style={{
              width: '100%', height: 48, borderRadius: 12, background: '#2563EB',
              color: 'white', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer',
              opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? 'Setting up...' : 'Start Tour'} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Steps 1-11: Top banner + blue highlight box
  if (!stepDef || !isOnboarding) return null;

  return (
    <>
      {/* Light dim behind everything (doesn't block clicks) */}
      <LightDimOverlay targetRect={targetRect} />

      {/* Blue highlight box around target */}
      <HighlightBox targetRect={targetRect} />

      {/* Top tooltip banner with explanation + Got it button */}
      <TopTooltipBanner
        step={currentStep}
        totalSteps={11}
        icon={stepDef.icon}
        title={stepDef.title}
        description={stepDef.description}
        actionHint={stepDef.actionHint}
        onGotIt={handleGotIt}
        onSkip={handleSkip}
        isLastStep={currentStep === 11}
      />
    </>
  );
}
