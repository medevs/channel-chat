import { useState } from 'react';
import { Mic, Trash2, Clock, MessageSquare, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useVoiceConversations } from '@/hooks/useVoiceConversations';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface VoiceConversationsProps {
  onBack?: () => void;
}

export function VoiceConversations({ onBack }: VoiceConversationsProps = {}) {
  const { conversations, loading, error, deleteConversation } = useVoiceConversations();
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with back button */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <Mic className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-display font-semibold">Voice Conversations</h1>
        <Badge variant="secondary">{conversations.length}</Badge>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {conversations.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <Mic className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No voice conversations yet</p>
              <p className="text-sm mt-1">Start a voice chat with a creator to see it here</p>
            </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map(conv => (
            <Card key={conv.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-display mb-1">
                      {conv.creator_name}
                    </CardTitle>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(conv.duration_seconds)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {conv.transcript.length} messages
                      </span>
                      <span>{formatDate(conv.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setExpandedId(expandedId === conv.id ? null : conv.id)}
                      className="h-8 w-8"
                    >
                      {expandedId === conv.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteConversation(conv.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedId === conv.id && (
                <CardContent className="pt-0">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {conv.transcript.map((msg, idx) => (
                      <div
                        key={`${msg.timestamp}-${idx}`}
                        className={cn(
                          'flex gap-2 items-start',
                          msg.role === 'user' ? 'justify-end flex-row-reverse' : 'justify-start'
                        )}
                      >
                        <Avatar className="w-7 h-7 flex-shrink-0">
                          <AvatarImage 
                            src={msg.role === 'user' 
                              ? user?.user_metadata?.avatar_url 
                              : conv.channels?.avatar_url || undefined
                            } 
                            alt={msg.role === 'user' ? 'You' : conv.creator_name}
                          />
                          <AvatarFallback className="text-xs">
                            {msg.role === 'user' ? 'U' : conv.creator_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={cn(
                            'p-3 rounded-lg text-sm max-w-[85%]',
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-muted rounded-bl-md'
                          )}
                        >
                          <div className={cn(
                            'font-medium text-xs mb-1',
                            msg.role === 'user' ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          )}>
                            {msg.role === 'user' ? 'You' : conv.creator_name}
                          </div>
                          <div>{msg.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
