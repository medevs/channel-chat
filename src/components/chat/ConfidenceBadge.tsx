import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, HelpCircle, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConfidenceLevel } from "@/types/chat";

interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel;
  evidenceCount?: number;
  videoCount?: number;
  className?: string;
}

const getConfidenceInfo = (confidence: ConfidenceLevel) => {
  switch (confidence.level) {
    case 'high':
      return {
        icon: CheckCircle2,
        label: 'High confidence',
        description: 'Answer is strongly supported by video content',
        className: 'text-green-600 dark:text-green-500',
        badgeVariant: 'default' as const,
      };
    case 'medium':
      return {
        icon: HelpCircle,
        label: 'Partial match',
        description: 'Answer is partially supported by available content',
        className: 'text-amber-600 dark:text-amber-500',
        badgeVariant: 'secondary' as const,
      };
    case 'low':
      return {
        icon: AlertCircle,
        label: 'Limited evidence',
        description: 'Limited relevant content found',
        className: 'text-orange-500 dark:text-orange-400',
        badgeVariant: 'outline' as const,
      };
    case 'not_covered':
      return {
        icon: XCircle,
        label: 'Not covered',
        description: 'This topic is not covered in the indexed videos',
        className: 'text-muted-foreground',
        badgeVariant: 'outline' as const,
      };
    default:
      return null;
  }
};

export function ConfidenceBadge({ 
  confidence, 
  evidenceCount, 
  videoCount, 
  className 
}: ConfidenceBadgeProps) {
  const info = getConfidenceInfo(confidence);
  
  if (!info) return null;

  const Icon = info.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("flex items-center gap-1.5 text-2xs cursor-help", className)}>
          <Icon className={cn('w-3 h-3', info.className)} />
          <span className={cn('font-medium', info.className)}>{info.label}</span>
          {evidenceCount && videoCount && (
            <span className="text-muted-foreground">
              · {evidenceCount} excerpts from {videoCount} {videoCount === 1 ? 'video' : 'videos'}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p>{info.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}