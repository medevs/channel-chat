import { useState, useRef, useEffect } from 'react';
import { Send, Lightbulb, Sparkles, AlertTriangle, Bug, Loader2, Trash2, Bookmark, CheckCircle2, HelpCircle, AlertCircle, XCircle, Search } from 'lucide-react';
import type { Creator, VideoSource, ActiveVideo, AnswerConfidence } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { SourceCard } from './SourceCard';
import { MarkdownMessage } from './MarkdownMessage';
import { EmptyState } from './EmptyState';
import { VoiceInput } from './VoiceInput';
import { UsageIndicator } from './UsageIndicator';
import { usePersistentChat } from '@/hooks/usePersistentChat';
import { useSavedAnswers } from '@/hooks/useSavedAnswers';
import { ChatSearchDialog } from './ChatSearchDialog';

// Debug mode flag - shows chunk IDs and similarity scores
const DEBUG_MODE = true;

interface ChatAreaProps {
  activeCreator: Creator | null;
  onTimestampClick: (video: ActiveVideo) => void;
  activeVideoId?: string;
  activeTimestamp?: string;
  onSearchResultClick?: (channelId: string, messageId: string) => void;
  highlightMessageId?: string | null;
}

export function ChatArea({
  activeCreator,
  onTimestampClick,
  activeVideoId,
  activeTimestamp,
  onSearchResultClick,
  highlightMessageId,
}: ChatAreaProps) {
  const [inputValue, setInputValue] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Use persistent chat hook with database storage
  const { 
    messages, 
    sendMessage, 
    isLoading: isTyping, 
    isLoadingHistory,
    clearHistory,
    sessionId,
  } = usePersistentChat({
    channelId: activeCreator?.channelId || null,
    creatorName: activeCreator?.name || 'the creator',
  });

  // Saved answers hook
  const { isSaved, toggleSave } = useSavedAnswers({ channelId: activeCreator?.channelId });

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!highlightMessageId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, highlightMessageId]);

  // Scroll to highlighted message when searching
  useEffect(() => {
    if (highlightMessageId && messageRefs.current.has(highlightMessageId)) {
      const el = messageRefs.current.get(highlightMessageId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightMessageId]);

  // Handle search result click
  const handleSearchResultClick = (result: any) => {
    if (result.channelId !== activeCreator?.channelId) {
      // Navigate to different creator
      onSearchResultClick?.(result.channelId, result.id);
    } else {
      // Same creator, just scroll to message
      if (messageRefs.current.has(result.id)) {
        const el = messageRefs.current.get(result.id);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeCreator) return;

    const userMessage = inputValue;
    setInputValue('');

    // Call persistent RAG chat API
    await sendMessage(userMessage);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInputValue(prompt);
    textareaRef.current?.focus();
  };

  const handleVoiceTranscript = (text: string) => {
    setInputValue(text);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSourceClick = (source: VideoSource) => {
    if (!activeCreator) return;
    onTimestampClick({
      videoId: source.videoId,
      title: source.title,
      creatorName: activeCreator.name,
      timestamp: source.timestamp,
      timestampSeconds: source.timestampSeconds,
    });
  };

  const formatSubscribers = (count: string | null): string => {
    if (!count) return 'Unknown';
    const num = parseInt(count, 10);
    if (isNaN(num)) return count;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M subscribers`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K subscribers`;
    return `${count} subscribers`;
  };

  // Confidence indicator helper
  const getConfidenceInfo = (confidence?: AnswerConfidence) => {
    switch (confidence) {
      case 'high':
        return {
          icon: CheckCircle2,
          label: 'High confidence',
          description: 'Answer is strongly supported by video content',
          className: 'text-green-600 dark:text-green-500',
          badgeVariant: 'default' as const,
        };
      case 'medium':
        return {
          icon: HelpCircle,
          label: 'Partial match',
          description: 'Answer is partially supported by available content',
          className: 'text-amber-600 dark:text-amber-500',
          badgeVariant: 'secondary' as const,
        };
      case 'low':
        return {
          icon: AlertCircle,
          label: 'Limited evidence',
          description: 'Limited relevant content found',
          className: 'text-orange-500 dark:text-orange-400',
          badgeVariant: 'outline' as const,
        };
      case 'not_covered':
        return {
          icon: XCircle,
          label: 'Not covered',
          description: 'This topic is not covered in the indexed videos',
          className: 'text-muted-foreground',
          badgeVariant: 'outline' as const,
        };
      default:
        return null;
    }
  };

  if (!activeCreator) {
    return <EmptyState type="no-creator" />;
  }

  // Check if creator is ready for chat
  const isProcessing = activeCreator.ingestionStatus === 'pending' || activeCreator.ingestionStatus === 'indexing' || activeCreator.ingestionStatus === 'processing' || activeCreator.ingestionStatus === 'extracting' || activeCreator.ingestionStatus === 'paused';
  const isReady = activeCreator.ingestionStatus === 'completed' || activeCreator.ingestionStatus === 'partial';
  const isFailed = activeCreator.ingestionStatus === 'failed';
  const hasIndexedContent = isReady && activeCreator.indexedVideos > 0;
  
  // Chat is disabled if:
  // - Still processing
  // - Failed to index
  // - Ready but no indexed content (no captions found)
  // - Currently waiting for response
  const chatDisabled = isProcessing || isFailed || !hasIndexedContent || isTyping;

  // Dynamic suggested prompts based on creator
  const suggestedPrompts = [
    `What topics does ${activeCreator.name} cover?`,
    `What are the key takeaways from recent videos?`,
    `Summarize the main themes discussed`,
  ];

  return (
    <div key={activeCreator.id} className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 pl-14 pr-4 py-3 md:pl-6 md:pr-6 md:py-4 border-b border-border shrink-0 bg-card/50">
        <Avatar className="w-10 h-10 md:w-11 md:h-11 shrink-0 ring-2 ring-primary/10">
          <AvatarImage src={activeCreator.avatarUrl || undefined} alt={activeCreator.name} />
          <AvatarFallback className="font-display">{activeCreator.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-semibold text-sm md:text-base text-foreground truncate">
            {activeCreator.name}
          </h2>
          <p className="text-2xs md:text-xs text-muted-foreground truncate">
            {hasIndexedContent 
              ? `${activeCreator.indexedVideos} videos indexed`
              : 'Processing videos...'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <UsageIndicator showMessages className="hidden sm:flex" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchOpen(true)}
                  className="h-10 w-10 md:h-8 md:w-8 text-muted-foreground hover:text-foreground"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Search chat history <kbd className="ml-1 text-[10px] bg-muted px-1 rounded">⌘K</kbd></p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearHistory}
              className="h-10 w-10 md:h-8 md:w-8 text-muted-foreground hover:text-destructive"
              title="Clear chat history"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Badge variant="secondary" className="hidden md:inline-flex text-2xs font-medium shrink-0">
            {formatSubscribers(activeCreator.subscribers)}
          </Badge>
        </div>
        {activeCreator.ingestionStatus === 'partial' && (
          <Badge variant="outline" className="text-2xs text-amber-600 border-amber-300">
            Partial
          </Badge>
        )}
      </header>

      {/* Processing indicator */}
      {isProcessing && (
        <div className="px-4 py-4 bg-primary/5 border-b border-primary/20">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Indexing {activeCreator.name}'s videos...
                </p>
                <p className="text-xs text-muted-foreground">
                  {activeCreator.ingestionProgress}% complete • {activeCreator.totalVideos} videos
                </p>
              </div>
            </div>
            <Progress value={activeCreator.ingestionProgress} className="h-2" />
          </div>
        </div>
      )}

      {/* Failed state */}
      {isFailed && (
        <div className="px-4 py-3 bg-destructive/10 border-b border-destructive/20">
          <div className="flex items-start gap-2 max-w-2xl mx-auto">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm text-destructive">
              <p className="font-medium">Indexing failed</p>
              <p className="text-xs opacity-80">
                {activeCreator.errorMessage || 'An error occurred while processing this channel.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ready but no content warning */}
      {isReady && !hasIndexedContent && (
        <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
          <div className="flex items-start gap-2 max-w-2xl mx-auto">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">No content indexed</p>
              <p className="text-xs opacity-80">
                No transcripts were found for this channel's videos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading history indicator */}
      {isLoadingHistory && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Loading chat history...</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-2xl mx-auto px-4 py-4 md:px-6 md:py-6">
          {!isLoadingHistory && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 mb-5 rounded-2xl bg-primary/10 flex items-center justify-center animate-float">
                <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-lg md:text-xl text-foreground mb-2">
                Start a conversation
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs text-balance">
                Ask anything about {activeCreator.name}'s videos.
                {hasIndexedContent && (
                  <> I've indexed <span className="font-semibold text-primary">{activeCreator.indexedVideos}</span> videos.</>
                )}
              </p>

              {/* Suggested prompts */}
              {hasIndexedContent && (
                <div className="w-full max-w-md space-y-3">
                  <p className="text-2xs font-medium uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
                    <Lightbulb className="w-3 h-3" />
                    Suggestions
                  </p>
                  <div className="flex flex-col gap-2">
                    {suggestedPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestedPrompt(prompt)}
                        style={{ animationDelay: `${i * 80}ms` }}
                        className="px-4 py-2.5 text-sm text-left rounded-xl border border-border bg-card hover:bg-muted hover:border-primary/30 transition-all duration-200 text-foreground animate-fade-in"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5 md:space-y-6">
              {messages.map((message, i) => (
                <div
                  key={message.id}
                  ref={(el) => {
                    if (el) messageRefs.current.set(message.id, el);
                  }}
                  style={{ animationDelay: `${i * 50}ms` }}
                  className={cn(
                    'flex gap-2.5 md:gap-3 animate-fade-in transition-all duration-500',
                    message.type === 'user' ? 'justify-end' : 'justify-start',
                    highlightMessageId === message.id && 'ring-2 ring-primary/50 rounded-2xl bg-primary/5'
                  )}
                >
                  {message.type === 'ai' && (
                    <Avatar className="w-7 h-7 md:w-8 md:h-8 shrink-0 mt-0.5 ring-2 ring-primary/10">
                      <AvatarImage src={activeCreator.avatarUrl || undefined} alt={activeCreator.name} />
                      <AvatarFallback className="text-2xs bg-primary/10 text-primary font-display">{activeCreator.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn('max-w-[85%] md:max-w-[75%] space-y-3', message.type === 'user' && 'items-end')}>
                    <div className="relative group">
                      <div
                        className={cn(
                          'px-4 py-2.5 md:py-3 text-[13px] md:text-sm leading-relaxed',
                          message.type === 'user'
                            ? 'bg-chat-bubble-user text-chat-bubble-user-foreground rounded-2xl rounded-br-md'
                            : 'bg-chat-bubble-ai text-chat-bubble-ai-foreground rounded-2xl rounded-bl-md'
                        )}
                      >
                        {message.type === 'ai' ? (
                          <MarkdownMessage content={message.content} />
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        )}
                      </div>
                      
                      {/* Save button for AI messages */}
                      {message.type === 'ai' && sessionId && activeCreator && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleSave(
                            message.id,
                            activeCreator.channelId,
                            sessionId,
                            message.content,
                            message.sources || []
                          )}
                          className={cn(
                            'absolute -right-9 top-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity',
                            isSaved(message.id) && 'opacity-100 text-primary'
                          )}
                        >
                          <Bookmark className={cn('w-4 h-4', isSaved(message.id) && 'fill-current')} />
                        </Button>
                      )}
                    </div>

                    {/* Confidence indicator - always show for AI messages with confidence */}
                    {message.type === 'ai' && message.confidence && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 text-2xs cursor-help">
                              {(() => {
                                const info = getConfidenceInfo(message.confidence);
                                if (!info) return null;
                                const Icon = info.icon;
                                return (
                                  <>
                                    <Icon className={cn('w-3 h-3', info.className)} />
                                    <span className={cn('font-medium', info.className)}>{info.label}</span>
                                    {message.evidence && (
                                      <span className="text-muted-foreground">
                                        · {message.evidence.chunksUsed} excerpts from {message.evidence.videosReferenced} {message.evidence.videosReferenced === 1 ? 'video' : 'videos'}
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs">
                            <p>{getConfidenceInfo(message.confidence)?.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {/* Debug info - developer mode only */}
                    {DEBUG_MODE && message.type === 'ai' && message.debug && (
                      <div className="flex items-center gap-2 text-2xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                        <Bug className="w-3 h-3" />
                        <span>Chunks: {message.debug.chunksFound}</span>
                        <span>•</span>
                        <span>Videos: {message.debug.videosReferenced}</span>
                        <span>•</span>
                        <span className={message.debug.isFromDatabase ? 'text-green-600' : 'text-amber-600'}>
                          {message.debug.isFromDatabase ? '✓ From DB' : '⚠ No DB data'}
                        </span>
                      </div>
                    )}

                    {/* Sources - only show if showSources flag is true and we have sources */}
                    {message.type === 'ai' && message.sources && message.sources.length > 0 && message.showSources !== false && (
                      <div className="space-y-2">
                        <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                          Watch here
                        </p>
                        <div className="space-y-1.5">
                          {message.sources.slice(0, 4).map((source, index) => (
                            <div key={index}>
                              <SourceCard
                                source={source}
                                onClick={() => handleSourceClick(source)}
                                isActive={activeVideoId === source.videoId && activeTimestamp === source.timestamp}
                              />
                              {/* Debug: show similarity score */}
                              {DEBUG_MODE && source.similarity !== undefined && (
                                <div className="text-2xs text-muted-foreground pl-2 mt-1">
                                  Similarity: {(source.similarity * 100).toFixed(1)}%
                                  {source.chunkText && (
                                    <span className="block truncate max-w-xs opacity-60">
                                      "{source.chunkText}"
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {message.type === 'user' && (
                    <Avatar className="w-7 h-7 md:w-8 md:h-8 shrink-0 mt-0.5 ring-2 ring-primary/10">
                      <AvatarFallback className="text-2xs bg-primary/10 text-primary font-display">U</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {/* Typing indicator - only show if no message is currently streaming */}
              {isTyping && !messages.some(m => m.isTyping) && (
                <div className="flex gap-2.5 md:gap-3 justify-start animate-fade-in">
                  <Avatar className="w-7 h-7 md:w-8 md:h-8 shrink-0 mt-0.5 ring-2 ring-primary/10">
                    <AvatarImage src={activeCreator.avatarUrl || undefined} alt={activeCreator.name} />
                    <AvatarFallback className="text-2xs bg-primary/10 text-primary font-display">{activeCreator.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="bg-chat-bubble-ai text-chat-bubble-ai-foreground rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Thinking</span>
                      <div className="flex items-center gap-1">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 150}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Quick suggestions when chat has messages */}
      {messages.length > 0 && hasIndexedContent && (
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
              placeholder={
                isProcessing 
                  ? `Indexing in progress (${activeCreator.ingestionProgress}%)...` 
                  : isFailed
                  ? "Indexing failed - please try again"
                  : isReady 
                  ? "Ask anything..." 
                  : "Waiting for content to be indexed..."
              }
              disabled={chatDisabled}
              rows={1}
              className="flex-1 min-h-[48px] max-h-32 resize-none bg-transparent px-4 py-3 pr-24 text-sm focus:outline-none placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <VoiceInput onTranscript={handleVoiceTranscript} disabled={chatDisabled} />
              <Button
                type="submit"
                size="icon"
                disabled={!inputValue.trim() || chatDisabled}
                className="h-11 w-11 md:h-9 md:w-9 rounded-xl"
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

      {/* Search Dialog */}
      <ChatSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        currentChannelId={activeCreator?.channelId}
        onResultClick={handleSearchResultClick}
      />
    </div>
  );
}
