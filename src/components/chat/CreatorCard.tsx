import { MoreVertical, RefreshCw, Share, User, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Creator } from "@/types/chat";

interface CreatorCardProps {
  creator: Creator;
  isSelected: boolean;
  isCollapsed?: boolean;
  onClick: () => void;
  className?: string;
}

export function CreatorCard({
  creator,
  isSelected,
  isCollapsed = false,
  onClick,
  className
}: CreatorCardProps) {
  const getStatusBadge = () => {
    switch (creator.status) {
      case 'processing':
        return (
          <Badge variant="secondary" className="bg-teal-500/20 text-teal-400 border-teal-500/30">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            {creator.progress}%
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
            {creator.videosIndexed} videos
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
            Failed
          </Badge>
        );
      case 'no_captions':
        return (
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            No Captions
          </Badge>
        );
      case 'partial':
        return (
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            Partial
          </Badge>
        );
      default:
        return null;
    }
  };

  const cardContent = (
    <Card
      className={cn(
        "p-3 cursor-pointer transition-all duration-200 border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600",
        isSelected && "bg-teal-500/10 border-teal-500/50 ring-1 ring-teal-500/20",
        isCollapsed && "p-2",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <Avatar className={cn("ring-2 ring-transparent", isSelected && "ring-teal-500/50")}>
          <AvatarImage src={creator.avatar} alt={creator.name} />
          <AvatarFallback className="bg-slate-700 text-slate-300">
            {creator.name[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-white truncate">{creator.name}</h4>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                  <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-slate-700">
                    <User className="w-4 h-4 mr-2" />
                    View Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-slate-700">
                    <Share className="w-4 h-4 mr-2" />
                    Share Link
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-slate-700">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Videos
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Creator
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center justify-between mt-1">
              {getStatusBadge()}
            </div>

            <p className="text-xs text-slate-400 mt-1">
              {creator.subscriberCount} subscribers
            </p>
          </div>
        )}
      </div>
    </Card>
  );

  if (isCollapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {cardContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 border-slate-700">
            <div className="text-sm">
              <p className="font-medium text-white">{creator.name}</p>
              <p className="text-slate-400">{creator.subscriberCount} subscribers</p>
              {getStatusBadge()}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <div className="group">{cardContent}</div>;
}
