import type { AppMode } from './types';

/**
 * Founder — third mode (stub). Not designed in depth yet; kept here so the
 * registry is complete. `enabled: false` until we design it.
 */
export const founderMode: AppMode = {
  id: 'founder',
  label: 'Founder',
  shortLabel: 'Founder',
  nav: [
    { path: '/dashboard', label: 'Overview', iconKey: 'overview', onboardingId: 'nav-overview' },
    { path: '/listup', label: 'Pipeline', iconKey: 'followup', onboardingId: 'nav-pipeline' },
    { path: '/action', label: 'To-Do', iconKey: 'todo', onboardingId: 'nav-todo' },
    { path: '/tracking', label: 'Growth', iconKey: 'trackup', onboardingId: 'nav-growth' },
    { path: '/profile', label: 'Profile', iconKey: 'profile', isProfile: true, onboardingId: 'nav-profile' },
  ],
  terms: {
    prospect: 'Customer',
    prospects: 'Customers',
    pipeline: 'Pipeline',
    lead: 'Customer',
    team: 'Customers',
    primaryAction: 'Overview',
    tracker: 'Growth',
    tagline: 'Run your company in one place.',
  },
  aiPersona: 'founder',
  enabled: true,
};
