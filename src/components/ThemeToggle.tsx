import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  collapsed?: boolean;
}

export function ThemeToggle({ className, showLabel = false, collapsed = false }: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  
  const isDark = resolvedTheme === "dark";
  
  const toggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className={cn(
              "h-10 w-10 rounded-xl transition-colors",
              "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
              className
            )}
          >
            {isDark ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {isDark ? "Switch to light mode" : "Switch to dark mode"}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (showLabel) {
    return (
      <button
        onClick={toggle}
        className={cn(
          "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200",
          "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60",
          className
        )}
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted">
          {isDark ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </div>
        <span className="text-[13px] font-medium">
          {isDark ? "Dark Mode" : "Light Mode"}
        </span>
      </button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={cn(
        "h-9 w-9 rounded-lg transition-colors",
        "text-muted-foreground hover:text-foreground hover:bg-accent",
        className
      )}
    >
      {isDark ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
