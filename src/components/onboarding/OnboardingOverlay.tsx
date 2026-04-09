import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useProfile } from '@/hooks/useProfile';
import {
  BlockingOverlay,
  StepBanner,
  FallbackCard,
  Confetti,
  useTargetElevation,
  hardCleanupAllOnboarding,
} from './OnboardingPrimitives';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

/* ─── Step Registry ─── */
interface StepDef {
  id: number;
  route: string;
  title: string;
  description: string;
  actionHint?: string;
  selector: string;
  type: 'info' | 'action';
  fallback: 'show-centered' | 'skip';
}

const STEP_REGISTRY: StepDef[] = [
  {
    id: 1,
    route: '/dashboard',
    title: 'Your Calling Workspace',
    description: 'This is where you manage your prospects & daily calling activity.',
    selector: '[data-onboarding="lead-list"]',
    type: 'info',
    fallback: 'show-centered',
  },
  {
    id: 2,
    route: '/dashboard',
    title: 'Your Leads',
    description: 'Each row is a prospect. Tap any row to see details, notes & history.',
    actionHint: 'Try tapping a lead row',
    selector: '[data-onboarding="lead-row-1"]',
    type: 'info',
    fallback: 'show-centered',
  },
  {
    id: 3,
    route: '/dashboard',
    title: 'Update Response',
    description: 'After every call, update their response — Interested, Follow-up, etc.',
    actionHint: 'Try selecting a response',
    selector: '[data-onboarding="response-select"]',
    type: 'info',
    fallback: 'show-centered',
  },
  {
    id: 4,
    route: '/dashboard',
    title: 'Filter Prospects',
    description: 'Use Retargeting to quickly filter leads by status or response.',
    selector: '[data-onboarding="retargeting-btn"]',
    type: 'info',
    fallback: 'show-centered',
  },
  {
    id: 5,
    route: '/dashboard',
    title: 'Go to Follow-Up',
    description: 'The Follow-Up tab helps you track activity and never miss a follow-up.',
    actionHint: 'Tap Follow-Up in the bottom menu',
    selector: '[data-onboarding="nav-followup"]',
    type: 'action',
    fallback: 'show-centered',
  },
  {
    id: 6,
    route: '/listup',
    title: 'Prospects by Stage',
    description: 'Switch to the Prospects tab to view leads organized by their stage.',
    selector: '[data-onboarding="prospects-tab"]',
    type: 'info',
    fallback: 'show-centered',
  },
  {
    id: 7,
    route: '/listup',
    title: 'Filter by Tag',
    description: 'Tap any tag badge to filter leads instantly — Enrolment, Hot Lead, etc.',
    selector: '[data-onboarding="tag-filter-row"]',
    type: 'info',
    fallback: 'show-centered',
  },
  {
    id: 8,
    route: '/listup',
    title: 'Open TrackUp',
    description: 'TrackUp shows your daily numbers and performance trends.',
    actionHint: 'Tap TrackUp in the bottom menu',
    selector: '[data-onboarding="nav-trackup"]',
    type: 'action',
    fallback: 'show-centered',
  },
  {
    id: 9,
    route: '/tracking',
    title: 'Your Daily Tracker',
    description: 'This tracks Leads, Responses, Videos Sent & Enrolments — updated daily.',
    selector: '[data-onboarding="trackup-table"]',
    type: 'info',
    fallback: 'show-centered',
  },
  {
    id: 10,
    route: '/dashboard',
    title: 'Create Your Sheet',
    description: 'Create your own sheet to organize leads by campaign or category.',
    selector: '[data-onboarding="add-sheet-btn"]',
    type: 'info',
    fallback: 'show-centered',
  },
  {
    id: 11,
    route: '/dashboard',
    title: 'Import Leads',
    description: 'Import your contact list from a file — or add leads manually.',
    selector: '[data-onboarding="import-btn"]',
    type: 'info',
    fallback: 'show-centered',
  },
];

function getStepDef(step: number): StepDef | undefined {
  return STEP_REGISTRY.find(s => s.id === step);
}

