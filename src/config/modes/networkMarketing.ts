import type { AppMode } from './types';

/**
 * Network Marketing — the original, fully-built mode.
 *
 * This config mirrors today's hardcoded behaviour exactly (the bottom nav in
 * BottomNav.tsx and the brand tagline). Extracting it here is the
 * non-destructive first step of the Mode system: the app looks identical, but
 * is now driven by config.
 */
export const networkMarketingMode: AppMode = {
  id: 'network_marketing',
  label: 'Network Marketing',
  shortLabel: 'Marketing',
  nav: [
    { path: '/dashboard', label: 'Calling', iconKey: 'calling', onboardingId: 'nav-calling' },
    { path: '/listup', label: 'Follow-Up', iconKey: 'followup', onboardingId: 'nav-followup' },
    { path: '/action', label: 'To-Do', iconKey: 'todo', onboardingId: 'nav-todo' },
    { path: '/tracking', label: 'Tracking', iconKey: 'trackup', onboardingId: 'nav-trackup' },
    { path: '/profile', label: 'Profile', iconKey: 'profile', isProfile: true, onboardingId: 'nav-profile' },
  ],
  terms: {
    prospect: 'Prospect',
    prospects: 'Prospects',
    pipeline: 'Follow-Up',
    lead: 'Lead',
    team: 'Team',
    primaryAction: 'Calling',
    tracker: 'Tracking',
    tagline: 'Your personal CRM for network marketers.',
  },
  aiPersona: 'network_marketing',
  enabled: true,
};
