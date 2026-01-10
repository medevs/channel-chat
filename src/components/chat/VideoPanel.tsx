import { useState } from 'react';
import { Play, X, ExternalLink, Share } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { VideoSource } from '@/types/chat';

interface VideoPanelProps {
  isOpen: boolean;
  video: VideoSource | null;
  timestamp?: number;
  onClose: () => void;
  className?: string;
}

export function VideoPanel({ 
  isOpen, 
  video, 
  timestamp, 
  onClose, 
  className 
}: VideoPanelProps) {
  const [isLoading, setIsLoading] = useState(true);

  if (!video) return null;

  const getYouTubeEmbedUrl = () => {
    if (!video.url) return '';
    
    // Extract video ID from various YouTube URL formats
    const videoId = video.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)?.[1];
    if (!videoId) return '';

    const startTime = timestamp ? `&start=${Math.floor(timestamp)}` : '';
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0${startTime}`;
  };

  const formatTimestamp = (seconds?: number) => {
    if (!seconds) return null;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const panelContent = (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">Video Player</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Video Embed */}
      <div className="relative bg-black">
        <div className="aspect-video">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <iframe
            src={getYouTubeEmbedUrl()}
            title={video.title}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
          />
        </div>
      </div>

      {/* Video Info */}
      <div className="flex-1 p-4 space-y-4">
        <div>
          <h3 className="font-bold text-foreground text-lg leading-tight mb-2">
            {video.title}
          </h3>
          <p className="text-muted-foreground">Creator</p>
        </div>

        {/* Playing Badge */}
        {timestamp && (
          <Badge className="bg-primary/20 text-primary border-primary/30">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse mr-2" />
            Playing from {formatTimestamp(timestamp)}
          </Badge>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.open(video.url, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Watch Full Video
          </Button>
          <Button
            variant="outline"
            size="icon"
          >
            <Share className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sheet */}
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent 
          side="bottom" 
          className="h-[90vh] p-0 bg-background border-border lg:hidden"
        >
          {panelContent}
        </SheetContent>
      </Sheet>

      {/* Desktop Panel */}
      <div
        className={cn(
          "hidden lg:flex flex-col w-96 border-l border-border transition-all duration-300",
          isOpen ? "translate-x-0" : "translate-x-full",
          className
        )}
      >
        {isOpen && panelContent}
      </div>
    </>
  );
}