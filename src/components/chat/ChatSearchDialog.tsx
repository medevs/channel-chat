import { useState, useCallback, useEffect } from 'react';
import { Search, X, MessageSquare, User, Bot, Clock, Globe, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchResult {
  id: string;
  channelId: string;
  role: 'user' | 'assistant';
  matchedText: string;
  createdAt: Date;
  creatorName?: string;
  creatorAvatar?: string;
}

interface ChatSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentChannelId?: string | null;
  onResultClick: (result: SearchResult) => void;
}

export function ChatSearchDialog({
  open,
  onOpenChange,
  currentChannelId,
  onResultClick,
}: ChatSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setHasSearched(false);
    }
  }, [open]);

  // Mock search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock results
    const mockResults: SearchResult[] = [
      {
        id: '1',
        channelId: currentChannelId || 'channel1',
        role: 'user',
        matchedText: `How do I ${searchQuery}?`,
        createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        creatorName: 'Test Creator',
      },
      {
        id: '2',
        channelId: currentChannelId || 'channel1',
        role: 'assistant',
        matchedText: `To ${searchQuery}, you need to follow these steps...`,
        createdAt: new Date(Date.now() - 1000 * 60 * 25), // 25 minutes ago
        creatorName: 'Test Creator',
      }
    ];

    setResults(mockResults);
    setIsSearching(false);
  }, [currentChannelId]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleResultClick = useCallback((result: SearchResult) => {
    onResultClick(result);
    onOpenChange(false);
  }, [onResultClick, onOpenChange]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="sr-only">Search Chat History</DialogTitle>
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-20 h-11"
              autoFocus
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setQuery('')}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
              <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
          </div>
        </DialogHeader>

        {/* Results */}
        <div className="border-t mt-4">
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Searching...</span>
            </div>
          ) : !hasSearched ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                <Search className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Search your chat history
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Find past conversations and AI responses
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-foreground font-medium">No results found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try different keywords
              </p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <div className="p-2">
                <p className="text-xs text-muted-foreground px-2 py-1">
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </p>
                <div className="space-y-1">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <div className="flex items-start gap-3">
                        {/* Role Icon */}
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-muted">
                          {result.role === 'user' ? (
                            <User className="w-4 h-4" />
                          ) : (
                            <Bot className="w-4 h-4" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-foreground">
                              {result.role === 'user' ? 'You' : result.creatorName}
                            </span>
                            <span className="text-2xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {result.createdAt.toLocaleTimeString()}
                            </span>
                          </div>

                          {/* Content Preview */}
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {result.matchedText}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
