/**
 * Format a NevorAI Leader ID for display
 * Old format: NVR-XXXXX (with random alphanumeric characters)
 * New format: NVR###### (6-digit zero-padded number, no dash)
 * 
 * This function converts old-style IDs to display as the new format
 * while maintaining backward compatibility for lookups
 */
export function formatLeaderId(neveraiId: string | null | undefined, leaderCodeSeq?: number | null): string {
  if (!neveraiId) return '';
  
  // If we have a numeric sequence, use the new format
  if (leaderCodeSeq && leaderCodeSeq > 0) {
    return `NVR${String(leaderCodeSeq).padStart(6, '0')}`;
  }
  
  // Try to extract numeric portion from existing ID
  const numericMatch = neveraiId.replace(/[^0-9]/g, '');
  if (numericMatch && numericMatch.length > 0) {
    const num = parseInt(numericMatch, 10);
    if (!isNaN(num) && num > 0) {
      return `NVR${String(num).padStart(6, '0')}`;
    }
  }
  
  // Fallback: return original ID (legacy format)
  return neveraiId;
}

/**
 * Check if a string is a valid Leader ID format (either old or new)
 */
export function isValidLeaderId(id: string): boolean {
  if (!id) return false;
  
  // New format: NVR followed by 6 digits
  if (/^NVR\d{6}$/i.test(id)) return true;
  
  // Old format: NVR- followed by alphanumeric
  if (/^NVR-[A-Z0-9]{5}$/i.test(id)) return true;
  
  return false;
}

/**
 * Normalize a Leader ID for database lookup
 * This ensures both old and new formats can be used for lookups
 */
export function normalizeLeaderIdForLookup(id: string): string {
  if (!id) return '';
  return id.toUpperCase().trim();
}
