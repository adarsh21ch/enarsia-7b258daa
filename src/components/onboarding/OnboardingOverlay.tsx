import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding, OnboardingStep } from '@/hooks/useOnboarding';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Import } from 'lucide-react';
import {
  OnboardingBanner,
  FullScreenCard,
  OnboardingProgress,
  Confetti,
  TargetHighlight,
} from './OnboardingPrimitives';
import nevoraLogo from '@/assets/nevorai-logo.jpeg';

export function OnboardingOverlay() {
  const navigate = useNavigate();
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
            We've set up a demo workspace so you can explore the app right now — no setup needed.
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

  // Target element selectors + labels for each step
  // These highlight the exact UI element the user should interact with
  const stepHighlights: Record<number, { selector: string; label: string } | null> = {
    1: { selector: '[data-onboarding="lead-list"]', label: 'Your leads ↓' },
    2: { selector: '[data-onboarding="lead-row-1"]', label: 'Tap here ↓' },
    3: { selector: '[data-onboarding="lead-detail"]', label: 'Lead profile ↓' },
    4: { selector: '[data-onboarding="response-select"]', label: 'Tap to assign ↓' },
    5: { selector: '[data-onboarding="retargeting-btn"]', label: 'Tap here ↓' },
    6: { selector: '[data-onboarding="activity-list"]', label: 'Activity log ↓' },
    7: { selector: '[data-onboarding="prospects-tab"]', label: 'Tap here ↓' },
    8: { selector: '[data-onboarding="todo-input"]', label: 'Add task here ↓' },
    9: { selector: '[data-onboarding="trackup-table"]', label: 'Your numbers ↓' },
    10: { selector: '[data-onboarding="profile-tools"]', label: 'Your tools ↓' },
  };

  // STEPS 1-10: Non-blocking top banner with target highlighting
  const stepContent: Record<number, { title: string; body: string; hint?: string; nextLabel: string; onNext: () => void }> = {
    1: {
      title: '📋 Your Calling Sheet',
      body: 'This is where you manage all your prospects. We\'ve added 20 demo leads so you can practice.',
      hint: '👆 In real life, you\'ll import your own contacts here.',
      nextLabel: 'Got it',
      onNext: () => goToStep(2),
    },
    2: {
      title: '👆 Tap on Rahul Sharma',
      body: 'Open his profile to see all details and take actions on this lead.',
      hint: '💡 Tap the highlighted lead row below.',
      nextLabel: 'Got it',
      onNext: () => goToStep(3),
    },
    3: {
      title: '👤 Lead Profile',
      body: 'Every prospect has their own profile — details, call status, tags, and activity history.',
      hint: '📱 Notice the phone number is fake — this is just a demo.',
      nextLabel: 'Show me tags',
      onNext: () => goToStep(4),
    },
    4: {
      title: '🏷️ Assign a Tag',
      body: 'Tags tell you where this prospect is in your process.',
      hint: '👆 Tap the highlighted "Select..." dropdown on any lead row to assign a tag.',
      nextLabel: 'Got it',
      onNext: () => goToStep(5),
    },
    5: {
      title: '🔍 Retargeting Filter',
      body: 'Filter your leads by tag instantly.',
      hint: '👆 Tap the highlighted "Retargeting" button at the top right.',
      nextLabel: 'Next: Follow-Up',
      onNext: () => { goToStep(6); navigate('/listup'); },
    },
    6: {
      title: '📊 Activity History',
      body: 'Every action you take is automatically recorded here — tags, calls, it\'s all logged.',
      hint: '✅ Check the activity feed highlighted below.',
      nextLabel: 'Got it',
      onNext: () => goToStep(7),
    },
    7: {
      title: '🎯 Prospects by Tag',
      body: 'Your follow-up dashboard. Leads grouped by tag for easy follow-up.',
      hint: '👆 Tap the highlighted "Prospects" tab to see grouped leads.',
      nextLabel: 'Next: To-Do',
      onNext: () => { goToStep(8); navigate('/action'); },
    },
    8: {
      title: '✅ To-Do List',
      body: 'Plan your day with reminders like "Call Rahul at 5 PM".',
      hint: '👆 Tap the highlighted input bar at the bottom to add a task.',
      nextLabel: 'Next: TrackUp',
      onNext: () => { goToStep(9); navigate('/tracking'); },
    },
    9: {
      title: '📈 Track Your Numbers',
      body: 'TrackUp counts everything you do — leads, calls, responses, enrolments.',
      hint: '📊 See the highlighted tracking table with today\'s numbers.',
      nextLabel: 'Next: Profile',
      onNext: () => { goToStep(10); navigate('/profile'); },
    },
    10: {
      title: '🛠️ Your Tools',
      body: 'Nevorai Flow, Forms, Notes, Shared Leads — all built in.',
      hint: '⚙️ Explore the highlighted tools section below.',
      nextLabel: 'Almost done!',
      onNext: () => goToStep(11 as OnboardingStep),
    },
  };

  const step = stepContent[currentStep];
  if (!step) return null;

  const highlight = stepHighlights[currentStep];

  return (
    <>
      {/* Pulsing highlight on the target UI element */}
      {highlight && (
        <TargetHighlight selector={highlight.selector} label={highlight.label} />
      )}

      {/* Top banner with instructions */}
      <OnboardingBanner>
        <OnboardingProgress current={currentStep} total={totalSteps} />
        <div className="space-y-1.5 pr-6">
          <h2 className="text-sm font-bold text-foreground">{step.title}</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">{step.body}</p>
          {step.hint && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
              <p className="text-xs text-foreground">{step.hint}</p>
            </div>
          )}
        </div>
        <Button onClick={step.onNext} size="sm" className="w-full h-8 rounded-xl font-bold text-xs">
          {step.nextLabel} <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </OnboardingBanner>
    </>
  );
}
