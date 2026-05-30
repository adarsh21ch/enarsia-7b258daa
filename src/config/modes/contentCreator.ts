import type { AppMode } from './types';

/**
 * Content Creator — pilot of the second mode (Instagram Reels-first).
 *
 * Not yet enabled (`enabled: false`) — the tabs/pages don't exist yet. This
 * config is the source of truth we build against. See
 * docs/modes/content-creator-mode.md.
 */
export const contentCreatorMode: AppMode = {
  id: 'content_creator',
  label: 'Content Creator',
  shortLabel: 'Creator',
  nav: [
    { path: '/ideas', label: 'Ideas', iconKey: 'ideas', onboardingId: 'nav-ideas' },
    { path: '/studio', label: 'Studio', iconKey: 'studio', onboardingId: 'nav-studio' },
    { path: '/calendar', label: 'Calendar', iconKey: 'calendar', onboardingId: 'nav-calendar' },
    { path: '/insights', label: 'Insights', iconKey: 'insights', onboardingId: 'nav-insights' },
    { path: '/profile', label: 'Profile', iconKey: 'profile', isProfile: true, onboardingId: 'nav-profile' },
  ],
  terms: {
    prospect: 'Idea',
    prospects: 'Ideas',
    pipeline: 'Content Pipeline',
    lead: 'Follower',
    team: 'Collabs',
    primaryAction: 'Create',
    tracker: 'Insights',
    tagline: 'Your content command center.',
  },
  aiPersona: 'content_creator',
  enabled: true,
};
