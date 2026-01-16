import { UserPlus, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-creator' | 'no-messages';
}

export function EmptyState({ type }: EmptyStateProps) {
  if (type === 'no-creator') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background px-6 pt-16 md:pt-0">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 rounded-3xl bg-muted flex items-center justify-center animate-float">
            <UserPlus className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground" />
          </div>
          <h3 className="font-display font-semibold text-xl md:text-2xl text-foreground mb-3">
            Select a creator
          </h3>
          <p className="text-sm md:text-base text-muted-foreground text-balance">
            Choose a creator from the sidebar or add a new one to start chatting with their content.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-background px-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 rounded-3xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-primary" />
        </div>
        <h3 className="font-display font-semibold text-xl md:text-2xl text-foreground mb-3">
          Start a conversation
        </h3>
        <p className="text-sm md:text-base text-muted-foreground text-balance">
          Ask anything about the creator's videos. AI will search through their content to find relevant answers.
        </p>
      </div>
    </div>
  );
}
