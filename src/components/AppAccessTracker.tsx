/**
 * AppAccessTracker - Records user access to NevorAI app
 * This component should be rendered once at the app root level
 */
import { useAppAccess } from '@/hooks/useAppAccess';

export function AppAccessTracker() {
  useAppAccess();
  return null;
}
