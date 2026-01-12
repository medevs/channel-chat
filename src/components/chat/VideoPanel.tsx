import { X, ExternalLink, Share2, Play } from 'lucide-react';
import type { ActiveVideo } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface VideoPanelProps {
  video: ActiveVideo | null;
  onClose: () => void;
}

export function VideoPanel({ video, onClose }: VideoPanelProps) {
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';

  if (!video) return null;

  // Ensure timestampSeconds is a valid integer for YouTube's start parameter
  const startSeconds = video.timestampSeconds && !isNaN(video.timestampSeconds) 
    ? Math.floor(video.timestampSeconds) 
    : 0;
  const embedUrl = `https://www.youtube.com/embed/${video.videoId}?start=${startSeconds}&autoplay=1`;

  const content = (
    <div
      className={cn(
        'bg-video-panel flex flex-col h-full',
        isMobile ? 'fixed inset-0 z-50' : 'w-full max-w-[380px] lg:max-w-[420px] border-l border-border'
      )}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-video-panel-muted shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-video-panel-accent/20 flex items-center justify-center">
            <Play className="w-4 h-4 text-video-panel-accent ml-0.5" />
          </div>
          <span className="font-display font-medium text-sm text-video-panel-foreground">Video Player</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-lg text-video-panel-foreground/70 hover:text-video-panel-foreground hover:bg-video-panel-muted"
        >
          <X className="w-4 h-4" />
        </Button>
      </header>

      {/* Video */}
      <div className="aspect-video w-full bg-black shrink-0">
        <iframe
          src={embedUrl}
          title={video.title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Info */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div>
          <h4 className="font-display font-semibold text-video-panel-foreground text-base md:text-lg leading-tight mb-2">
            {video.title}
          </h4>
          <p className="text-sm text-video-panel-foreground/60">{video.creatorName}</p>
        </div>

        <Badge className="bg-video-panel-accent/20 text-video-panel-accent border-0 gap-2 py-1.5 px-3">
          <span className="w-2 h-2 rounded-full bg-video-panel-accent animate-pulse" />
          <span className="font-medium text-xs">Playing from {video.timestamp}</span>
        </Badge>
      </div>

      {/* Actions */}
      <footer className="p-4 border-t border-video-panel-muted flex gap-2 shrink-0 safe-bottom">
        <Button
          variant="secondary"
          className="flex-1 h-11 rounded-xl bg-video-panel-muted text-video-panel-foreground hover:bg-video-panel-muted/80 text-xs md:text-sm"
          onClick={() => window.open(`https://youtube.com/watch?v=${video.videoId}&t=${startSeconds}`, '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Watch Full Video
        </Button>
        <Button className="h-11 rounded-xl bg-video-panel-accent hover:bg-video-panel-accent/90 text-xs md:text-sm px-5">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </footer>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-40 animate-fade-in" onClick={onClose} />
        <div className="animate-slide-up">{content}</div>
      </>
    );
  }

  return content;
}
