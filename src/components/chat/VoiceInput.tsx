import { useState } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

const mockTranscripts = [
  "What topics does this creator talk about most?",
  "Can you summarize their latest video?",
  "What are their most popular tutorials?",
  "Tell me about their productivity tips",
];

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = async () => {
    if (isListening) {
      setIsListening(false);
      setIsProcessing(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      const randomTranscript = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
      onTranscript(randomTranscript);
      setIsProcessing(false);
    } else {
      setIsListening(true);
    }
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant={isListening ? 'default' : 'ghost'}
        size="icon"
        onClick={handleClick}
        disabled={disabled || isProcessing}
        className={cn(
          'h-9 w-9 rounded-xl transition-all duration-200',
          isListening && 'bg-destructive hover:bg-destructive/90 animate-pulse-ring'
        )}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isListening ? (
          <Square className="w-3 h-3" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </Button>

      {/* Listening indicator */}
      {isListening && (
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border shadow-medium animate-slide-up whitespace-nowrap">
          <VoiceWaveform />
          <span className="text-xs font-medium text-foreground">Listening...</span>
        </div>
      )}
    </div>
  );
}

function VoiceWaveform() {
  return (
    <div className="flex items-center gap-0.5 h-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-0.5 h-4 bg-destructive rounded-full origin-center animate-voice-wave"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}
