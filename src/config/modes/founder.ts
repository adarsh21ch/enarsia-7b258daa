import type { AppMode } from './types';

/**
 * Founder — runs the whole business in one place.
 *
 * Nav surfaces the 3 cockpit areas (Manage / Marketing / Sales) plus Profile.
 * Each tab maps to its own page; Marketing & Sales reuse the function-detail
 * view from /manage so all founder data lives in `founder_functions`.
 */
export const founderMode: AppMode = {
  id: 'founder',
  label: 'Founder',
  shortLabel: 'Founder',
  nav: [
    { path: '/manage', label: 'Manage', iconKey: 'manage', onboardingId: 'nav-manage' },
    { path: '/marketing', label: 'Marketing', iconKey: 'marketing', onboardingId: 'nav-marketing' },
    { path: '/sales', label: 'Sales', iconKey: 'sales', onboardingId: 'nav-sales' },
    { path: '/profile', label: 'Profile', iconKey: 'profile', isProfile: true, onboardingId: 'nav-profile' },
  ],
  terms: {
    prospect: 'Customer',
    prospects: 'Customers',
    pipeline: 'Pipeline',
    lead: 'Customer',
    team: 'Customers',
    primaryAction: 'Manage',
    tracker: 'Growth',
    tagline: 'Run your company in one place.',
  },
  aiPersona: 'founder',
  enabled: true,
};
