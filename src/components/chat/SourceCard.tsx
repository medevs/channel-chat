import { Play, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { VideoSource } from "@/types/chat";

interface SourceCardProps {
  source: VideoSource;
  onClick: () => void;
  isActive?: boolean;
  className?: string;
}

export function SourceCard({ source, onClick, isActive = false, className }: SourceCardProps) {
  const formatTimestamp = (seconds?: number) => {
    if (!seconds) return null;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const hasTimestamp = source.timestamp !== undefined;
  const formattedTime = formatTimestamp(source.timestamp);

  return (
    <Card
      className={cn(
        "p-3 cursor-pointer transition-all duration-200 border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600",
        isActive && "bg-teal-500/10 border-teal-500/50 ring-1 ring-teal-500/20 shadow-lg shadow-teal-500/10",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Play/Warning Icon */}
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          hasTimestamp ? "bg-teal-500/20 text-teal-400" : "bg-amber-500/20 text-amber-400"
        )}>
          {hasTimestamp ? (
            <Play className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white text-sm truncate">
            {source.title}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            {hasTimestamp ? (
              <span className="text-xs text-teal-400 font-mono">
                {formattedTime}
              </span>
            ) : (
              <span className="text-xs text-amber-400">
                No timestamp data
              </span>
            )}
          </div>
        </div>

        {/* Thumbnail (optional) */}
        {source.thumbnail && (
          <div className="flex-shrink-0 w-12 h-8 rounded overflow-hidden bg-slate-700">
            <img
              src={source.thumbnail}
              alt={source.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Hide image on error
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="mt-2 flex items-center gap-2 text-xs text-teal-400">
          <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
          Currently playing
        </div>
      )}
    </Card>
  );
}
