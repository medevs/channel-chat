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
import type { Creator } from "@/types/chat";

// Mock creators data for development
const mockCreators: Creator[] = [
  {
    id: '1',
    name: 'Developers Digest',
    avatar: '/creator-avatar-1.jpg',
    subscriberCount: '54.3K',
    videosIndexed: 10,
    status: 'completed'
  },
  {
    id: '2',
    name: 'Cole Medin',
    avatar: '/creator-avatar-2.jpg',
    subscriberCount: '182.0K',
    videosIndexed: 9,
    status: 'completed'
  },
  {
    id: '3',
    name: 'Processing Creator',
    avatar: '/creator-avatar-3.jpg',
    subscriberCount: '25.1K',
    videosIndexed: 0,
    status: 'processing',
    progress: 45
  }
];

export function Chat() {
  const { user } = useAuth();
  const chat = useChat();
  const videoPlayer = useVideoPlayer();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (isMobile || isTablet) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile, isTablet]);

  const handleSelectCreator = (creatorId: string) => {
    chat.selectCreator(creatorId);
    setShowSettings(false);
    setShowSaved(false);
    if (isMobile) setSidebarOpen(false);
  };

  const handleAddCreator = () => {
    // TODO: Open add creator modal
    console.log('Add creator clicked');
  };

  const handleDeleteCreator = async (creatorId: string) => {
    // TODO: Implement delete creator
    console.log('Delete creator:', creatorId);
    return { success: true };
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
    setShowSaved(false);
    if (isMobile) setSidebarOpen(false);
  };

  const handleOpenSaved = () => {
    setShowSaved(true);
    setShowSettings(false);
    chat.selectCreator(null);
    if (isMobile) setSidebarOpen(false);
  };

  const handleToggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const handleTimestampClick = (videoId: string, timestamp?: number) => {
    const video = {
      id: videoId,
      title: 'Live AI Coding with Ray Fernando - Exploring NEW Workflows',
      thumbnail: '/video-thumb.jpg',
      timestamp,
      url: `https://youtube.com/watch?v=${videoId}`
    };
    videoPlayer.openVideo(video, timestamp);
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
        creators={mockCreators}
        activeCreatorId={chat.selectedCreator?.id || null}
        onSelectCreator={handleSelectCreator}
        onAddCreator={handleAddCreator}
        onDeleteCreator={handleDeleteCreator}
        onOpenSettings={handleOpenSettings}
        onOpenSaved={handleOpenSaved}
        showSaved={showSaved}
        isOpen={sidebarOpen}
        onToggle={handleToggleSidebar}
        isMobile={isMobile}
        isTablet={isTablet}
      />

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 flex overflow-hidden min-w-0">
          <div className="flex-1 overflow-hidden min-w-0">
            {showSettings ? (
              <div className="flex h-full items-center justify-center bg-background">
                <div className="text-center">
                  <h2 className="font-display font-semibold text-lg mb-2">Settings</h2>
                  <p className="text-muted-foreground">Settings page coming soon...</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowSettings(false)}
                    className="mt-4"
                  >
                    Back to Chat
                  </Button>
                </div>
              </div>
            ) : showSaved ? (
              <div className="flex h-full items-center justify-center bg-background">
                <div className="text-center">
                  <h2 className="font-display font-semibold text-lg mb-2">Saved Answers</h2>
                  <p className="text-muted-foreground">Saved answers coming soon...</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowSaved(false)}
                    className="mt-4"
                  >
                    Back to Chat
                  </Button>
                </div>
              </div>
            ) : (
              <ChatArea
                creator={chat.selectedCreator}
                messages={chat.messages}
                isTyping={chat.isTyping}
                onSendMessage={chat.sendMessage}
                onClearChat={chat.clearChat}
                onSourceClick={handleTimestampClick}
              />
            )}
          </div>

          {videoPlayer.isOpen && !showSettings && (
            <VideoPanel
              isOpen={videoPlayer.isOpen}
              video={videoPlayer.currentVideo}
              timestamp={videoPlayer.timestamp}
              onClose={videoPlayer.closeVideo}
            />
          )}
        </div>
      </main>
    </div>
  );
}