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
  
  // Response tags - BOLD, DISTINCT colors (visible on white/gray backgrounds)
  // Positive responses (green shades)
  'Interested': '#16a34a',       // green-600
  'Very Interested': '#15803d',  // green-700
  'Enrollment': '#059669',       // emerald-600
  'Enrolment': '#059669',        // emerald-600 (alias)
  'Enrolled': '#059669',         // emerald-600
  'Confirmed': '#16a34a',        // green-600
  'Yes': '#16a34a',              // green-600
  'Positive': '#16a34a',         // green-600
  '+VE': '#16a34a',              // green-600
  'Joined': '#0d9488',           // teal-600
  'Paid': '#047857',             // emerald-700
  
  // Neutral responses (blue/indigo/violet - each distinct)
  'Video Sent': '#2563eb',       // blue-600
  'Video Send': '#2563eb',       // blue-600 (alias)
  'Call Back': '#7c3aed',        // violet-600
  'Follow Up': '#4f46e5',        // indigo-600
  'Thinking': '#9333ea',         // purple-600
  'Maybe': '#7c3aed',           // violet-600
  '50-50': '#6d28d9',           // violet-700
  'Pending': '#4f46e5',          // indigo-600
  'Scheduled': '#0284c7',        // sky-600
  
  // Negative responses (red/gray - bold and clear)
  'Not Picked': '#4b5563',       // gray-600
  'Call Cut': '#dc2626',         // red-600
  'Not Interested': '#6b7280',   // gray-500
  'Not Intrested': '#6b7280',    // gray-500 (typo alias)
  'Busy': '#ea580c',             // orange-600 (darker, visible)
  'No': '#dc2626',               // red-600
  '-VE': '#dc2626',              // red-600
  'Rejected': '#b91c1c',         // red-700
  'Wrong Number': '#52525b',     // zinc-600
  'DND': '#475569',              // slate-600
  '30-70': '#c2410c',            // orange-700
  'FLP': '#e11d48',              // rose-600
  
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

// Fallback color palettes - all bold/dark enough for white backgrounds
const RESPONSE_COLORS = ['#2563eb', '#4f46e5', '#7c3aed', '#9333ea', '#dc2626', '#e11d48'];
const STAGE_COLORS = ['#3b82f6', '#f97316', '#22c55e', '#ec4899', '#06b6d4', '#eab308'];
const QUALITY_COLORS = ['#16a34a', '#ea580c', '#dc2626', '#0284c7', '#65a30d', '#0d9488'];
const DEFAULT_COLORS = ['#4b5563', '#6b7280', '#475569', '#57534e', '#52525b', '#525252'];

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
    backgroundColor: `${bgColor}1A`,
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
