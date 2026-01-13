import { Progress } from "@/components/ui/progress";
import { Loader2, AlertTriangle } from "lucide-react";
import type { Creator } from "@/types/chat";

interface StatusBannerProps {
  creator: Creator;
}

export function StatusBanner({ creator }: StatusBannerProps) {
  const isProcessing = creator.status === 'processing' || creator.status === 'indexing' || creator.status === 'pending' || creator.status === 'extracting' || creator.status === 'paused';
  const isFailed = creator.status === 'failed';
  const isReady = creator.status === 'completed' || creator.status === 'partial';
  const hasIndexedContent = isReady && creator.videosIndexed > 0;

  // Processing indicator
  if (isProcessing) {
    return (
      <div className="px-4 py-4 bg-primary/5 border-b border-primary/20">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Indexing {creator.name}'s videos...
              </p>
              <p className="text-xs text-muted-foreground">
                {creator.progress || 0}% complete • Processing videos
              </p>
            </div>
          </div>
          <Progress value={creator.progress || 0} className="h-2" />
        </div>
      </div>
    );
  }

  // Failed state
  if (isFailed) {
    return (
      <div className="px-4 py-3 bg-destructive/10 border-b border-destructive/20">
        <div className="flex items-start gap-2 max-w-2xl mx-auto">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm text-destructive">
            <p className="font-medium">Indexing failed</p>
            <p className="text-xs opacity-80">
              An error occurred while processing this channel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Ready but no content warning
  if (isReady && !hasIndexedContent) {
    return (
      <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
        <div className="flex items-start gap-2 max-w-2xl mx-auto">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium">No content indexed</p>
            <p className="text-xs opacity-80">
              No transcripts were found for this channel's videos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}