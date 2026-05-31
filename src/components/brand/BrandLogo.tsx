import { useBranding } from '@/hooks/useBranding';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  alt?: string;
}

/** App logo sourced from admin_branding (falls back to bundled asset). */
export function BrandLogo({ className, alt }: BrandLogoProps) {
  const { logoUrl, appName } = useBranding();
  return (
    <img
      src={logoUrl}
      alt={alt ?? `${appName} Logo`}
      className={cn('object-cover', className)}
      loading="eager"
    />
  );
}

/** App display name sourced from admin_branding (falls back to constant). */
export function BrandName({ className }: { className?: string }) {
  const { appName } = useBranding();
  return <span className={className}>{appName}</span>;
}

export function BrandShortName({ className }: { className?: string }) {
  const { shortName } = useBranding();
  return <span className={className}>{shortName}</span>;
}