/* ─── Main Overlay Component ─── */
export function OnboardingOverlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useProfile();
  const {
    currentStep, isOnboarding, isCompleted, showWelcome, loading,
    startTour, advanceStep, skipStep, completeOnboarding, skipAllOnboarding,
  } = useOnboarding();

  const [showCompletion, setShowCompletion] = useState(false);
  const advancingRef = useRef(false);
  const [routeReady, setRouteReady] = useState(false);

  const stepDef = getStepDef(currentStep);

  // Route management: navigate to required route when step changes
  useEffect(() => {
    if (!isOnboarding || !stepDef) {
      setRouteReady(false);
      return;
    }

    if (location.pathname === stepDef.route) {
      // Small delay for DOM to render after route mount
      const t = setTimeout(() => setRouteReady(true), 350);
      return () => clearTimeout(t);
    } else {
      setRouteReady(false);
      navigate(stepDef.route);
    }
  }, [currentStep, isOnboarding, stepDef?.route, location.pathname]);

  // Target elevation — only active when route is ready
  const targetSelector = routeReady && stepDef ? `${stepDef.selector}` : null;
  const elevation = useTargetElevation(targetSelector, routeReady && isOnboarding);

  // Action step auto-advance: watch for route changes matching the expected target
  useEffect(() => {
    if (!isOnboarding || !stepDef || stepDef.type !== 'action') return;
    if (advancingRef.current) return;

    // For step 5: user needs to navigate to /listup
    // For step 8: user needs to navigate to /tracking
    const expectedRoute =
      stepDef.id === 5 ? '/listup' :
      stepDef.id === 8 ? '/tracking' :
      null;

    if (expectedRoute && location.pathname === expectedRoute) {
      advancingRef.current = true;
      advanceStep().finally(() => { advancingRef.current = false; });
    }
  }, [location.pathname, isOnboarding, stepDef]);

  // Hard cleanup on unmount or completion
  useEffect(() => {
    return () => {
      hardCleanupAllOnboarding();
    };
  }, []);

  // Also cleanup when onboarding ends
  useEffect(() => {
    if (isCompleted && !showCompletion) {
      hardCleanupAllOnboarding();
    }
  }, [isCompleted]);

  const handleGotIt = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    try {
      hardCleanupAllOnboarding();
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

  const handleSkipAll = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    try {
      hardCleanupAllOnboarding();
      await skipAllOnboarding();
    } finally {
      advancingRef.current = false;
    }
  }, [skipAllOnboarding]);

  // ─── Completion Screen ───
  if (showCompletion) {
    const firstName = profile?.display_name?.split(' ')[0] || 'there';
    return (
      <>
        <Confetti />
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6"
          style={{ background: 'hsl(var(--background))' }}>
          <div className="max-w-sm w-full text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'hsl(var(--primary) / 0.1)' }}>
              <svg viewBox="0 0 52 52" className="w-12 h-12">
                <circle cx="26" cy="26" r="24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"
                  className="animate-[draw-circle_0.6s_ease_forwards]" />
                <path fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round"
                  strokeLinejoin="round" d="M14 27l8 8 16-16"
                  className="animate-[draw-check_0.4s_0.4s_ease_forwards]"
                  style={{ strokeDasharray: 48, strokeDashoffset: 48 }} />
              </svg>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
              🎉 Congratulations, {firstName}!
            </h1>
            <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', maxWidth: 280, margin: '0 auto', lineHeight: 1.6 }}>
              You've completed the quick tour. Now you can use Nevorai normally.
            </p>
            <button
              onClick={() => { setShowCompletion(false); navigate('/dashboard'); }}
              style={{
                width: '100%', height: 48, borderRadius: 12,
                background: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                fontWeight: 600, fontSize: 16, border: 'none', cursor: 'pointer',
              }}
            >
              Okay, Thanks →
            </button>
            <button
              onClick={() => { setShowCompletion(false); navigate('/dashboard'); }}
              style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Continue Learning
            </button>
          </div>
        </div>
      </>
    );
  }

  // ─── Nothing to show ───
  if (isCompleted && !showWelcome) return null;
  if (currentStep >= 12) return null;

  // ─── Welcome Screen (step 0) ───
  if (showWelcome) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6"
        style={{ background: 'rgba(0,0,0,0.5)' }}>
        <div
          className="rounded-[14px] p-6 max-w-sm w-full space-y-5 animate-in fade-in zoom-in-95 duration-300 text-center"
          style={{ background: 'hsl(var(--card))', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}
        >
          <img src={nevoraLogo} alt="Nevora AI" className="w-16 h-16 rounded-2xl shadow-lg mx-auto" />
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'hsl(var(--foreground))' }}>
            Welcome 👋
          </h1>
          <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))' }}>
            Let's quickly show you how Nevorai works in a few easy steps.
          </p>
          <button
            onClick={() => startTour()}
            disabled={loading}
            style={{
              width: '100%', height: 48, borderRadius: 12,
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Setting up...' : "Let's Start →"}
          </button>
          <button
            onClick={() => skipAllOnboarding()}
            style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  // ─── Steps 1–11 ───
  if (!stepDef || !isOnboarding) return null;

  const showFallback = elevation.ready && !elevation.found;
  const isStepReady = elevation.ready && elevation.found;

  return (
    <>
      {/* Blocking overlay — always visible during onboarding steps */}
      <BlockingOverlay />

      {/* Fallback card when target not found */}
      {showFallback && (
        <FallbackCard
          title={stepDef.title}
          description={stepDef.description}
          onGotIt={handleGotIt}
          isLastStep={currentStep === 11}
        />
      )}

      {/* Step banner — always visible */}
      <StepBanner
        step={currentStep}
        totalSteps={11}
        title={stepDef.title}
        description={stepDef.description}
        actionHint={stepDef.actionHint}
        stepType={stepDef.type}
        isReady={isStepReady || showFallback}
        isLastStep={currentStep === 11}
        onGotIt={handleGotIt}
        onSkip={handleSkipAll}
      />
    </>
  );
}
