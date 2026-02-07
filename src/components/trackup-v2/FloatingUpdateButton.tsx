import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloatingUpdateButtonProps {
  onClick: () => void;
}

export function FloatingUpdateButton({ onClick }: FloatingUpdateButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
}
