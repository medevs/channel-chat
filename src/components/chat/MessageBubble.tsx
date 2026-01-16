import { Bookmark, BookmarkCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { SourceCard } from "./SourceCard";
import { MarkdownMessage } from "./MarkdownMessage";
import { cn } from "@/lib/utils";
import type { ChatMessage, Creator } from "@/types/chat";

interface MessageBubbleProps {
  message: ChatMessage;
  creator?: Creator;
  onSourceClick: (videoId: string, timestamp?: number) => void;
  onSave?: (messageId: string) => void;
  isSaved?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function MessageBubble({
  message,
  creator,
  onSourceClick,
  onSave,
  isSaved = false,
  className,
  style
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div
      className={cn(
        "flex gap-3 animate-fade-in",
        isUser && "flex-row-reverse",
        className
      )}
      style={style}
    >
      {/* Avatar */}
      {isAssistant && (
        <Avatar className="w-8 h-8 shrink-0 ring-2 ring-primary/10">
          <AvatarImage src={creator?.avatar ?? undefined} alt={creator?.name ?? 'AI'} />
          <AvatarFallback className="font-display text-xs bg-primary/10 text-primary">
            {creator?.name?.charAt(0) || 'AI'}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn("flex-1 max-w-[85%] md:max-w-[75%]", isUser && "flex flex-col items-end")}>
        {/* Message Bubble */}
        <div
          className={cn(
            "relative px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-soft",
            isUser 
              ? "bg-chat-bubble-user text-chat-bubble-user-foreground rounded-br-md" 
              : "bg-chat-bubble-ai text-chat-bubble-ai-foreground rounded-bl-md"
          )}
        >
          {isAssistant ? (
            <MarkdownMessage content={message.content} />
          ) : (
            <div className="relative z-10 whitespace-pre-wrap">
              {message.content}
            </div>
          )}
        </div>

        {/* Assistant-specific elements */}
        {isAssistant && (
          <div className="mt-3 space-y-3 w-full">
            {/* Confidence Badge */}
            {message.confidence && (
              <ConfidenceBadge 
                confidence={message.confidence}
                evidenceCount={message.sources?.length}
                videoCount={message.sources ? new Set(message.sources.map(s => s.id)).size : undefined}
              />
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div /> {/* Spacer */}
              {onSave && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSave(message.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                >
                  {isSaved ? (
                    <BookmarkCheck className="w-4 h-4 text-primary" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>

            {/* Source Citations */}
            {message.sources && message.sources.length > 0 && (
              <div className="space-y-2">
                <p className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">
                  Sources
                </p>
                <div className="grid gap-2">
                  {message.sources.slice(0, 3).map((source) => (
                    <SourceCard
                      key={source.videoId}
                      source={source}
                      onClick={() => onSourceClick(source.videoId, source.timestampSeconds ?? undefined)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div className={cn("mt-2 text-2xs text-muted-foreground", isUser && "text-right")}>
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  );
}