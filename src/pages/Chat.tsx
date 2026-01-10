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
import type { Creator, VideoSource } from "@/types/chat";

export function Chat() {
  const { user } = useAuth();
  const chat = useChat();
  const { isOpen, currentVideo, timestamp, openVideo, closeVideo } = useVideoPlayer();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [creators, setCreators] = useState<Creator[]>([]);

  const handleChannelAdded = (creator: Creator) => {
    setCreators(prev => [...prev, creator]);
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
        onAddCreator={() => {}} // We'll use AddChannel component instead
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
