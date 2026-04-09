import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding, OnboardingStep } from '@/hooks/useOnboarding';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Import, X } from 'lucide-react';
import {
  CoachMarkOverlay,
  FullScreenCard,
  OnboardingProgress,
  Confetti,
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
    // skipOnboarding removed
    cleanupDemoData,
    totalSteps,
    demoSheetId,
  } = useOnboarding();

  const [showCleanupPrompt, setShowCleanupPrompt] = useState(false);

  if (!isActive && !showCleanupPrompt) return null;

  const firstName = profile?.display_name?.split(' ')[0] || 'there';
  // No skip functionality

  // Cleanup prompt after completion
  if (showCleanupPrompt) {
    return (
      <CoachMarkOverlay showSkip={false}>
        <div className="text-center space-y-3">
          <span className="text-3xl">🧹</span>
          <h2 className="text-lg font-bold text-foreground">Clean up demo data?</h2>
          <p className="text-sm text-muted-foreground">
            You've completed the tour. Want to remove the demo leads and start fresh?
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 h-10 rounded-xl text-sm"
              onClick={() => setShowCleanupPrompt(false)}
            >
              Keep for Reference
            </Button>
            <Button
              className="flex-1 h-10 rounded-xl text-sm"
              onClick={async () => {
                await cleanupDemoData();
                setShowCleanupPrompt(false);
              }}
            >
              Remove Demo Data
            </Button>
          </div>
        </div>
      </CoachMarkOverlay>
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
          <button
            onClick={skipOnboarding}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip Tour
          </button>
        </div>
      </FullScreenCard>
    );
  }

  // STEP 1: Calling Tab — Meet Your Demo Leads
  if (currentStep === 1) {
    return (
      <CoachMarkOverlay onSkipStep={skipStep}>
        <OnboardingProgress current={1} total={totalSteps} />
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">📋 Your Calling Sheet</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This is where you manage all your prospects. We've added 20 demo leads so you can practice.
          </p>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
            <p className="text-sm text-foreground">
              👆 In real life, you'll import your own contacts here.
            </p>
          </div>
        </div>
        <Button onClick={() => goToStep(2)} className="w-full h-10 rounded-xl font-bold">
          Got it <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CoachMarkOverlay>
    );
  }

  // STEP 2: Open a Lead Profile
  if (currentStep === 2) {
    return (
      <CoachMarkOverlay onSkipStep={skipStep}>
        <OnboardingProgress current={2} total={totalSteps} />
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">👆 Tap on Rahul Sharma</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Open his profile to see all details and take actions on this lead.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <p className="text-sm text-foreground">
              💡 Tap any lead row in the list below to continue.
            </p>
          </div>
        </div>
        <Button onClick={() => goToStep(3)} variant="outline" className="w-full h-10 rounded-xl text-sm">
          Skip — show me next <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CoachMarkOverlay>
    );
  }

  // STEP 3: Explore Lead Profile
  if (currentStep === 3) {
    return (
      <CoachMarkOverlay onSkipStep={skipStep}>
        <OnboardingProgress current={3} total={totalSteps} />
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">👤 Lead Profile</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every prospect has their own profile. You can see their details, call status, tags, and activity history here.
          </p>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
            <p className="text-sm text-foreground">
              📱 Notice the phone number is fake — this is just a demo.
            </p>
          </div>
        </div>
        <Button onClick={() => goToStep(4)} className="w-full h-10 rounded-xl font-bold">
          Got it, show me tags <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CoachMarkOverlay>
    );
  }

  // STEP 4: Assign a Tag
  if (currentStep === 4) {
    return (
      <CoachMarkOverlay onSkipStep={skipStep}>
        <OnboardingProgress current={4} total={totalSteps} />
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">🏷️ Assign a Tag</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Tags tell you exactly where this prospect is in your process.
          </p>
          <div className="space-y-1.5">
            {[
              { label: 'Day 1', color: 'bg-blue-500/15 text-blue-700' },
              { label: 'Video Send', color: 'bg-sky-500/15 text-sky-700' },
              { label: 'Enrolment', color: 'bg-green-500/15 text-green-700' },
              { label: 'Not Picked', color: 'bg-purple-500/15 text-purple-700' },
              { label: 'Call Back', color: 'bg-orange-500/15 text-orange-700' },
            ].map(t => (
              <div key={t.label} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${t.color}`}>
                {t.label}
              </div>
            ))}
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <p className="text-sm text-foreground">
              👆 Try assigning a tag to any lead from the dropdown on their row.
            </p>
          </div>
        </div>
        <Button onClick={() => goToStep(5)} className="w-full h-10 rounded-xl font-bold">
          Got it <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CoachMarkOverlay>
    );
  }

  // STEP 5: Retargeting Filter
  if (currentStep === 5) {
    return (
      <CoachMarkOverlay onSkipStep={skipStep}>
        <OnboardingProgress current={5} total={totalSteps} />
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">🔍 Retargeting Filter</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This is one of Nevorai's most powerful features. It filters your leads by the tag you assigned.
          </p>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
            <p className="text-sm text-foreground">
              👆 Tap the "Retargeting" dropdown at the top of the Calling tab to try it!
            </p>
          </div>
        </div>
        <Button onClick={() => { goToStep(6); navigate('/listup'); }} className="w-full h-10 rounded-xl font-bold">
          Next: Follow-Up Tab <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CoachMarkOverlay>
    );
  }

  // STEP 6: Follow-Up — Activity History
  if (currentStep === 6) {
    return (
      <CoachMarkOverlay onSkipStep={skipStep}>
        <OnboardingProgress current={6} total={totalSteps} />
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">📊 Activity History</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every action you take is automatically recorded here. Tags assigned, calls made — it's all logged.
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/50 border border-border/50">
              <div className="w-6 h-6 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0">
                <span className="text-xs">🏷</span>
              </div>
              <div>
                <p className="text-xs font-medium">Tagged Rahul Sharma as "Video Send"</p>
                <p className="text-[10px] text-muted-foreground">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/50 border border-border/50">
              <div className="w-6 h-6 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
                <span className="text-xs">✅</span>
              </div>
              <div>
                <p className="text-xs font-medium">Tagged Sunita Yadav as "Enrolment"</p>
                <p className="text-[10px] text-muted-foreground">5 hours ago</p>
              </div>
            </div>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
            <p className="text-sm text-foreground">
              ✅ This is your Activity History — you'll never forget what happened with any prospect.
            </p>
          </div>
        </div>
        <Button onClick={() => goToStep(7)} className="w-full h-10 rounded-xl font-bold">
          Got it <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CoachMarkOverlay>
    );
  }

  // STEP 7: Prospects View
  if (currentStep === 7) {
    return (
      <CoachMarkOverlay onSkipStep={skipStep}>
        <OnboardingProgress current={7} total={totalSteps} />
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">🎯 Prospects by Tag</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This is your follow-up dashboard. Leads are grouped by their tags — see all "Call Back" leads in one place, all "Video Send" in another.
          </p>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
            <p className="text-sm text-foreground">
              👆 Tap the "Prospects" tab above to see your leads grouped by tag. Try tapping any tag chip to filter.
            </p>
          </div>
        </div>
        <Button onClick={() => { goToStep(8); navigate('/action'); }} className="w-full h-10 rounded-xl font-bold">
          Next: To-Do List <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CoachMarkOverlay>
    );
  }

  // STEP 8: To-Do Tab
  if (currentStep === 8) {
    return (
      <CoachMarkOverlay onSkipStep={skipStep}>
        <OnboardingProgress current={8} total={totalSteps} />
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">✅ To-Do List</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This is where you plan your day. Add reminders like:
          </p>
          <div className="space-y-1.5 text-sm text-foreground">
            <p>• "Call Rahul at 5 PM"</p>
            <p>• "Send video to Priya"</p>
            <p>• "Follow up with Amit"</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <p className="text-sm text-foreground">
              👆 Try adding a task using the input bar at the bottom!
            </p>
          </div>
        </div>
        <Button onClick={() => { goToStep(9); navigate('/tracking'); }} className="w-full h-10 rounded-xl font-bold">
          Next: TrackUp <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CoachMarkOverlay>
    );
  }

  // STEP 9: TrackUp Tab
  if (currentStep === 9) {
    return (
      <CoachMarkOverlay onSkipStep={skipStep}>
        <OnboardingProgress current={9} total={totalSteps} />
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">📈 Track Your Numbers</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            TrackUp automatically counts everything you do each day — leads added, calls made, responses, enrolments.
          </p>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
            <p className="text-sm text-foreground">
              📊 See today's column? It's already tracking the demo activity. When you use Nevorai daily, this shows your real numbers.
            </p>
          </div>
          <div className="bg-muted/50 border border-border/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">
              🔄 Switch between <strong>Leads</strong> view and <strong>Funnel</strong> view to track different metrics.
            </p>
          </div>
        </div>
        <Button onClick={() => { goToStep(10); navigate('/profile'); }} className="w-full h-10 rounded-xl font-bold">
          Next: Profile <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CoachMarkOverlay>
    );
  }

  // STEP 10: Profile Tab
  if (currentStep === 10) {
    return (
      <CoachMarkOverlay onSkipStep={() => goToStep(11 as OnboardingStep)}>
        <OnboardingProgress current={10} total={totalSteps} />
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">🛠️ Your Tools</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Nevorai has powerful tools built right in:
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span>🎬</span>
              <div><strong>Nevorai Flow</strong> — Video funnels for your prospects</div>
            </div>
            <div className="flex items-start gap-2">
              <span>📝</span>
              <div><strong>Nevorai Forms</strong> — Capture leads from links</div>
            </div>
            <div className="flex items-start gap-2">
              <span>📒</span>
              <div><strong>Nevorai Notes</strong> — Quick notes & voice memos</div>
            </div>
            <div className="flex items-start gap-2">
              <span>🤝</span>
              <div><strong>Shared Leads</strong> — Get leads from your upline</div>
            </div>
          </div>
          <div className="bg-muted/50 border border-border/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">
              ⚙️ Customise your tracking format anytime from Profile → Tracking Format.
            </p>
          </div>
        </div>
        <Button onClick={() => goToStep(11 as OnboardingStep)} className="w-full h-10 rounded-xl font-bold">
          Almost done <Sparkles className="h-4 w-4 ml-2" />
        </Button>
      </CoachMarkOverlay>
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

  return null;
}
