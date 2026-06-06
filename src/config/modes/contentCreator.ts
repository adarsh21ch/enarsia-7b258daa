import type { AppMode } from './types';

/**
 * Content Creator — opt-in sub-section.
 *
 * No longer a global mode that re-skins the bottom nav. The CRM
 * (Network Marketing) is always the home; Creator is a dedicated section the
 * user enters from Profile → "Open Content Studio" and exits via "Back to CRM".
 * Nav paths live under `/creator/*`.
 */
export const contentCreatorMode: AppMode = {
  id: 'content_creator',
  label: 'Content Creator',
  shortLabel: 'Creator',
  nav: [
    { path: '/creator/ideas', label: 'Ideas', iconKey: 'ideas', onboardingId: 'nav-ideas' },
    { path: '/creator/studio', label: 'Studio', iconKey: 'scripting', onboardingId: 'nav-studio' },
    { path: '/creator/calendar', label: 'Calendar', iconKey: 'posting', onboardingId: 'nav-calendar' },
    { path: '/creator/insights', label: 'Insights', iconKey: 'insights', onboardingId: 'nav-insights' },
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
