import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding, OnboardingStep } from '@/hooks/useOnboarding';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Import, CheckCircle2, Loader2 } from 'lucide-react';
import {
  OnboardingBanner,
  FullScreenCard,
  OnboardingProgress,
  Confetti,
  TargetHighlight,
} from './OnboardingPrimitives';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

/** Step definition with auto-advance trigger */
interface StepDef {
  title: string;
  body: string;
  /** What triggers completion */
  trigger:
    | { type: 'click'; selector: string }   // advance when element is clicked
    | { type: 'delay'; ms: number }          // advance after delay (informational)
    | { type: 'interact'; selector: string } // advance when element receives focus/input
  /** Navigate to this route when step activates */
  navigateTo?: string;
  /** Highlight target */
  highlight?: { selector: string; label: string };
}

const STEP_DEFS: Record<number, StepDef> = {
  1: {
    title: '📋 Your Calling Sheet',
    body: 'This is where you manage all your prospects. We\'ve added 20 demo leads so you can explore.',
    trigger: { type: 'delay', ms: 4000 },
    navigateTo: '/dashboard',
    highlight: { selector: '[data-onboarding="lead-list"]', label: 'Your leads ↓' },
  },
  2: {
    title: '👆 Tap on Rahul Sharma',
    body: 'Open his profile to see all details. Tap the highlighted lead row below.',
    trigger: { type: 'click', selector: '[data-onboarding="lead-row-1"]' },
    highlight: { selector: '[data-onboarding="lead-row-1"]', label: 'Tap here ↓' },
  },
  3: {
    title: '👤 Lead Profile',
    body: 'Every prospect has their own profile — details, call status, tags, and activity history.',
    trigger: { type: 'delay', ms: 4000 },
    highlight: { selector: '[data-onboarding="lead-detail"]', label: 'Lead profile ↓' },
  },
  4: {
    title: '🏷️ Assign a Tag',
    body: 'Tags tell you where this prospect is in your process. Tap "Select..." on any lead to assign one.',
    trigger: { type: 'click', selector: '[data-onboarding="response-select"]' },
    highlight: { selector: '[data-onboarding="response-select"]', label: 'Tap to assign ↓' },
  },
  5: {
    title: '🔍 Retargeting Filter',
    body: 'Filter your leads by tag instantly. Tap the "Retargeting" button.',
    trigger: { type: 'click', selector: '[data-onboarding="retargeting-btn"]' },
    highlight: { selector: '[data-onboarding="retargeting-btn"]', label: 'Tap here ↓' },
  },
  6: {
    title: '📊 Activity History',
    body: 'Every action you take is automatically recorded here — tags, calls, it\'s all logged.',
    trigger: { type: 'delay', ms: 4000 },
    navigateTo: '/listup',
    highlight: { selector: '[data-onboarding="activity-list"]', label: 'Activity log ↓' },
  },
  7: {
    title: '🎯 Prospects by Tag',
    body: 'Your follow-up dashboard. Tap the "Prospects" tab to see leads grouped by tag.',
    trigger: { type: 'click', selector: '[data-onboarding="prospects-tab"]' },
    highlight: { selector: '[data-onboarding="prospects-tab"]', label: 'Tap here ↓' },
  },
  8: {
    title: '✅ To-Do List',
    body: 'Plan your day with tasks. Tap the input bar at the bottom to add one.',
    trigger: { type: 'interact', selector: '[data-onboarding="todo-input"] input' },
    navigateTo: '/action',
    highlight: { selector: '[data-onboarding="todo-input"]', label: 'Add task here ↓' },
  },
  9: {
    title: '📈 Track Your Numbers',
    body: 'TrackUp counts everything you do — leads, calls, responses, enrolments.',
    trigger: { type: 'delay', ms: 4000 },
    navigateTo: '/tracking',
    highlight: { selector: '[data-onboarding="trackup-table"]', label: 'Your numbers ↓' },
  },
  10: {
    title: '🛠️ Your Tools',
    body: 'Nevorai Flow, Forms, Notes, Shared Leads — all built in.',
    trigger: { type: 'delay', ms: 4000 },
    navigateTo: '/profile',
    highlight: { selector: '[data-onboarding="profile-tools"]', label: 'Your tools ↓' },
  },
};

