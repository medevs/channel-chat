import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, Settings, LogOut, ChevronLeft, X, Loader2, Trash2, MoreVertical, Bookmark, User, RefreshCw, Share2, Mic } from 'lucide-react';
import type { Creator } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { AddCreatorModal } from '@/components/AddCreatorModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useRefreshCreator } from '@/hooks/useRefreshCreator';
import { supabase } from '@/lib/supabase';

const formatSubscribers = (count: string | null): string => {
  if (!count) return 'Unknown';
  const num = parseInt(count, 10);
  if (isNaN(num)) return count;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return count;
};

const getStatusBadge = (creator: Creator, isRefreshing: boolean) => {
  // Show refreshing state
  if (isRefreshing) {
    return (
      <Badge variant="outline" className="text-2xs px-1.5 py-0 h-4 gap-1 text-primary border-primary/30 bg-primary/10">
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
        Refreshing
      </Badge>
    );
  }
  
  // Processing states
  if (creator.ingestionStatus === 'processing' || creator.ingestionStatus === 'indexing' || creator.ingestionStatus === 'pending' || creator.ingestionStatus === 'extracting' || creator.ingestionStatus === 'paused') {
    return (
      <Badge variant="outline" className="text-2xs px-1.5 py-0 h-4 gap-1 text-primary border-primary/30 bg-primary/10">
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
        {creator.ingestionProgress}%
      </Badge>
    );
  }
  
  // No captions available - data limitation, not system failure
  if (creator.ingestionStatus === 'no_captions') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="text-2xs px-1.5 py-0 h-4 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20 cursor-help">
            No Captions
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[200px]">
          <p className="text-xs">This channel's videos don't have captions enabled. The creator needs to add captions for chat to work.</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  // Failed - system error
  if (creator.ingestionStatus === 'failed') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="text-2xs px-1.5 py-0 h-4 text-destructive border-destructive/30 cursor-help">
            Failed
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[200px]">
          <p className="text-xs">{creator.errorMessage || 'Failed to index channel. Try again later.'}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  // Partial success - some videos indexed
  if (creator.ingestionStatus === 'partial') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="text-2xs px-1.5 py-0 h-4 text-amber-600 border-amber-300 cursor-help">
            Partial
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[200px]">
          <p className="text-xs">{creator.indexedVideos} of {creator.totalVideos} videos have captions and are ready for chat.</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  // Completed - show indexed count if available
  if (creator.ingestionStatus === 'completed' && creator.indexedVideos > 0) {
    return (
      <Badge variant="outline" className="text-2xs px-1.5 py-0 h-4 text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20">
        {creator.indexedVideos} videos
      </Badge>
    );
  }
  
  return null;
};

interface AppSidebarProps {
  creators: Creator[];
  activeCreatorId: string | null;
  onSelectCreator: (id: string) => void;
  onAddCreator: (creator: Creator) => void;
  onDeleteCreator: (creatorId: string, channelId: string) => Promise<{ success: boolean; error?: string }>;
  onUpdateCreator: (creator: Creator) => void;
  onOpenSettings: () => void;
  onOpenSaved: () => void;
  onOpenVoiceConversations?: () => void;
  showSaved?: boolean;
  showVoiceConversations?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  isMobile: boolean;
  isTablet: boolean;
}

