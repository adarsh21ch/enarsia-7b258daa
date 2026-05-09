/**
 * Centralized plan/upgrade gating helpers.
 *
 * Use `useUpgradeUrgency()` everywhere instead of scattered inline conditions
 * to determine whether a non-paid user is in an "urgent" state (expired Pro or
 * hard lead limit reached) and therefore must always see an upgrade CTA — even
 * when admin tab whitelists would otherwise hide the button.
 */
import { useMemo } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useLifetimeLeadLimit } from '@/hooks/useLifetimeLeadLimit';
import { useFreeTrial } from '@/hooks/useFreeTrial';

export interface UpgradeUrgency {
  /** True for any non-paid user — they CAN upgrade */
  canUpgrade: boolean;
  /** Was Pro / mini, expired and not renewed */
  isExpired: boolean;
  /** Free user at the lifetime lead hard cap */
  isAtLeadLimit: boolean;
  /** Trial has ended (and user has not paid) */
  isTrialExpired: boolean;
  /** Any of the above — show upgrade CTA prominently and bypass tab whitelists */
  isUrgent: boolean;
  loading: boolean;
}

export function useUpgradeUrgency(): UpgradeUrgency {
  const { subscription, isPaid, loading: subLoading } = useSubscription();
  const { isAtLimit, isLoading: limitLoading } = useLifetimeLeadLimit();
  const { isTrialExpired, loading: trialLoading } = useFreeTrial();

  return useMemo(() => {
    const rawPlan = (subscription?.plan as string) || '';
    const rawStatus = (subscription?.status as string) || '';
    const expiresAt = subscription?.expires_at ? new Date(subscription.expires_at) : null;
    const isExpired = !isPaid && !!expiresAt && expiresAt <= new Date() &&
      (rawPlan === 'pro' || rawPlan === 'mini' || rawStatus === 'expired');

    const isAtLeadLimit = !isPaid && isAtLimit;
    const trialExpired = !isPaid && isTrialExpired;
    const isUrgent = isExpired || isAtLeadLimit || trialExpired;
    const canUpgrade = !isPaid;

    return {
      canUpgrade,
      isExpired,
      isAtLeadLimit,
      isTrialExpired: trialExpired,
      isUrgent,
      loading: subLoading || limitLoading || trialLoading,
    };
  }, [subscription, isPaid, isAtLimit, isTrialExpired, subLoading, limitLoading, trialLoading]);
}
