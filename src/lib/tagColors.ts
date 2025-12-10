// Tag color utilities for consistent coloring across the app

// Default colors for different tag types
export const DEFAULT_TAG_COLORS = {
  // Quality tags - semantic colors
  'Good': '#22c55e',      // green-500
  'Medium': '#eab308',    // yellow-500
  'Bad': '#ef4444',       // red-500
  'Hot': '#ef4444',       // red-500
  'Warm': '#f97316',      // orange-500
  'Cold': '#3b82f6',      // blue-500
  
  // Response tags - blue shades
  'Video Sent': '#3b82f6',     // blue-500
  'Not Picked': '#6b7280',     // gray-500
  'Call Back': '#8b5cf6',      // violet-500
  'Call Cut': '#dc2626',       // red-600
  'Enrollment': '#22c55e',     // green-500
  'Not Interested': '#9ca3af', // gray-400
  'Interested': '#10b981',     // emerald-500
  
  // Stage tags - purple shades
  'Day 1': '#8b5cf6',    // violet-500
  'Day 2': '#a855f7',    // purple-500
  'Day 3': '#c084fc',    // purple-400
  'Minimum Bill': '#f59e0b', // amber-500
  'Level Up': '#06b6d4',     // cyan-500
  '2CC': '#14b8a6',          // teal-500
};

// Fallback color palettes for new tags
const RESPONSE_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e'];
const STAGE_COLORS = ['#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#7c3aed', '#6d28d9'];
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
  
  // Default colored style for non-filter tags
  return {
    backgroundColor: `${bgColor}15`,
    color: bgColor,
    borderColor: `${bgColor}40`,
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
