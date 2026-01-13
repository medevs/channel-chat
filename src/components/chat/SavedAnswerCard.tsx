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
    <div className="p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors">
      {/* Creator & metadata */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={creatorAvatar || undefined} />
          <AvatarFallback className="text-xs">
            {creatorName?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {creatorName || 'Unknown Creator'}
          </p>
          <p className="text-2xs text-muted-foreground">
            Saved {format(new Date(answer.created_at), 'MMM d, yyyy')}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={isDeleting}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Answer content */}
      <p className="text-sm text-foreground leading-relaxed mb-3 line-clamp-4">
        {answer.content}
      </p>

      {/* Sources / timestamps */}
      {answer.sources && answer.sources.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {answer.sources.slice(0, 3).map((source, idx) => (
            <button
              key={idx}
              onClick={() => handleSourceClick(source)}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-2xs font-medium',
                'bg-primary/10 text-primary hover:bg-primary/20 transition-colors'
              )}
            >
              <Play className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{source.title}</span>
              {source.timestamp && (
                <span className="text-primary/70">@ {source.timestamp}</span>
              )}
            </button>
          ))}
          {answer.sources.length > 3 && (
            <span className="text-2xs text-muted-foreground px-2 py-1.5">
              +{answer.sources.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
