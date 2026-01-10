import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { useVideoPlayer } from "@/hooks/useVideoPlayer";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { AppSidebar } from "@/components/chat/AppSidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { VideoPanel } from "@/components/chat/VideoPanel";
import { Button } from "@/components/ui/button";
import { Menu, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Creator, VideoSource, VideoImportMode } from "@/types/chat";
import type { Tables } from "@/types/database";

export function Chat() {
  const { user } = useAuth();
  const chat = useChat();
  const { isOpen, currentVideo, timestamp, openVideo, closeVideo } = useVideoPlayer();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [isLoadingCreators, setIsLoadingCreators] = useState(true);

  // Load creators from database
  useEffect(() => {
    const loadCreators = async () => {
      if (!user) return;
      
      try {
        // Query user_creators to get the user's channels, then join with channels table
        const { data, error } = await supabase
          .from('user_creators')
          .select(`
            channels (
              id,
              channel_id,
              channel_name,
              channel_url,
              avatar_url,
              subscriber_count,
              indexed_videos,
              total_videos,
              ingestion_status,
              ingestion_progress,
              created_at
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading creators:', error);
          return;
        }

        if (data) {
          const formattedCreators: Creator[] = data
            .filter(item => item.channels) // Filter out null channels
            .map(item => {
              const channel = item.channels as unknown as Tables<'channels'>;
              const ingestionStatus = channel.ingestion_status as Creator['ingestionStatus'] || 'pending';
              const legacyStatus = ingestionStatus === 'processing' ? 'processing' : 
                                 ingestionStatus === 'completed' ? 'completed' :
                                 ingestionStatus === 'failed' ? 'failed' :
                                 ingestionStatus === 'partial' ? 'partial' :
                                 ingestionStatus === 'no_captions' ? 'no_captions' : 'completed';
              
              return {
                id: channel.id,
                channelId: channel.channel_id,
                name: channel.channel_name,
                channelUrl: channel.channel_url,
                avatarUrl: channel.avatar_url,
                subscribers: channel.subscriber_count || '0',
                indexedVideos: channel.indexed_videos || 0,
                totalVideos: channel.total_videos || 0,
                ingestionStatus,
                ingestionProgress: channel.ingestion_progress || 0,
                ingestionMethod: null,
                errorMessage: null,
                lastIndexedAt: null,
                ingestVideos: true,
                ingestShorts: false,
                ingestLives: false,
                videoImportMode: 'latest' as VideoImportMode,
                videoImportLimit: null,
                publicSlug: null,
                // Legacy compatibility
                avatar: channel.avatar_url || '',
                subscriberCount: channel.subscriber_count || '0',
                videosIndexed: channel.indexed_videos || 0,
                status: legacyStatus,
                progress: channel.ingestion_progress || 0,
              };
            });
          setCreators(formattedCreators);
        }
      } catch (error) {
        console.error('Error loading creators:', error);
      } finally {
        setIsLoadingCreators(false);
      }
    };

    loadCreators();
  }, [user]);

  const handleChannelAdded = (creator: Creator) => {
    setCreators(prev => {
      // Check if creator already exists
      const exists = prev.find(c => c.id === creator.id);
      if (exists) return prev;
      return [...prev, creator];
    });
    chat.selectCreator(creator);
  };

  // Handle mobile sidebar behavior - update when breakpoint changes
  useEffect(() => {
    if (typeof isMobile === 'boolean') {
      setSidebarOpen(prev => isMobile ? false : prev);
    }
  }, [isMobile]);

  const handleSelectCreator = (creatorId: string) => {
    const creator = creators.find(c => c.id === creatorId);
    if (creator) {
      chat.selectCreator(creator);
    }
    if (isMobile) setSidebarOpen(false);
  };

  const handleSourceClick = (videoId: string, timestamp?: number) => {
    // Create a VideoSource object for the video player
    const videoSource: VideoSource = {
      videoId,
      title: 'Video',
      timestamp: timestamp ? `${Math.floor(timestamp / 60)}:${Math.floor(timestamp % 60).toString().padStart(2, '0')}` : null,
      timestampSeconds: timestamp || null,
      hasTimestamp: timestamp !== undefined,
      id: videoId,
      thumbnail: '',
      url: `https://youtube.com/watch?v=${videoId}`,
    };
    openVideo(videoSource, timestamp);
  };

  const handleToggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const showHamburger = (isMobile && !sidebarOpen) || (!isMobile && !sidebarOpen);

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoadingCreators) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading creators...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background">
      {showHamburger && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleSidebar}
          className="fixed left-3 top-3 z-40 h-10 w-10 rounded-xl bg-card/80 backdrop-blur-sm border border-border shadow-soft hover:bg-card"
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}

      <AppSidebar
        creators={creators}
        activeCreatorId={chat.selectedCreator?.id || null}
        onSelectCreator={handleSelectCreator}
        onDeleteCreator={async () => ({ success: true })}
        onOpenSettings={() => {}}
        onOpenSaved={() => {}}
        showSaved={false}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isMobile={isMobile}
        isTablet={false}
        onChannelAdded={handleChannelAdded}
      />

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 flex overflow-hidden min-w-0">
          <div className="flex-1 overflow-hidden min-w-0">
            <ChatArea
              creator={chat.selectedCreator}
              messages={chat.messages}
              isTyping={chat.isTyping}
              onSendMessage={chat.sendMessage}
              onClearChat={chat.clearChat}
              onSourceClick={handleSourceClick}
            />
          </div>

          {isOpen && (
            <VideoPanel
              isOpen={isOpen}
              video={currentVideo}
              timestamp={timestamp}
              onClose={closeVideo}
            />
          )}
        </div>
      </main>
    </div>
  );
}
