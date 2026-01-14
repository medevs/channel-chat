import { useState } from 'react';
import { Play, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { SavedAnswer } from '@/hooks/useSavedAnswers';
import type { ActiveVideo, VideoSource } from '@/types/chat';

interface SavedAnswerCardProps {
  answer: SavedAnswer;
  creatorName?: string;
  creatorAvatar?: string;
  onDelete: (messageId: string) => Promise<boolean>;
  onSourceClick?: (video: ActiveVideo) => void;
}

export function SavedAnswerCard({ 
  answer, 
  creatorName, 
  creatorAvatar, 
  onDelete, 
  onSourceClick 
}: SavedAnswerCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(answer.message_id);
    setIsDeleting(false);
  };

  const handleSourceClick = (source: VideoSource) => {
    if (!onSourceClick) return;
    
    onSourceClick({
      videoId: source.videoId,
      title: source.title,
      creatorName: creatorName || 'Unknown',
      timestamp: source.timestamp,
      timestampSeconds: source.timestampSeconds,
    });
  };

  return (
    <div className="group p-5 rounded-2xl border border-border bg-gradient-to-br from-card to-card/50 hover:border-primary/30 hover:shadow-lg transition-all duration-200">
      {/* Creator & metadata */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="w-9 h-9 ring-2 ring-primary/10">
          <AvatarImage src={creatorAvatar || undefined} />
          <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
            {creatorName?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate text-foreground">
            {creatorName || 'Unknown Creator'}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(answer.created_at), 'MMM d, yyyy • h:mm a')}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={isDeleting}
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Answer content */}
      <div className="mb-4 p-3 rounded-lg bg-muted/30">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {answer.content}
        </p>
      </div>

      {/* Sources / timestamps - Show all */}
      {answer.sources && answer.sources.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Sources ({answer.sources.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {answer.sources.map((source, idx) => (
              <button
                key={idx}
                onClick={() => handleSourceClick(source)}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium',
                  'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground',
                  'transition-all duration-200 hover:scale-105 hover:shadow-md',
                  'border border-primary/20 hover:border-primary'
                )}
              >
                <Play className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[140px]">{source.title}</span>
                {source.timestamp && (
                  <span className="shrink-0 font-mono text-xs opacity-80">
                    {source.timestamp}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
