import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Plus, Settings, LogOut, ChevronLeft, X, Bookmark, User, MoreVertical } from 'lucide-react';
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
import { useAuth } from '@/hooks/useAuth';
import type { Creator } from '@/types/chat';

interface AppSidebarProps {
  creators: Creator[];
  activeCreatorId: string | null;
  onSelectCreator: (creatorId: string) => void;
  onAddCreator: () => void;
  onDeleteCreator: (creatorId: string) => Promise<{ success: boolean }>;
  onOpenSettings: () => void;
  onOpenSaved: () => void;
  showSaved?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  isMobile: boolean;
  isTablet: boolean;
  className?: string;
}

export function AppSidebar({
  creators,
  activeCreatorId,
  onSelectCreator,
  onAddCreator,
  onDeleteCreator,
  onOpenSettings,
  onOpenSaved,
  showSaved,
  isOpen,
  onToggle,
  isMobile,
  isTablet,
  className
}: AppSidebarProps) {
  const { user, signOut } = useAuth();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isCollapsed = !isOpen && !isMobile;
  const isMobileOrTablet = isMobile || isTablet;

  const handleLogout = async () => {
    await signOut();
  };

  const handleCreatorSelect = useCallback((creatorId: string) => {
    onSelectCreator(creatorId);
  }, [onSelectCreator]);

  const formatSubscribers = (count: string): string => {
    const num = parseInt(count.replace(/[^\d]/g, ''), 10);
    if (isNaN(num)) return count;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return count;
  };

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobileOrTablet &&
        isOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        onToggle();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileOrTablet, isOpen, onToggle]);

  if (!isOpen && isMobileOrTablet) {
    return null;
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOrTablet && isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        ref={sidebarRef}
        className={cn(
          "relative flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out z-40",
          isMobileOrTablet
            ? "fixed left-0 top-0 h-full w-80 shadow-medium"
            : isCollapsed
            ? "w-16"
            : "w-80",
          !isOpen && !isMobileOrTablet && "w-0 overflow-hidden",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="font-display font-semibold text-sidebar-foreground">ChannelChat</h1>
            </div>
          )}
          
          {isMobileOrTablet && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          
          {!isMobileOrTablet && !isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Add Creator Button */}
          <div className="p-4 border-b border-sidebar-border">
            <Button
              onClick={onAddCreator}
              className={cn(
                "w-full justify-start gap-3 bg-primary hover:bg-primary/90 text-primary-foreground",
                isCollapsed && "justify-center px-0"
              )}
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && "Add Creator"}
            </Button>
          </div>

          {/* Creators List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="p-2 space-y-1">
              {creators.map((creator) => (
                <div
                  key={creator.id}
                  className={cn(
                    "group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                    "hover:bg-sidebar-accent",
                    activeCreatorId === creator.id && "bg-sidebar-accent border border-sidebar-border",
                    isCollapsed && "justify-center px-2"
                  )}
                  onClick={() => handleCreatorSelect(creator.id)}
                >
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={creator.avatar} alt={creator.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {creator.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sidebar-foreground truncate text-sm">
                          {creator.name}
                        </h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteCreator(creator.id);
                              }}
                              className="text-destructive"
                            >
                              Remove Creator
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-sidebar-foreground/60">
                          {formatSubscribers(creator.subscriberCount)} subscribers
                        </span>
                        
                        {creator.status === 'processing' && creator.progress !== undefined ? (
                          <Badge variant="outline" className="text-2xs px-1.5 py-0 h-4 gap-1 text-primary border-primary/30 bg-primary/10">
                            {creator.progress}%
                          </Badge>
                        ) : creator.status === 'completed' ? (
                          <Badge variant="outline" className="text-2xs px-1.5 py-0 h-4 text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20">
                            {creator.videosIndexed} videos
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="border-t border-sidebar-border p-2 space-y-1">
            <Button
              variant="ghost"
              onClick={onOpenSaved}
              className={cn(
                "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent",
                isCollapsed && "justify-center px-0",
                showSaved && "bg-sidebar-accent"
              )}
            >
              <Bookmark className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && "Saved Answers"}
            </Button>
            
            <Button
              variant="ghost"
              onClick={onOpenSettings}
              className={cn(
                "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent",
                isCollapsed && "justify-center px-0"
              )}
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && "Settings"}
            </Button>
          </div>

          {/* User Profile */}
          <div className="border-t border-sidebar-border p-4">
            <div className={cn(
              "flex items-center gap-3",
              isCollapsed && "justify-center"
            )}>
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                    </p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-sidebar-foreground hover:bg-sidebar-accent"
                        >
                          <MoreVertical className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleLogout}>
                          <LogOut className="w-4 h-4 mr-2" />
                          Sign Out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-xs text-sidebar-foreground/60 truncate">
                    {user?.email}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