export function AppSidebar({
  creators,
  activeCreatorId,
  onSelectCreator,
  onAddCreator,
  onDeleteCreator,
  onUpdateCreator,
  onOpenSettings,
  onOpenSaved,
  onOpenVoiceConversations,
  showSaved,
  showVoiceConversations,
  isOpen,
  onToggle,
  isMobile,
  isTablet,
}: AppSidebarProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { refreshCreator, isRefreshing } = useRefreshCreator(onUpdateCreator);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const isCollapsed = !isOpen && !isMobile;

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  const handleViewProfile = useCallback((e: React.MouseEvent, creatorId: string) => {
    e.stopPropagation();
    navigate(`/creator/${creatorId}`);
    if (isMobile || isTablet) onToggle();
  }, [navigate, isMobile, isTablet, onToggle]);

  const handleRefreshCreator = useCallback(async (e: React.MouseEvent, creator: Creator) => {
    e.stopPropagation();
    
    // Clear any existing polling interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    // Start polling for progress updates
    pollIntervalRef.current = window.setInterval(async () => {
      const { data: updatedChannel } = await supabase
        .from('channels')
        .select('ingestion_status, ingestion_progress, indexed_videos, total_videos')
        .eq('id', creator.id)
        .single();
      
      if (updatedChannel) {
        onUpdateCreator({
          ...creator,
          ingestionStatus: updatedChannel.ingestion_status,
          ingestionProgress: updatedChannel.ingestion_progress || 0,
          indexedVideos: updatedChannel.indexed_videos || 0,
          totalVideos: updatedChannel.total_videos || 0,
        });
      }
    }, 2000); // Poll every 2 seconds
    
    const result = await refreshCreator(creator.id);
    
    // Stop polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    
    // Final update after refresh completes
    if (result.success) {
      const { data: updatedChannel } = await supabase
        .from('channels')
        .select('*')
        .eq('id', creator.id)
        .single();
      
      if (updatedChannel) {
        onUpdateCreator({
          ...creator,
          indexedVideos: updatedChannel.indexed_videos || 0,
          totalVideos: updatedChannel.total_videos || 0,
          ingestionStatus: updatedChannel.ingestion_status,
          ingestionProgress: updatedChannel.ingestion_progress || 0,
        });
      }
    }
  }, [refreshCreator, onUpdateCreator]);

  const handleShareCreator = useCallback(async (e: React.MouseEvent, creator: Creator) => {
    e.stopPropagation();
    
    // Generate slug if it doesn't exist
    let slug = creator.publicSlug;
    
    if (!slug) {
      // Generate a URL-friendly slug from the channel name
      slug = creator.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
      
      // Add random suffix to ensure uniqueness
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
      
      // Save the slug to the database
      const { error } = await supabase
        .from('channels')
        .update({ public_slug: slug })
        .eq('id', creator.id);
      
      if (error) {
        console.error('Error setting public slug:', error);
        toast.error('Failed to create share link');
        return;
      }
    }
    
    const shareUrl = `${window.location.origin}/creator/${slug}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
    } catch {
      toast.info(`Share link: ${shareUrl}`);
    }
  }, []);

  const handleLogout = async () => {
    await signOut();
  };

  const handleDeleteCreator = useCallback(async (e: React.MouseEvent, creator: Creator) => {
    e.stopPropagation();
    if (!confirm(`Remove "${creator.name}" from your list? Your chat history will be deleted.`)) return;
    
    setDeletingId(creator.id);
    const result = await onDeleteCreator(creator.id, creator.channelId);
    setDeletingId(null);
    
    if (result.success) {
      toast.success(`Removed ${creator.name}`);
    } else {
      toast.error(result.error || 'Failed to remove creator');
    }
  }, [onDeleteCreator]);

  // Close sidebar on outside click (mobile/tablet overlay)
  useEffect(() => {
    if ((!isMobile && !isTablet) || !isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onToggle();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isMobile, isTablet, isOpen, onToggle]);

  // Swipe to close (mobile)
  useEffect(() => {
    if (!isMobile || !isOpen) return;
    let startX = 0;
    const handleTouchStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const handleTouchEnd = (e: TouchEvent) => {
      if (startX - e.changedTouches[0].clientX > 60) onToggle();
    };
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isOpen, onToggle]);

  const handleCreatorSelect = useCallback((id: string) => {
    onSelectCreator(id);
  }, [onSelectCreator]);

  // On mobile/tablet: sidebar is an overlay, positioned fixed
  // On desktop: sidebar is part of the layout flow
  const isMobileOrTablet = isMobile || isTablet;

  const sidebarContent = (
    <aside
      ref={sidebarRef}
      className={cn(
        'flex flex-col h-full overflow-hidden',
        isMobileOrTablet
          ? 'fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] shadow-2xl transition-transform duration-300 ease-out bg-background border-r border-sidebar-border'
          : cn(
              'bg-sidebar transition-all duration-300 ease-out border-r border-sidebar-border',
              isCollapsed ? 'w-[72px]' : 'w-[260px] lg:w-[280px]'
            ),
        isMobileOrTablet && (isOpen ? 'translate-x-0' : '-translate-x-full')
      )}
    >
      {/* Header */}
      <header className="flex items-center gap-3 p-4 shrink-0">
        <div className={cn(
          'flex items-center justify-center shrink-0 rounded-xl bg-primary shadow-glow',
          isCollapsed ? 'w-10 h-10' : 'w-9 h-9'
        )}>
          <MessageSquare className={cn('text-primary-foreground', isCollapsed ? 'w-5 h-5' : 'w-4 h-4')} />
        </div>
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-semibold text-sidebar-foreground truncate">ChannelChat</h1>
          </div>
        )}
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="shrink-0 h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          >
            {isMobile ? <X className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        )}
      </header>

      {/* Creators Section */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3">
        {!isCollapsed && (
          <p className="px-2 py-2 text-2xs font-medium uppercase tracking-widest text-muted-foreground">
            Creators
          </p>
        )}
        
        {/* Add Creator */}
        <div className="mb-2">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsModalOpen(true)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60',
                  isCollapsed ? 'p-2 justify-center' : 'p-2.5'
                )}
              >
                <div className={cn('flex items-center justify-center rounded-lg border-2 border-dashed border-border', 
                  isCollapsed ? 'w-10 h-10' : 'w-9 h-9'
                )}>
                  <Plus className="w-4 h-4" />
                </div>
                {!isCollapsed && <span className="text-[13px] font-medium">Add Creator</span>}
              </button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Add Creator</TooltipContent>}
          </Tooltip>
        </div>

        {/* Saved Answers */}
        <div className="mb-2">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={onOpenSaved}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl transition-all duration-200',
                  isCollapsed ? 'p-2 justify-center' : 'p-2.5',
                  showSaved
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60'
                )}
              >
                <div className={cn('flex items-center justify-center', isCollapsed ? 'w-10 h-10' : 'w-9 h-9')}>
                  <Bookmark className="w-4 h-4" />
                </div>
                {!isCollapsed && <span className="text-[13px] font-medium">Saved Answers</span>}
              </button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Saved Answers</TooltipContent>}
          </Tooltip>
        </div>

        {/* Voice Conversations */}
        <div className="mb-2">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={onOpenVoiceConversations}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl transition-all duration-200',
                  isCollapsed ? 'p-2 justify-center' : 'p-2.5',
                  showVoiceConversations
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60'
                )}
              >
                <div className={cn('flex items-center justify-center', isCollapsed ? 'w-10 h-10' : 'w-9 h-9')}>
                  <Mic className="w-4 h-4" />
                </div>
                {!isCollapsed && <span className="text-[13px] font-medium">Voice Conversations</span>}
              </button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Voice Conversations</TooltipContent>}
          </Tooltip>
        </div>

        <nav className="space-y-1">
          {creators.map((creator, i) => (
            <div
              key={creator.id}
              style={{ animationDelay: `${i * 50}ms` }}
              className={cn(
                'w-full flex items-center gap-2 rounded-xl transition-all duration-200 text-left animate-fade-in group',
                isCollapsed ? 'p-2 justify-center' : 'p-2.5 pr-2',
                activeCreatorId === creator.id
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-soft'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
              )}
            >
              {isCollapsed ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleCreatorSelect(creator.id)}
                      className="flex items-center justify-center"
                    >
                      <Avatar className={cn('shrink-0 ring-2 ring-transparent transition-all w-10 h-10', 
                        activeCreatorId === creator.id && 'ring-primary/30'
                      )}>
                        <AvatarImage key={creator.avatarUrl} src={creator.avatarUrl || undefined} alt={creator.name} />
                        <AvatarFallback className="font-display text-xs">
                          {creator.avatarUrl ? creator.name.charAt(0) : (
                            creator.ingestionStatus === 'pending' || creator.ingestionStatus === 'processing' ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : creator.name.charAt(0)
                          )}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{creator.name}</TooltipContent>
                </Tooltip>
              ) : (
                <>
                  <button
                    onClick={() => handleCreatorSelect(creator.id)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <Avatar className={cn('shrink-0 ring-2 ring-transparent transition-all w-9 h-9', 
                      activeCreatorId === creator.id && 'ring-primary/30'
                    )}>
                      <AvatarImage key={creator.avatarUrl} src={creator.avatarUrl || undefined} alt={creator.name} />
                      <AvatarFallback className="font-display text-xs">
                        {creator.avatarUrl ? creator.name.charAt(0) : (
                          creator.ingestionStatus === 'pending' || creator.ingestionStatus === 'processing' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : creator.name.charAt(0)
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[13px] truncate flex-1">{creator.name}</p>
                        {getStatusBadge(creator, isRefreshing(creator.id))}
                      </div>
                      <p className="text-2xs text-muted-foreground truncate">
                        {creator.subscribers ? formatSubscribers(creator.subscribers) : (
                          creator.ingestionStatus === 'pending' || creator.ingestionStatus === 'processing' ? (
                            <span className="flex items-center gap-1">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              Loading...
                            </span>
                          ) : 'Unknown'
                        )}
                      </p>
                    </div>
                  </button>
                  
                  {/* Three-dot dropdown menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => e.stopPropagation()}
                        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                      >
                        {deletingId === creator.id || isRefreshing(creator.id) ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <MoreVertical className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={(e) => handleViewProfile(e as unknown as React.MouseEvent, creator.id)}>
                        <User className="w-4 h-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleShareCreator(e as unknown as React.MouseEvent, creator)}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share Link
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => handleRefreshCreator(e as unknown as React.MouseEvent, creator)}
                        disabled={isRefreshing(creator.id)}
                      >
                        <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing(creator.id) && "animate-spin")} />
                        Refresh Videos
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => handleDeleteCreator(e as unknown as React.MouseEvent, creator)}
                        disabled={deletingId === creator.id}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove Creator
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="shrink-0 p-3 border-t border-sidebar-border">
        {/* User row */}
        <div className={cn(
          'flex items-center gap-2 p-2 rounded-lg',
          isCollapsed ? 'justify-center' : ''
        )}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="font-display text-xs bg-primary/10 text-primary">
              {(user?.email?.charAt(0) || 'U').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate text-sidebar-foreground">{user?.email}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className={cn('flex gap-1 mt-2', isCollapsed ? 'flex-col' : 'flex-row')}>
          {/* Theme toggle */}
          {isCollapsed ? (
            <ThemeToggle collapsed />
          ) : (
            <ThemeToggle showLabel />
          )}
        </div>
        
        <div className={cn('flex gap-1 mt-1', isCollapsed ? 'flex-col' : 'flex-row')}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={isCollapsed ? 'icon' : 'sm'}
                onClick={onOpenSettings}
                className={cn(
                  'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent',
                  isCollapsed ? 'h-10 w-10 rounded-xl' : 'flex-1 justify-start'
                )}
              >
                <Settings className={cn('w-4 h-4', !isCollapsed && 'mr-2')} />
                {!isCollapsed && 'Settings'}
              </Button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Settings</TooltipContent>}
          </Tooltip>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={isCollapsed ? 'icon' : 'sm'}
                onClick={handleLogout}
                className={cn(
                  'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent',
                  isCollapsed ? 'h-10 w-10 rounded-xl' : 'flex-1 justify-start'
                )}
              >
                <LogOut className={cn('w-4 h-4', !isCollapsed && 'mr-2')} />
                {!isCollapsed && 'Logout'}
              </Button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Logout</TooltipContent>}
          </Tooltip>
        </div>
      </div>

      {/* Add Creator Modal */}
      <AddCreatorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddCreator={(creator) => {
          onAddCreator(creator);
          setIsModalOpen(false);
        }}
      />
    </aside>
  );

  // Mobile/Tablet: render as overlay
  if (isMobileOrTablet) {
    return (
      <>
        {/* Backdrop */}
        <div
          className={cn(
            'fixed inset-0 z-40 bg-background backdrop-blur-sm transition-opacity duration-300',
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={onToggle}
        />
        {/* Sidebar */}
        {sidebarContent}
      </>
    );
  }

  // Desktop: render inline
  return sidebarContent;
}
