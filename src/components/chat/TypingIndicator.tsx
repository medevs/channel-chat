import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500", className)}>
      {/* Avatar */}
      <Avatar className="w-8 h-8 mt-1">
        <AvatarImage src="/creator-avatar.jpg" />
        <AvatarFallback className="bg-slate-700 text-slate-300 text-sm">
          AI
        </AvatarFallback>
      </Avatar>

      {/* Typing Bubble */}
      <div className="flex-1 max-w-[80%]">
        <div className="relative px-4 py-3 rounded-2xl rounded-bl-md bg-slate-800 text-slate-100">
          {/* Tail */}
          <div className="absolute w-3 h-3 bg-slate-800 transform rotate-45 -bottom-1 left-2" />
          
          {/* Typing Animation */}
          <div className="relative z-10 flex items-center gap-1">
            <div className="flex gap-1">
              <div 
                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: '0ms', animationDuration: '1.4s' }}
              />
              <div 
                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: '200ms', animationDuration: '1.4s' }}
              />
              <div 
                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: '400ms', animationDuration: '1.4s' }}
              />
            </div>
            <span className="text-xs text-slate-500 ml-2">AI is thinking...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
