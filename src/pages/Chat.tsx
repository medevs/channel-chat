import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Creator, ActiveVideo } from '@/types/chat';
import { useCreators } from '@/hooks/useCreators';
import { AppSidebar } from '@/components/chat/AppSidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { VideoPanel } from '@/components/chat/VideoPanel';
import { SavedAnswers } from '@/components/chat/SavedAnswers';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Button } from '@/components/ui/button';
import { Menu, Loader2 } from 'lucide-react';

export function Chat() {
  const { creators, isLoading: creatorsLoading, error: creatorsError, addCreator, deleteCreator, updateCreator } = useCreators();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [activeCreatorId, setActiveCreatorId] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<ActiveVideo | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Handle URL parameter for creator selection
  useEffect(() => {
    const creatorParam = searchParams.get('creator');
    if (creatorParam && creators.length > 0) {
      const creator = creators.find(c => c.id === creatorParam);
      if (creator) {
        setActiveCreatorId(creatorParam);
        // Clear the URL parameter after setting the creator
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('creator');
          return newParams;
        });
      }
    }
  }, [creators, searchParams, setSearchParams]);

  useEffect(() => {
    if (isMobile || isTablet) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile, isTablet]);

  const activeCreator = creators.find((c) => c.id === activeCreatorId) || null;

  const handleSelectCreator = useCallback((creatorId: string) => {
    setActiveCreatorId(creatorId);
    setActiveVideo(null);
    setShowSettings(false);
    setShowSaved(false);
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const handleAddCreator = useCallback((newCreator: Creator) => {
    addCreator(newCreator);
    setActiveCreatorId(newCreator.id);
    setActiveVideo(null);
    setShowSettings(false);
    setShowSaved(false);
    if (isMobile) setSidebarOpen(false);
  }, [isMobile, addCreator]);

  const handleDeleteCreator = useCallback(async (creatorId: string, channelId: string) => {
    const result = await deleteCreator(creatorId, channelId);
    if (result.success && activeCreatorId === creatorId) {
      setActiveCreatorId(null);
      setActiveVideo(null);
    }
    return result;
  }, [deleteCreator, activeCreatorId]);

  const handleTimestampClick = useCallback((video: ActiveVideo) => {
    setActiveVideo(video);
  }, []);

  const handleCloseVideo = useCallback(() => {
    setActiveVideo(null);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
    setShowSaved(false);
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const handleCloseSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  const handleOpenSaved = useCallback(() => {
    setShowSaved(true);
    setShowSettings(false);
    setActiveCreatorId(null);
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const handleCloseSaved = useCallback(() => {
    setShowSaved(false);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  // Handle search result click - navigate to creator and highlight message
  const handleSearchResultClick = useCallback((channelId: string, messageId: string) => {
    const creator = creators.find((c) => c.channelId === channelId);
    if (creator) {
      setActiveCreatorId(creator.id);
      setShowSettings(false);
      setShowSaved(false);
      setHighlightMessageId(messageId);
      if (isMobile) setSidebarOpen(false);
      
      // Clear highlight after a delay
      setTimeout(() => setHighlightMessageId(null), 3000);
    }
  }, [creators, isMobile]);

  const showHamburger = (isMobile && !sidebarOpen) || (!isMobile && !sidebarOpen);

  if (creatorsLoading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading creators...</p>
        </div>
      </div>
    );
  }

  if (creatorsError) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md text-center px-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-destructive text-xl">!</span>
          </div>
          <h2 className="font-display font-semibold text-lg">Failed to load creators</h2>
          <p className="text-sm text-muted-foreground">{creatorsError}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-background">
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

      {/* Sidebar - rendered first for proper flex order on desktop */}
      <AppSidebar
        creators={creators}
        activeCreatorId={activeCreatorId}
        onSelectCreator={handleSelectCreator}
        onAddCreator={handleAddCreator}
        onDeleteCreator={handleDeleteCreator}
        onUpdateCreator={updateCreator}
        onOpenSettings={handleOpenSettings}
        onOpenSaved={handleOpenSaved}
        showSaved={showSaved}
        isOpen={sidebarOpen}
        onToggle={handleToggleSidebar}
        isMobile={isMobile}
        isTablet={isTablet}
      />

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 flex overflow-hidden min-w-0">
          <div className="flex-1 overflow-hidden min-w-0">
            {showSettings ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Settings page coming soon...</p>
              </div>
            ) : showSaved ? (
              <SavedAnswers 
                onBack={handleCloseSaved}
                onTimestampClick={handleTimestampClick}
              />
            ) : (
              <ChatArea
                activeCreator={activeCreator}
                onTimestampClick={handleTimestampClick}
                activeVideoId={activeVideo?.videoId}
                activeTimestamp={activeVideo?.timestamp}
                onSearchResultClick={handleSearchResultClick}
                highlightMessageId={highlightMessageId}
              />
            )}
          </div>

          {activeVideo && !showSettings && (
            <VideoPanel video={activeVideo} onClose={handleCloseVideo} />
          )}
        </div>
      </main>
    </div>
  );
}
