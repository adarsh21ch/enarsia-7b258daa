/**
 * Utility functions for handling display names consistently across the app.
 * 
 * RULE: Never show "Unnamed", never show full email addresses.
 * Priority: display_name > email prefix > 'User'
 */

/**
 * Get a clean display name from display_name and email.
 * 
 * @param displayName - The user's display_name (may be null/empty/Unnamed)
 * @param email - The user's email address
 * @returns A clean, readable name (never "Unnamed", never full email)
 * 
 * Examples:
 * - ("John Doe", "john@gmail.com") → "John Doe"
 * - (null, "adarshchaturvedi@gmail.com") → "Adarshchaturvedi"
 * - ("Unnamed", "ram.kumar123@gmail.com") → "Ram.kumar123"
 * - (null, null) → "User"
 */
export function getCleanDisplayName(
  displayName: string | null | undefined,
  email: string | null | undefined
): string {
  // If display_name is valid (not null, not empty, not "Unnamed"), use it
  if (
    displayName &&
    displayName.trim() !== '' &&
    displayName.trim().toLowerCase() !== 'unnamed'
  ) {
    return displayName.trim();
  }
  
  // Otherwise, extract and capitalize email prefix
  if (email) {
    const prefix = email.split('@')[0];
    // Capitalize first letter
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
  
  // Ultimate fallback
  return 'User';
}

/**
 * Get email prefix only (for showing email in a clean way)
 * NEVER returns full email with @domain
 * 
 * @param email - Full email address
 * @returns Email prefix only
 * 
 * Examples:
 * - "john.doe@gmail.com" → "john.doe"
 * - "adarsh@company.com" → "adarsh"
 * - null → ""
 */
export function getEmailPrefix(email: string | null | undefined): string {
  if (!email) return '';
  return email.split('@')[0];
}

/**
 * Format upline/leader display for UI
 * Shows display_name if available, otherwise email prefix
 * 
 * @param displayName - Leader's display name
 * @param email - Leader's email
 * @returns Formatted string for display
 */
export function formatUplineDisplay(
  displayName: string | null | undefined,
  email: string | null | undefined
): string {
  return getCleanDisplayName(displayName, email);
}
