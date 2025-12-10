import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      expand={false}
      richColors
      closeButton
      duration={3000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border/50 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl group-[.toaster]:px-4 group-[.toaster]:py-3 group-[.toaster]:backdrop-blur-xl group-[.toaster]:mx-4 group-[.toaster]:sm:mx-auto group-[.toaster]:max-w-[calc(100vw-2rem)] group-[.toaster]:sm:max-w-[380px]",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:text-xs group-[.toast]:font-medium",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg group-[.toast]:text-xs",
          closeButton: "group-[.toast]:bg-background/80 group-[.toast]:border-border/50 group-[.toast]:hover:bg-muted",
          success: "group-[.toaster]:bg-card group-[.toaster]:border-green-500/30",
          error: "group-[.toaster]:bg-card group-[.toaster]:border-destructive/30",
          info: "group-[.toaster]:bg-card group-[.toaster]:border-accent/30",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
