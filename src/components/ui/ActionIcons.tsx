// Standardized Call and WhatsApp icons used across the app
// These match the Activity tab card design

import { cn } from '@/lib/utils';

interface IconButtonProps {
  onClick: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Outline phone icon matching Activity tab style
export const PhoneOutlineIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

// WhatsApp brand icon (filled style for better recognition)
export const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// WhatsApp outline icon (alternative style)
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

// Standardized WhatsApp button used across the app
interface WhatsAppButtonProps {
  phone: string;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function WhatsAppButton({ phone, onClick, className, size = 'md' }: WhatsAppButtonProps) {
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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(e);
    // Use whatsapp:// protocol to open native app directly
    window.location.href = `whatsapp://send?phone=${phone}`;
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "rounded-lg border border-green-500/50 bg-background text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors flex items-center justify-center",
        sizeClasses[size],
        className
      )}
      aria-label="WhatsApp"
    >
      <WhatsAppOutlineIcon className={iconSizes[size]} />
    </button>
  );
}

// Compact inline versions for table cells - colored rounded square with phone icon
export function CallIconButton({ onClick, className, color }: { onClick: (e: React.MouseEvent) => void; className?: string; color?: string }) {
  const hasColor = !!color;
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg flex items-center justify-center shrink-0 transition-all active:scale-95",
        "h-8 w-8",
        !hasColor && "bg-muted/60 border border-border/30",
        className
      )}
      style={hasColor ? { backgroundColor: `${color}15`, borderColor: `${color}30`, border: `1px solid ${color}30` } : undefined}
      aria-label="Call"
    >
      <PhoneOutlineIcon className={cn("h-4 w-4", hasColor ? "" : "text-muted-foreground")} style={hasColor ? { color } : undefined} />
    </button>
  );
}

// Compact inline WhatsApp for table cells
export function WhatsAppIconButton({ phone, onClick, className }: { phone: string; onClick?: (e: React.MouseEvent) => void; className?: string }) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(e);
    // Use whatsapp:// protocol to open native app directly
    window.location.href = `whatsapp://send?phone=${phone}`;
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "p-1 text-green-600 hover:text-green-700 transition-colors flex items-center justify-center",
        className
      )}
      aria-label="WhatsApp"
    >
      <WhatsAppOutlineIcon className="h-5 w-5" />
    </button>
  );
}