export function OnboardingOverlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useProfile();
  const {
    isActive,
    currentStep,
    loading,
    setupDemoData,
    goToStep,
    completeOnboarding,
    cleanupDemoData,
    totalSteps,
  } = useOnboarding();

  const [showCleanupPrompt, setShowCleanupPrompt] = useState(false);
  const [stepCompleted, setStepCompleted] = useState(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Reset stepCompleted when step changes
  useEffect(() => {
    setStepCompleted(false);
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, [currentStep]);

  // Navigate to the correct page when a step becomes active
  useEffect(() => {
    if (!isActive || currentStep < 1 || currentStep > 10) return;
    const def = STEP_DEFS[currentStep];
    if (def?.navigateTo && location.pathname !== def.navigateTo) {
      navigate(def.navigateTo);
    }
  }, [currentStep, isActive, navigate, location.pathname]);

  // Auto-advance logic
  const advanceToNext = useCallback(() => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    setStepCompleted(true);
    // Brief pause to show ✅ then advance
    advanceTimerRef.current = setTimeout(() => {
      const next = currentStep + 1;
      if (next > 10) {
        goToStep(11 as OnboardingStep);
      } else {
        goToStep(next as OnboardingStep);
      }
    }, 800);
  }, [currentStep, goToStep]);

  // Set up triggers for current step
  useEffect(() => {
    if (!isActive || currentStep < 1 || currentStep > 10) return;
    const def = STEP_DEFS[currentStep];
    if (!def || stepCompleted) return;

    if (def.trigger.type === 'delay') {
      const timer = setTimeout(advanceToNext, def.trigger.ms);
      return () => clearTimeout(timer);
    }

    if (def.trigger.type === 'click') {
      const selector = def.trigger.selector;
      const handler = () => advanceToNext();

      // Poll for element (may not be rendered yet)
      const interval = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) {
          el.addEventListener('click', handler, { once: true, capture: true });
          clearInterval(interval);
        }
      }, 300);

      return () => {
        clearInterval(interval);
        const el = document.querySelector(selector);
        if (el) el.removeEventListener('click', handler, true);
      };
    }

    if (def.trigger.type === 'interact') {
      const selector = def.trigger.selector;
      const handler = () => advanceToNext();

      const interval = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) {
          el.addEventListener('focus', handler, { once: true });
          el.addEventListener('click', handler, { once: true });
          clearInterval(interval);
        }
      }, 300);

      return () => {
        clearInterval(interval);
        const el = document.querySelector(selector);
        if (el) {
          el.removeEventListener('focus', handler);
          el.removeEventListener('click', handler);
        }
      };
    }
  }, [currentStep, isActive, stepCompleted, advanceToNext]);

  if (!isActive && !showCleanupPrompt) return null;

  const firstName = profile?.display_name?.split(' ')[0] || 'there';

  // Cleanup prompt after completion
  if (showCleanupPrompt) {
    return (
      <OnboardingBanner>
        <div className="space-y-3">
          <h2 className="text-base font-bold text-foreground">🧹 Clean up demo data?</h2>
          <p className="text-sm text-muted-foreground">
            You've completed the tour. Want to remove the demo leads and start fresh?
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-xl text-xs"
              onClick={() => setShowCleanupPrompt(false)}
            >
              Keep for Reference
            </Button>
            <Button
              size="sm"
              className="flex-1 rounded-xl text-xs"
              onClick={async () => {
                await cleanupDemoData();
                setShowCleanupPrompt(false);
              }}
            >
              Remove Demo Data
            </Button>
          </div>
        </div>
      </OnboardingBanner>
    );
  }

  // STEP 0: Welcome Screen
  if (currentStep === 0) {
    return (
      <FullScreenCard>
        <img
          src={nevoraLogo}
          alt="Nevorai"
          className="w-20 h-20 rounded-2xl shadow-xl mx-auto animate-bounce"
          style={{ animationDuration: '2s' }}
        />
        <div className="space-y-3">
          <h1 className="text-2xl font-extrabold text-foreground">
            🎉 Welcome to Nevorai, {firstName}!
          </h1>
          <p className="text-muted-foreground text-[15px] leading-relaxed">
            Your smart CRM for network marketing.
          </p>
          <p className="text-sm text-muted-foreground">
            We've set up a demo workspace so you can explore — just follow the highlights and interact with the app!
          </p>
          <p className="text-xs text-muted-foreground">This quick tour takes about 2 minutes.</p>
        </div>
        <div className="space-y-3 pt-2">
          <Button
            onClick={async () => {
              await setupDemoData();
              goToStep(1);
              navigate('/dashboard');
            }}
            className="w-full h-12 rounded-xl font-bold text-base"
            disabled={loading}
          >
            {loading ? 'Setting up...' : "Let's Start the Tour"} <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </FullScreenCard>
    );
  }

  // STEP 11: Completion Screen
  if (currentStep === 11) {
    return (
      <>
        <Confetti />
        <FullScreenCard>
          <div className="text-5xl">🎉</div>
          <div className="space-y-3">
            <h1 className="text-2xl font-extrabold text-foreground">You're Ready!</h1>
            <p className="text-sm text-muted-foreground">You just explored all of Nevorai:</p>
            <div className="space-y-2 text-left bg-card rounded-2xl border border-border p-4">
              {[
                '✅ Calling — Manage your prospects',
                '🏷️ Tags — Organise by stage',
                '🔍 Retargeting — Filter instantly',
                '📊 Follow-Up — Track activity',
                '✅ To-Do — Plan your day',
                '📈 TrackUp — See your numbers',
                '🛠️ Profile — Your tools',
              ].map(item => (
                <div key={item} className="flex items-center gap-2">
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              Now import your REAL leads and start building your business!
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <Button
              onClick={() => {
                completeOnboarding();
                setShowCleanupPrompt(true);
                navigate('/dashboard');
              }}
              className="w-full h-12 rounded-xl font-bold text-base"
            >
              <Import className="h-4 w-4 mr-2" /> Import My Leads
            </Button>
            <button
              onClick={() => {
                completeOnboarding();
                setShowCleanupPrompt(true);
                navigate('/dashboard');
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Explore App on my own
            </button>
          </div>
        </FullScreenCard>
      </>
    );
  }

  // STEPS 1-10: Non-blocking top banner with auto-advance
  const def = STEP_DEFS[currentStep];
  if (!def) return null;

  return (
    <>
      {/* Pulsing highlight on the target UI element */}
      {def.highlight && !stepCompleted && (
        <TargetHighlight selector={def.highlight.selector} label={def.highlight.label} />
      )}

      {/* Top banner with instructions */}
      <OnboardingBanner>
        <OnboardingProgress current={currentStep} total={totalSteps} />
        <div className="space-y-1.5 pr-6">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            {def.title}
            {stepCompleted && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">{def.body}</p>
        </div>
        {/* Status indicator instead of button */}
        <div className="flex items-center gap-2 text-xs">
          {stepCompleted ? (
            <span className="flex items-center gap-1.5 text-green-600 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" /> Done — moving next...
            </span>
          ) : def.trigger.type === 'delay' ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Looking around...
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-primary font-medium animate-pulse">
              👆 Do the action highlighted below
            </span>
          )}
        </div>
      </OnboardingBanner>
    </>
  );
}
