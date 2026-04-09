import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import {
  SpotlightOverlay,
  OnboardingTooltip,
  StepPill,
  Confetti,
  useTargetRect,
} from './OnboardingPrimitives';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

interface StepDef {
  emoji: string;
  title: string;
  description: string;
  selector: string;
  navigateTo: string;
  trigger: 'click' | 'delay' | 'interact';
  delayMs?: number;
  skipLabel?: string;
}

const STEPS: Record<number, StepDef> = {
  1: {
    emoji: '📋',
    title: 'These are your leads',
    description: "Tap any lead to open their details.",
    selector: '[data-onboarding="lead-row-1"]',
    navigateTo: '/dashboard',
    trigger: 'click',
  },
  2: {
    emoji: '🏷️',
    title: 'Set a response for this lead',
    description: 'Tap the response field and choose a status — Interested, Not Picked, etc.',
    selector: '[data-onboarding="response-select"]',
    navigateTo: '/dashboard',
    trigger: 'click',
  },
  3: {
    emoji: '🎯',
    title: 'Filter leads by response',
    description: 'Tap Retargeting to see only leads with a specific status.',
    selector: '[data-onboarding="retargeting-btn"]',
    navigateTo: '/dashboard',
    trigger: 'click',
  },
  4: {
    emoji: '📅',
    title: 'Open Follow-Up',
    description: 'Tap Follow-Up to see your prospect pipeline.',
    selector: '[data-onboarding="nav-followup"]',
    navigateTo: '/dashboard',
    trigger: 'click',
  },
  5: {
    emoji: '👥',
    title: 'Switch to Prospects',
    description: 'See your leads grouped by stage and tag.',
    selector: '[data-onboarding="prospects-tab"]',
    navigateTo: '/listup',
    trigger: 'click',
  },
  6: {
    emoji: '🔖',
    title: 'Filter by prospect stage',
    description: 'Tap any tag to see only leads at that stage.',
    selector: '[data-onboarding="tag-filter-row"]',
    navigateTo: '/listup',
    trigger: 'click',
  },
  7: {
    emoji: '📊',
    title: 'Open TrackUp',
    description: 'See your daily activity numbers and team performance.',
    selector: '[data-onboarding="nav-trackup"]',
    navigateTo: '/listup',
    trigger: 'click',
  },
  8: {
    emoji: '📈',
    title: 'Your activity calendar',
    description: 'Every lead, response, and enrolment is tracked here by date.',
    selector: '[data-onboarding="trackup-table"]',
    navigateTo: '/tracking',
    trigger: 'delay',
    delayMs: 4000,
    skipLabel: 'Got it →',
  },
  9: {
    emoji: '📁',
    title: 'Create your own sheet',
    description: 'Add a new sheet to organize your real leads — separate from the demo.',
    selector: '[data-onboarding="add-sheet-btn"]',
    navigateTo: '/dashboard',
    trigger: 'click',
  },
  10: {
    emoji: '➕',
    title: 'Add your first real lead',
    description: 'Import from a file or add a lead manually. This is your real CRM now.',
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
    currentStep, isOnboarding, isCompleted, loading,
    startTour, advanceStep, skipStep, completeOnboarding,
    cleanupDemoData, requiredTab,
  } = useOnboarding();

  const [showCleanup, setShowCleanup] = useState(false);

  // Get current step definition
  const stepDef = STEPS[currentStep];
  const targetRect = useTargetRect(isOnboarding && stepDef ? stepDef.selector : null);

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
    const timer = setTimeout(() => advanceStep(), stepDef.delayMs || 4000);
    return () => clearTimeout(timer);
  }, [currentStep, isOnboarding, stepDef]);

  // Click/interact triggers
  useEffect(() => {
    if (!isOnboarding || !stepDef) return;
    if (stepDef.trigger !== 'click' && stepDef.trigger !== 'interact') return;

    const handler = () => {
      setTimeout(() => advanceStep(), 300);
    };

    const poll = setInterval(() => {
      const el = document.querySelector(stepDef.selector);
      if (el) {
        el.addEventListener('click', handler, { once: true, capture: true });
        clearInterval(poll);
      }
    }, 300);

    return () => {
      clearInterval(poll);
      const el = document.querySelector(stepDef.selector);
      if (el) el.removeEventListener('click', handler, true);
    };
  }, [currentStep, isOnboarding, stepDef]);

  // Nothing to show if completed and no cleanup
  if (isCompleted && !showCleanup) return null;
  if (currentStep >= 12) return null;

  const firstName = profile?.display_name?.split(' ')[0] || 'there';

  // STEP 0: Welcome Screen
  if (currentStep === 0) {
    return (
      <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-6">
        <div
          className="bg-white rounded-[14px] p-6 max-w-sm w-full space-y-5 animate-in fade-in zoom-in-95 duration-300 text-center"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}
        >
          <img
            src={nevoraLogo}
            alt="Nevora AI"
            className="w-16 h-16 rounded-2xl shadow-lg mx-auto"
          />
          <h1 className="text-xl font-extrabold text-[#111]">
            Welcome to Nevora AI! 👋
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Let's take a 2-minute tour so you understand every feature. You can skip any step.
          </p>
          <Button
            onClick={() => startTour()}
            disabled={loading}
            className="w-full h-12 rounded-xl font-bold text-base bg-[#2563EB] hover:bg-[#1d4ed8]"
          >
            {loading ? 'Setting up...' : 'Start Tour'} <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // STEP 11+ : Completion Screen
  if (currentStep === 11) {
    return (
      <>
        <Confetti />
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-6">
          <div
            className="bg-white rounded-[14px] p-6 max-w-sm w-full space-y-5 animate-in fade-in zoom-in-95 duration-300 text-center"
            style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}
          >
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-xl font-extrabold text-[#111]">You're all set! 🎉</h1>
            <p className="text-sm text-gray-500">
              You now know everything you need to grow your network. Let's get to work.
            </p>
            <Button
              onClick={async () => {
                await completeOnboarding();
                setShowCleanup(true);
                navigate('/dashboard');
              }}
              className="w-full h-12 rounded-xl font-bold text-base bg-[#2563EB] hover:bg-[#1d4ed8]"
            >
              Start Using Nevora AI <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Cleanup prompt
  if (showCleanup) {
    return (
      <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-6">
        <div
          className="bg-white rounded-[14px] p-6 max-w-sm w-full space-y-4 animate-in fade-in duration-300"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}
        >
          <h2 className="text-base font-bold text-[#111]">🧹 Clean up demo data?</h2>
          <p className="text-sm text-gray-500">Remove the demo leads and start fresh?</p>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={() => setShowCleanup(false)}>
              Keep
            </Button>
            <Button size="sm" className="flex-1 rounded-xl bg-[#2563EB]" onClick={async () => {
              await cleanupDemoData();
              setShowCleanup(false);
            }}>
              Remove
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // STEPS 1-10: Spotlight + Tooltip
  if (!stepDef) return null;

  return (
    <>
      <StepPill step={currentStep} total={10} />
      <SpotlightOverlay targetRect={targetRect} />
      {/* Make the target element clickable through the overlay */}
      {targetRect && (
        <div
          className="fixed z-[301] pointer-events-none"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            borderRadius: 14,
          }}
        >
          {/* This invisible div with pointer-events-auto lets clicks through to the actual element */}
        </div>
      )}
      <OnboardingTooltip
        targetRect={targetRect}
        step={currentStep}
        totalSteps={10}
        emoji={stepDef.emoji}
        title={stepDef.title}
        description={stepDef.description}
        onSkip={() => {
          if (currentStep === 10) {
            // Last step skip goes to completion
            advanceStep();
          } else if (currentStep === 4) {
            // Skip on nav step: auto-navigate
            navigate('/listup');
            skipStep();
          } else if (currentStep === 7) {
            navigate('/tracking');
            skipStep();
          } else if (currentStep === 9) {
            navigate('/dashboard');
            skipStep();
          } else {
            skipStep();
          }
        }}
        skipLabel={stepDef.skipLabel}
      />
    </>
  );
}
