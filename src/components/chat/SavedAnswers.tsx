import { useState, useEffect } from 'react';
import { Bookmark, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSavedAnswers } from '@/hooks/useSavedAnswers';
import { supabase } from '@/lib/supabase';
import { SavedAnswerCard } from './SavedAnswerCard';
import type { ActiveVideo } from '@/types/chat';

interface SavedAnswersProps {
  onBack: () => void;
  onTimestampClick?: (video: ActiveVideo) => void;
}

interface CreatorInfo {
  channel_name: string;
  avatar_url: string | null;
  channel_id: string;
}

export function SavedAnswers({ onBack, onTimestampClick }: SavedAnswersProps) {
  const { savedAnswers, isLoading, unsaveAnswer } = useSavedAnswers();
  const [creatorMap, setCreatorMap] = useState<Record<string, CreatorInfo>>({});

  // Fetch creator info for all saved answers
  useEffect(() => {
    const fetchCreators = async () => {
      const channelIds = [...new Set(savedAnswers.map(a => a.channel_id))];
      if (channelIds.length === 0) return;

      const { data } = await supabase
        .from('channels')
        .select('channel_id, channel_name, avatar_url')
        .in('channel_id', channelIds);

      if (data) {
        const map: Record<string, CreatorInfo> = {};
        data.forEach(c => {
          map[c.channel_id] = c;
        });
        setCreatorMap(map);
      }
    };

    fetchCreators();
  }, [savedAnswers]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 md:px-6 md:py-4 border-b border-border shrink-0 bg-card/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-9 w-9 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-base text-foreground">
            Saved Answers
          </h2>
        </div>
        <span className="text-sm text-muted-foreground">
          {savedAnswers.length} saved
        </span>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-2xl mx-auto px-4 py-4 md:px-6 md:py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : savedAnswers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 mb-4 rounded-2xl bg-muted flex items-center justify-center">
                <Bookmark className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                No saved answers yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Click the bookmark icon on any AI response to save it for later.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {savedAnswers.map((answer) => {
                const creator = creatorMap[answer.channel_id];
                return (
                  <SavedAnswerCard
                    key={answer.id}
                    answer={answer}
                    creatorName={creator?.channel_name}
                    creatorAvatar={creator?.avatar_url || undefined}
                    onDelete={unsaveAnswer}
                    onSourceClick={onTimestampClick}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
