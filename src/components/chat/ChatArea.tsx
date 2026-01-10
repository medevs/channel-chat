import { useState, useRef, useEffect } from 'react';
import { Send, Lightbulb, Trash2, Mic, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { MessageBubble } from './MessageBubble';
import { EmptyState } from './EmptyState';
import { TypingIndicator } from './TypingIndicator';
import { StatusBanner } from './StatusBanner';
import type { Creator, ChatMessage } from '@/types/chat';

interface ChatAreaProps {
  creator: Creator | null;
  messages: ChatMessage[];
  isTyping: boolean;
  onSendMessage: (message: string) => void;
  onClearChat: () => void;
  onSourceClick: (videoId: string, timestamp?: number) => void;
  className?: string;
}

const suggestedPrompts = [
  'What topics does this creator cover?',
  'What are the key takeaways from recent videos?',
];

export function ChatArea({
  creator,
  messages,
  isTyping,
  onSendMessage,
  onClearChat,
  onSourceClick,
  className
}: ChatAreaProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasMessages = messages.length > 0;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !creator || chatDisabled) return;

    const userMessage = inputValue;
    setInputValue('');

    onSendMessage(userMessage);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInputValue(prompt);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Determine if chat is disabled based on creator status
  const isProcessing = creator?.status === 'processing';
  const isReady = creator?.status === 'completed' || creator?.status === 'partial';
  const isFailed = creator?.status === 'failed';
  const hasIndexedContent = isReady && creator && creator.videosIndexed > 0;
  
  const chatDisabled = isProcessing || isFailed || !hasIndexedContent || isTyping;

  const formatSubscribers = (count: string | null): string => {
    if (!count) return 'Unknown';
    const num = parseInt(count.replace(/[^\d]/g, ''), 10);
    if (isNaN(num)) return count;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M subscribers`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K subscribers`;
    return `${count} subscribers`;
  };

  const getPlaceholder = () => {
    if (!creator) return 'Select a creator to start chatting...';
    if (isProcessing) return `Indexing in progress (${creator.progress || 0}%)...`;
    if (isFailed) return 'Indexing failed - please try again';
    if (isReady) return 'Ask anything...';
    return 'Waiting for content to be indexed...';
  };

  if (!creator) {
    return (
      <div className={cn("flex-1 flex items-center justify-center bg-background", className)}>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-foreground mb-2">Select a creator to start chatting</h3>
          <p className="text-muted-foreground">Choose a creator from the sidebar to begin your conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <header className="flex items-center gap-3 pl-14 pr-4 py-3 md:pl-6 md:pr-6 md:py-4 border-b border-border shrink-0 bg-card/50">
        <Avatar className="w-10 h-10 md:w-11 md:h-11 shrink-0 ring-2 ring-primary/10">
          <AvatarImage src={creator.avatar} alt={creator.name} />
          <AvatarFallback className="font-display">{creator.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-semibold text-sm md:text-base text-foreground truncate">
            {creator.name}
          </h2>
          <p className="text-2xs md:text-xs text-muted-foreground truncate">
            {hasIndexedContent 
              ? `${creator.videosIndexed} videos indexed`
              : 'Processing videos...'
            }
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Search className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Search chat history</p>
            </TooltipContent>
          </Tooltip>
          {hasMessages && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearChat}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              title="Clear chat history"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Badge variant="secondary" className="hidden md:inline-flex text-2xs font-medium shrink-0">
            {formatSubscribers(creator.subscriberCount)}
          </Badge>
        </div>
        {creator.status === 'partial' && (
          <Badge variant="outline" className="text-2xs text-amber-600 border-amber-300">
            Partial
          </Badge>
        )}
      </header>

      {/* Status Banner */}
      <StatusBanner creator={creator} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-2xl mx-auto px-4 py-4 md:px-6 md:py-6">
          {!hasMessages ? (
            <EmptyState
              creator={creator}
              onPromptClick={handleSuggestedPrompt}
            />
          ) : (
            <div className="space-y-5 md:space-y-6">
              {messages.map((message, i) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  creator={creator}
                  onSourceClick={onSourceClick}
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Quick suggestions when chat has messages */}
      {hasMessages && hasIndexedContent && (
        <div className="px-4 md:px-6 pb-2 shrink-0">
          <div className="max-w-2xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
            <Lightbulb className="w-3 h-3 text-muted-foreground shrink-0" />
            {suggestedPrompts.slice(0, 2).map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSuggestedPrompt(prompt)}
                className="px-3 py-1.5 text-2xs md:text-xs rounded-lg border border-border bg-card hover:bg-muted whitespace-nowrap transition-colors text-foreground shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 md:px-6 md:pb-6 shrink-0 safe-bottom bg-background">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className={cn(
            "relative flex items-center bg-card border border-border rounded-2xl shadow-soft focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all",
            chatDisabled && "opacity-60"
          )}>
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              disabled={chatDisabled}
              rows={1}
              className="flex-1 min-h-[48px] max-h-32 resize-none bg-transparent px-4 py-3 pr-24 text-sm focus:outline-none placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                disabled={chatDisabled}
                className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
              >
                <Mic className="w-4 h-4" />
              </Button>
              <Button
                type="submit"
                size="icon"
                disabled={!inputValue.trim() || chatDisabled}
                className="h-9 w-9 rounded-xl"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className="text-2xs text-muted-foreground text-center mt-2 hidden md:block">
            Press Enter to send · Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}