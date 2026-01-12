import { Play, AlertTriangle } from 'lucide-react';
import type { VideoSource } from '@/types/chat';
import { cn } from '@/lib/utils';

interface SourceCardProps {
  source: VideoSource;
  onClick: () => void;
  isActive?: boolean;
}

export function SourceCard({ source, onClick, isActive }: SourceCardProps) {
  const hasTimestamp = source.hasTimestamp && source.timestamp;
  
  return (
    <button
      onClick={onClick}
      disabled={!hasTimestamp}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left group',
        isActive
          ? 'bg-primary/10 border-primary shadow-glow'
          : hasTimestamp 
            ? 'bg-source-card border-source-card-border hover:bg-source-card-hover hover:border-primary/40'
            : 'bg-muted/50 border-border opacity-70 cursor-not-allowed'
      )}
    >
      <div
        className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200',
          isActive ? 'bg-primary' : hasTimestamp ? 'bg-muted group-hover:bg-primary/20' : 'bg-muted'
        )}
      >
        {hasTimestamp ? (
          <Play
            className={cn(
              'w-4 h-4 ml-0.5',
              isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary'
            )}
          />
        ) : (
          <AlertTriangle className="w-4 h-4 text-amber-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[13px] text-foreground truncate leading-tight">{source.title}</p>
        {hasTimestamp ? (
          <p className={cn('text-2xs font-semibold mt-0.5', isActive ? 'text-primary' : 'text-muted-foreground')}>
            {source.timestamp}
          </p>
        ) : (
          <p className="text-2xs text-amber-600 mt-0.5">No timestamp data</p>
        )}
      </div>
    </button>
  );
}
