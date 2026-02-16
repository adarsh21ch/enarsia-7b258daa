// Tag color utilities for consistent coloring across the app

// Default colors for different tag types - Enhanced with semantic meaning
export const DEFAULT_TAG_COLORS: Record<string, string> = {
  // Quality tags - semantic colors (temperature metaphor)
  'Good': '#22c55e',      // green-500 (positive)
  'Medium': '#eab308',    // yellow-500 (neutral)
  'Bad': '#ef4444',       // red-500 (negative)
  'Hot': '#ef4444',       // red-500 (urgent/ready)
  'Warm': '#f97316',      // orange-500 (interested)
  'Cold': '#3b82f6',      // blue-500 (cold/distant)
  
  // Response tags - COLORED BY SENTIMENT
  // Positive responses (green shades)
  'Interested': '#22c55e',     // green-500
  'Very Interested': '#16a34a', // green-600
  'Enrollment': '#10b981',      // emerald-500
  'Enrolled': '#10b981',        // emerald-500
  'Confirmed': '#22c55e',       // green-500
  'Yes': '#22c55e',             // green-500
  'Positive': '#22c55e',        // green-500
  '+VE': '#22c55e',             // green-500
  'Joined': '#14b8a6',          // teal-500
  'Paid': '#059669',            // emerald-600
  
  // Neutral responses (blue/purple shades)
  'Video Sent': '#3b82f6',      // blue-500
  'Call Back': '#8b5cf6',       // violet-500
  'Follow Up': '#6366f1',       // indigo-500
  'Thinking': '#a855f7',        // purple-500
  'Maybe': '#8b5cf6',           // violet-500
  '50-50': '#8b5cf6',           // violet-500
  'Pending': '#6366f1',         // indigo-500
  'Scheduled': '#0ea5e9',       // sky-500
  
  // Negative responses (gray/red shades)
  'Not Picked': '#6b7280',      // gray-500
  'Call Cut': '#dc2626',        // red-600
  'Not Interested': '#9ca3af',  // gray-400
  'Busy': '#f59e0b',            // amber-500
  'No': '#ef4444',              // red-500
  '-VE': '#ef4444',             // red-500
  'Rejected': '#dc2626',        // red-600
  'Wrong Number': '#71717a',    // zinc-500
  'DND': '#64748b',             // slate-500
  '30-70': '#f97316',           // orange-500 (leaning negative)
  
  // Stage tags - DISTINCT colors for each stage (no more all-violet!)
  'Day 1': '#3b82f6',           // blue-500
  'Day 2': '#f97316',           // orange-500
  'Day 3': '#22c55e',           // green-500
  'Minimum Bill': '#eab308',    // yellow-500
  'MB': '#eab308',              // yellow-500 (alias)
  'Level Up': '#ec4899',        // pink-500
  '2CC': '#06b6d4',             // cyan-500
  'DAY1': '#3b82f6',            // blue-500 (alias)
  'DAY2': '#f97316',            // orange-500 (alias)
  'DAY3': '#22c55e',            // green-500 (alias)
  
  // Generic stage progression - also diversified
  'Stage 1': '#3b82f6',         // blue-500
  'Stage 2': '#f97316',         // orange-500
  'Stage 3': '#22c55e',         // green-500
  'Stage 4': '#ec4899',         // pink-500
  'Complete': '#10b981',        // emerald-500
  'Done': '#10b981',            // emerald-500
};

// Fallback color palettes for new tags
const RESPONSE_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e'];
const STAGE_COLORS = ['#3b82f6', '#f97316', '#22c55e', '#ec4899', '#06b6d4', '#eab308'];
const QUALITY_COLORS = ['#22c55e', '#eab308', '#ef4444', '#f97316', '#84cc16', '#14b8a6'];
const DEFAULT_COLORS = ['#6b7280', '#9ca3af', '#64748b', '#78716c', '#71717a', '#737373'];

// Get color for a specific tag
export function getTagColor(tagValue: string, tagType: 'response' | 'stage' | 'quality' | 'default', customColor?: string | null): string {
  // Use custom color if provided
  if (customColor) return customColor;
  
  // Check default colors
  if (DEFAULT_TAG_COLORS[tagValue as keyof typeof DEFAULT_TAG_COLORS]) {
    return DEFAULT_TAG_COLORS[tagValue as keyof typeof DEFAULT_TAG_COLORS];
  }
  
  // Generate consistent color based on tag name
  const hash = tagValue.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const palette = tagType === 'response' ? RESPONSE_COLORS 
    : tagType === 'stage' ? STAGE_COLORS 
    : tagType === 'quality' ? QUALITY_COLORS 
    : DEFAULT_COLORS;
  
  return palette[Math.abs(hash) % palette.length];
}

// Get text color for contrast
export function getContrastTextColor(bgColor: string): string {
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// CSS style object for a colored tag
// isFilter=true means this is for the Follow Up filter chips (neutral when unselected)
export function getTagStyle(tagValue: string, tagType: 'response' | 'stage' | 'quality' | 'default', customColor?: string | null, isSelected?: boolean, isFilter?: boolean) {
  const bgColor = getTagColor(tagValue, tagType, customColor);
  const textColor = getContrastTextColor(bgColor);
  
  if (isSelected) {
    return {
      backgroundColor: bgColor,
      color: textColor,
      borderColor: bgColor,
    };
  }
  
  // For filter chips that are not selected, show neutral style
  if (isFilter) {
    return {
      backgroundColor: 'transparent',
      color: 'hsl(var(--muted-foreground))',
      borderColor: 'hsl(var(--border))',
    };
  }
  
  // Default colored style for non-filter tags - stronger tint for better differentiation
  return {
    backgroundColor: `${bgColor}22`,
    color: bgColor,
    borderColor: `${bgColor}50`,
  };
}

// Available color options for color picker
export const COLOR_OPTIONS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
  '#6b7280', // gray
];
