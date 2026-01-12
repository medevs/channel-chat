import { MessageSquare, Users, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface UsageIndicatorProps {
  className?: string;
  showMessages?: boolean;
  showCreators?: boolean;
}

export function UsageIndicator({ 
  className, 
  showMessages = true, 
  showCreators = false 
}: UsageIndicatorProps) {
  // Mock data for now
  const usage = {
    messagesSentToday: 15,
    creatorsAdded: 3
  };
  
  const limits = {
    maxDailyMessages: 50,
    maxCreators: 5
  };
  
  const planType = 'free';
  const remainingMessages = limits.maxDailyMessages - usage.messagesSentToday;
  const remainingCreators = limits.maxCreators - usage.creatorsAdded;
  const canSendMessage = remainingMessages > 0;
  const canAddCreator = remainingCreators > 0;

  const messagesPercentUsed = (usage.messagesSentToday / limits.maxDailyMessages) * 100;
  const isMessageWarning = messagesPercentUsed >= 70;
  const isMessageCritical = messagesPercentUsed >= 90 || !canSendMessage;

  const isCreatorCritical = !canAddCreator;

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        {showMessages && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant={isMessageCritical ? "destructive" : isMessageWarning ? "secondary" : "outline"}
                className={cn(
                  "text-xs font-normal cursor-default",
                  isMessageCritical && "animate-pulse"
                )}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                {remainingMessages} left
                {isMessageCritical && <AlertTriangle className="h-3 w-3 ml-1" />}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-sm">
                {canSendMessage 
                  ? `${usage.messagesSentToday}/${limits.maxDailyMessages} messages used today`
                  : "Daily message limit reached. Resets at midnight."
                }
              </p>
              {planType === 'free' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Upgrade to Pro for {limits.maxDailyMessages < 500 ? '500' : 'unlimited'} daily messages
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        )}

        {showCreators && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant={isCreatorCritical ? "destructive" : "outline"}
                className="text-xs font-normal cursor-default"
              >
                <Users className="h-3 w-3 mr-1" />
                {usage.creatorsAdded}/{limits.maxCreators}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-sm">
                {canAddCreator 
                  ? `${remainingCreators} creator slot${remainingCreators !== 1 ? 's' : ''} remaining`
                  : "Creator limit reached"
                }
              </p>
              {planType === 'free' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Upgrade to Pro for up to 25 creators
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
