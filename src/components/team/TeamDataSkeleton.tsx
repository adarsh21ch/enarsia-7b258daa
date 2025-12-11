import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  text?: string;
  className?: string;
}

function LoadingSpinner({ text = 'Loading...', className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
      <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function TeamDataSkeleton() {
  return <LoadingSpinner text="Loading team data..." />;
}

export function TeamCardSkeleton() {
  return <LoadingSpinner text="Loading..." className="py-4" />;
}

export function ActivitySkeleton() {
  return <LoadingSpinner text="Loading activities..." />;
}

export function ProspectTableSkeleton() {
  return <LoadingSpinner text="Loading leads..." />;
}

export function FunnelStageSkeleton() {
  return <LoadingSpinner text="Loading stages..." />;
}
