import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Creator, SuggestedPrompt } from "@/types/chat";

interface EmptyStateProps {
  creator: Creator;
  onPromptClick: (prompt: string) => void;
  className?: string;
}

const suggestedPrompts: SuggestedPrompt[] = [
  { id: '1', text: 'What topics does this creator cover?', category: 'general' },
  { id: '2', text: 'What are the key takeaways from recent videos?', category: 'general' },
  { id: '3', text: 'What advice would you give to beginners?', category: 'specific' },
];

export function EmptyState({ creator, onPromptClick, className }: EmptyStateProps) {
  return (
    <div className={cn("text-center py-12", className)}>
      {/* Animated Icon */}
      <div className="relative mb-8">
        <div className="w-16 h-16 mx-auto bg-teal-500/20 rounded-full flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-teal-400 animate-pulse" />
        </div>
        {/* Floating sparkles animation */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-2 left-8 w-1 h-1 bg-teal-400 rounded-full animate-ping" style={{ animationDelay: '0s' }} />
          <div className="absolute top-8 right-6 w-1 h-1 bg-teal-400 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-4 left-12 w-1 h-1 bg-teal-400 rounded-full animate-ping" style={{ animationDelay: '2s' }} />
        </div>
      </div>

      {/* Heading */}
      <h3 className="text-2xl font-bold text-white mb-3">
        Start a conversation
      </h3>
      
      {/* Description */}
      <p className="text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
        Ask {creator.name} anything based on their {creator.videosIndexed} indexed videos. 
        Get insights, advice, and knowledge directly from their content.
      </p>

      {/* Suggested Prompts */}
      <div className="space-y-3 max-w-lg mx-auto">
        <p className="text-sm font-medium text-slate-300 mb-4">
          Try asking:
        </p>
        {suggestedPrompts.map((prompt) => (
          <Button
            key={prompt.id}
            variant="outline"
            onClick={() => onPromptClick(prompt.text)}
            className="w-full text-left justify-start h-auto p-4 border-slate-600 text-slate-300 hover:text-white hover:border-teal-500 hover:bg-teal-500/5 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-teal-400 rounded-full flex-shrink-0" />
              <span className="text-sm">{prompt.text}</span>
            </div>
          </Button>
        ))}
      </div>

      {/* Footer hint */}
      <p className="text-xs text-slate-500 mt-8">
        All responses are based on {creator.name}'s actual video content
      </p>
    </div>
  );
}
