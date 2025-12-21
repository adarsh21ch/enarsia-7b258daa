// Standardized Call and WhatsApp icons used across the app
// These match the Activity tab card design

import { cn } from '@/lib/utils';

interface IconButtonProps {
  onClick: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Outline phone icon matching Activity tab style
export const PhoneOutlineIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

// WhatsApp icon matching Activity tab style
export const WhatsAppOutlineIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1Zm0 0a5 5 0 0 0 5 5m0 0a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1h1Z" />
  </svg>
);

// Standardized Call button used across the app
export function CallButton({ onClick, className, size = 'md' }: IconButtonProps) {
  const sizeClasses = {
    sm: 'p-1.5 h-7 w-7',
    md: 'p-2 h-9 w-9',
    lg: 'p-2.5 h-10 w-10',
  };
  
  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg border border-border bg-background hover:bg-muted transition-colors flex items-center justify-center",
        sizeClasses[size],
        className
      )}
      aria-label="Call"
    >
      <PhoneOutlineIcon className={iconSizes[size]} />
    </button>
  );
}

// Standardized WhatsApp button used across the app (anchor-based for iframe compatibility)
interface WhatsAppButtonProps {
  href: string;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function WhatsAppButton({ href, onClick, className, size = 'md' }: WhatsAppButtonProps) {
  const sizeClasses = {
    sm: 'p-1.5 h-7 w-7',
    md: 'p-2 h-9 w-9',
    lg: 'p-2.5 h-10 w-10',
  };
  
  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={cn(
        "rounded-lg border border-green-500/50 bg-background text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors flex items-center justify-center",
        sizeClasses[size],
        className
      )}
      aria-label="WhatsApp"
    >
      <WhatsAppOutlineIcon className={iconSizes[size]} />
    </a>
  );
}

// Compact inline versions for table cells
export function CallIconButton({ onClick, className }: { onClick: (e: React.MouseEvent) => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-1 rounded-md hover:bg-muted transition-colors",
        className
      )}
      aria-label="Call"
    >
      <PhoneOutlineIcon className="h-3.5 w-3.5" />
    </button>
  );
}

// Compact inline WhatsApp for table cells (anchor-based)
export function WhatsAppIconButton({ href, onClick, className }: { href: string; onClick?: (e: React.MouseEvent) => void; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={cn(
        "p-1 text-green-600 hover:text-green-700 transition-colors flex items-center justify-center",
        className
      )}
      aria-label="WhatsApp"
    >
      <WhatsAppOutlineIcon className="h-5 w-5" />
    </a>
  );
}
