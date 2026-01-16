import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Loader2,
  AlertCircle,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useVoiceSession } from "@/hooks/useVoiceSession";
import { useAuth } from "@/hooks/useAuth";

interface VoiceChatModalProps {
  channelId: string;
  creatorName: string;
  creatorAvatar?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function VoiceChatModal({
  channelId,
  creatorName,
  creatorAvatar,
  isOpen,
  onClose,
}: VoiceChatModalProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const {
    status,
    transcript,
    aiTranscript,
    error,
    durationSeconds,
    isActive,
    isConnecting,
    isListening,
    isSpeaking,
    conversationHistory,
    startSession,
    stopSession,
    clearTranscripts,
  } = useVoiceSession({
    channelId,
    creatorName,
    onTranscriptUpdate: () => {
      // Track transcript changes for history
    },
  });

  useEffect(() => {
    if (isOpen && status === "idle") {
      startSession();
    }
  }, [isOpen, status, startSession]);

  // Auto-scroll effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, aiTranscript, conversationHistory.length]);

  const handleClose = async () => {
    if (isActive) {
      await stopSession();
    }
    clearTranscripts();
    onClose();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusText = () => {
    if (isConnecting) return "Connecting...";
    if (error) return "Error";
    if (isSpeaking) return "You are speaking...";
    if (isListening) return "Listening...";
    return "Connected";
  };

  const getStatusColor = () => {
    if (error) return "text-destructive";
    if (isConnecting) return "text-muted-foreground";
    if (isSpeaking) return "text-primary";
    return "text-muted-foreground";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="p-4 pb-3 border-b bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                    isActive && !error ? "bg-primary" : "bg-muted",
                    isSpeaking && "animate-pulse",
                  )}
                >
                  {isConnecting ? (
                    <Loader2 className="w-6 h-6 text-primary-foreground animate-spin" />
                  ) : error ? (
                    <AlertCircle className="w-6 h-6 text-destructive" />
                  ) : isActive ? (
                    <Mic className="w-6 h-6 text-primary-foreground" />
                  ) : (
                    <MicOff className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                {isSpeaking && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                    <div className="absolute inset-[-4px] rounded-full border-2 border-primary/20 animate-pulse" />
                  </>
                )}
              </div>

              <div>
                <DialogTitle className="text-base font-semibold">
                  Voice Chat with {creatorName}
                </DialogTitle>
                <DialogDescription className={cn("text-sm", getStatusColor())}>
                  {getStatusText()}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isActive && (
                <Badge
                  variant="outline"
                  className="font-mono text-sm px-2 py-1"
                >
                  {formatDuration(durationSeconds)}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="px-4 py-3 bg-muted/30 border-b">
          <div className="flex items-center justify-center gap-1">
            <MicrophoneWaveform
              isActive={isActive && !error}
              isSpeaking={isSpeaking}
              isListening={isListening}
            />
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-4 flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={startSession}
              className="ml-auto text-destructive hover:text-destructive"
            >
              Retry
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3">
            {conversationHistory.map((msg, idx) => {
              const uniqueKey = `${msg.role}-${msg.timestamp}-${idx}`;
              return (
                <TranscriptBubble
                  key={uniqueKey}
                  role={msg.role === "user" ? "user" : "ai"}
                  text={msg.content}
                  isLive={false}
                  creatorName={creatorName}
                  userAvatar={user?.user_metadata?.avatar_url}
                  creatorAvatar={creatorAvatar || undefined}
                />
              );
            })}

            {transcript && (
              <TranscriptBubble
                role="user"
                text={transcript}
                isLive={status === "speaking"}
                creatorName={creatorName}
                userAvatar={user?.user_metadata?.avatar_url}
                creatorAvatar={creatorAvatar || undefined}
              />
            )}

            {aiTranscript && (
              <TranscriptBubble
                role="ai"
                text={aiTranscript}
                isLive={status === "connected"}
                creatorName={creatorName}
                userAvatar={user?.user_metadata?.avatar_url}
                creatorAvatar={creatorAvatar || undefined}
              />
            )}

            {conversationHistory.length === 0 && !transcript && !aiTranscript && isActive && !error && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Volume2 className="w-8 h-8 text-muted-foreground mb-3 animate-pulse" />
                <p className="text-sm text-muted-foreground">
                  Start speaking to chat with {creatorName}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Your conversation will appear here
                </p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="p-4 border-t bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              AI Mentor Voice • Answers from indexed content only
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleClose}
              className="gap-2"
            >
              <PhoneOff className="w-4 h-4" />
              End Call
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TranscriptBubble({
  role,
  text,
  isLive = false,
  creatorName,
  userAvatar,
  creatorAvatar,
}: {
  role: "user" | "ai";
  text: string;
  isLive?: boolean;
  creatorName: string;
  userAvatar?: string;
  creatorAvatar?: string;
}) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 items-start",
        isUser && "ml-auto flex-row-reverse",
      )}
    >
      {/* Avatar */}
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage
          src={isUser ? userAvatar : creatorAvatar}
          alt={isUser ? "You" : creatorName}
        />
        <AvatarFallback className="text-xs">
          {isUser ? "U" : creatorName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Message bubble */}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md",
          isLive && "animate-pulse",
        )}
      >
        <div className={cn(
          "flex items-center gap-2 mb-1",
          isUser && "justify-end"
        )}>
          <span
            className={cn(
              "text-[10px] font-medium",
              isUser ? "text-primary-foreground/80" : "text-muted-foreground",
            )}
          >
            {isUser ? "You" : creatorName}
          </span>
          {isLive && (
            <span
              className={cn(
                "text-[10px]",
                isUser
                  ? "text-primary-foreground/60"
                  : "text-muted-foreground/60",
              )}
            >
              {isUser ? "speaking..." : "responding..."}
            </span>
          )}
        </div>
        <p
          className={cn(
            "text-sm leading-relaxed",
            isUser ? "text-primary-foreground text-right" : "text-foreground",
          )}
        >
          {text}
        </p>
      </div>
    </div>
  );
}

function MicrophoneWaveform({
  isActive,
  isSpeaking,
  isListening,
}: {
  isActive: boolean;
  isSpeaking: boolean;
  isListening: boolean;
}) {
  const bars = 12;
  const WAVEFORM_ANIMATION_DELAY_MS = 50;

  return (
    <div className="flex items-center justify-center gap-[3px] h-10 px-4">
      {Array.from({ length: bars }).map((_, i) => {
        const delay = i * WAVEFORM_ANIMATION_DELAY_MS;

        return (
          <div
            key={i}
            className={cn(
              "w-1 rounded-full transition-all duration-150",
              isActive
                ? isSpeaking
                  ? "bg-primary animate-voice-wave-active"
                  : isListening
                    ? "bg-primary/60 animate-voice-wave-idle"
                    : "bg-muted-foreground/40 h-1"
                : "bg-muted-foreground/30 h-1",
            )}
            style={{
              animationDelay: isActive ? `${delay}ms` : undefined,
              height:
                isActive && (isSpeaking || isListening) ? undefined : "4px",
            }}
          />
        );
      })}
    </div>
  );
}

export function VoiceChatTrigger({
  channelId,
  creatorName,
  creatorAvatar,
  className,
}: {
  channelId: string;
  creatorName: string;
  creatorAvatar?: string | null;
  className?: string;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsModalOpen(true)}
              className={cn(
                "h-8 w-8 rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-primary/10",
                className,
              )}
            >
              <Mic className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Talk with AI mentor</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <VoiceChatModal
        channelId={channelId}
        creatorName={creatorName}
        creatorAvatar={creatorAvatar}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
