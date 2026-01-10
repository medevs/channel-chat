import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { Creator, ContentTypeOptions, ImportSettings, VideoImportMode } from '@/lib/types';
import { useIngestChannel } from '@/hooks/useIngestChannel';
import { Youtube, Loader2, Sparkles, AlertCircle, Video, Film, Radio, Check, ArrowDown, ArrowUp, Infinity as InfinityIcon } from 'lucide-react';
import { toast } from 'sonner';

interface AddCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCreator: (creator: Creator) => void;
}

const DEFAULT_VIDEO_LIMIT = 5;
const MIN_VIDEO_LIMIT = 1;
const MAX_VIDEO_LIMIT = 100;

export function AddCreatorModal({ isOpen, onClose, onAddCreator }: AddCreatorModalProps) {
  const [url, setUrl] = useState('');
  const [contentTypes, setContentTypes] = useState<ContentTypeOptions>({
    videos: true,
    shorts: false,
    lives: false,
  });
  const [importSettings, setImportSettings] = useState<ImportSettings>({
    mode: 'latest',
    limit: DEFAULT_VIDEO_LIMIT,
  });
  
  const { ingestChannel, isLoading, error, clearError } = useIngestChannel();

  // Calculate effective max based on plan limits
  const effectiveMaxVideos = importSettings.limit ?? MAX_VIDEO_LIMIT;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    // Prepare import settings
    const finalImportSettings: ImportSettings = {
      mode: importSettings.mode,
      limit: importSettings.mode === 'all' ? null : (importSettings.limit ?? DEFAULT_VIDEO_LIMIT),
    };

    const creator = await ingestChannel(url, contentTypes, finalImportSettings);

    if (creator) {
      onAddCreator(creator);
      setUrl('');
      setContentTypes({ videos: true, shorts: false, lives: false });
      setImportSettings({ mode: 'latest', limit: DEFAULT_VIDEO_LIMIT });
      onClose();
      toast.success(`Added ${creator.name}`, {
        description: `${creator.indexedVideos} videos indexed. Subscriber count: ${formatSubscribers(creator.subscribers)}`,
      });
    } else if (error) {
      if (error.includes('already') || error.includes('exists')) {
        toast.info('Already added', {
          description: 'This creator is already in your list. Select them from the sidebar to chat.',
        });
        handleClose();
      } else {
        toast.error('Failed to add creator', {
          description: error,
        });
      }
    }
  };

  const handleClose = () => {
    clearError();
    setUrl('');
    setContentTypes({ videos: true, shorts: false, lives: false });
    setImportSettings({ mode: 'latest', limit: DEFAULT_VIDEO_LIMIT });
    onClose();
  };

  const formatSubscribers = (count: string | null): string => {
    if (!count) return 'Unknown';
    const num = parseInt(count, 10);
    if (isNaN(num)) return count;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return count;
  };

  const toggleContentType = useCallback((type: keyof ContentTypeOptions) => {
    setContentTypes(prev => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const setImportMode = useCallback((mode: VideoImportMode) => {
    setImportSettings(prev => ({ ...prev, mode }));
  }, []);

  const setVideoLimit = useCallback((value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      setImportSettings(prev => ({ ...prev, limit: DEFAULT_VIDEO_LIMIT }));
      return;
    }
    // Clamp to valid range
    const clamped = Math.max(MIN_VIDEO_LIMIT, Math.min(num, MAX_VIDEO_LIMIT));
    setImportSettings(prev => ({ ...prev, limit: clamped }));
  }, []);

  // Ensure at least one content type is selected
  const isValidSelection = contentTypes.videos || contentTypes.shorts || contentTypes.lives;

  // Preview message for what will be imported
  const getImportPreview = (): string => {
    if (importSettings.mode === 'all') {
      return `Up to ${MAX_VIDEO_LIMIT} videos`;
    }
    const label = importSettings.mode === 'latest' ? 'most recent' : 'oldest';
    return `${effectiveMaxVideos} ${label} videos`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-semibold">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Youtube className="w-4 h-4 text-destructive" />
            </div>
            Add a Creator
          </DialogTitle>
          <DialogDescription className="text-sm">
            Enter the YouTube channel URL to start indexing their content.
          </DialogDescription>
        </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="channel-url" className="text-xs font-medium">Channel URL</Label>
              <Input
                id="channel-url"
                placeholder="https://youtube.com/@channelname"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                className="h-11 rounded-xl"
              />
            </div>

            {/* Content Type Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Content to Index</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => toggleContentType('videos')}
                  disabled={isLoading}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    contentTypes.videos 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Video className="w-5 h-5" />
                  <span className="text-xs font-medium">Videos</span>
                  <div className={`h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center ${
                    contentTypes.videos 
                      ? 'bg-primary border-primary text-primary-foreground' 
                      : 'border-primary'
                  }`}>
                    {contentTypes.videos && <Check className="h-3 w-3" />}
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => toggleContentType('shorts')}
                  disabled={isLoading}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    contentTypes.shorts 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Film className="w-5 h-5" />
                  <span className="text-xs font-medium">Shorts</span>
                  <div className={`h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center ${
                    contentTypes.shorts 
                      ? 'bg-primary border-primary text-primary-foreground' 
                      : 'border-primary'
                  }`}>
                    {contentTypes.shorts && <Check className="h-3 w-3" />}
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => toggleContentType('lives')}
                  disabled={isLoading}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    contentTypes.lives 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Radio className="w-5 h-5" />
                  <span className="text-xs font-medium">Lives</span>
                  <div className={`h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center ${
                    contentTypes.lives 
                      ? 'bg-primary border-primary text-primary-foreground' 
                      : 'border-primary'
                  }`}>
                    {contentTypes.lives && <Check className="h-3 w-3" />}
                  </div>
                </button>
              </div>
              {!isValidSelection && (
                <p className="text-xs text-destructive">Select at least one content type</p>
              )}
            </div>

            {/* Import Settings */}
            <div className="space-y-3">
              <Label className="text-xs font-medium">Import Settings</Label>
              
              {/* Import Mode Selection */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setImportMode('latest')}
                  disabled={isLoading}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
                    importSettings.mode === 'latest' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <ArrowDown className="w-4 h-4" />
                  <span className="text-xs font-medium">Latest</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setImportMode('oldest')}
                  disabled={isLoading}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
                    importSettings.mode === 'oldest' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <ArrowUp className="w-4 h-4" />
                  <span className="text-xs font-medium">Oldest</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setImportMode('all')}
                  disabled={isLoading}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
                    importSettings.mode === 'all' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <InfinityIcon className="w-4 h-4" />
                  <span className="text-xs font-medium">All</span>
                </button>
              </div>

              {/* Video Limit Input (only shown when not "all") */}
              {importSettings.mode !== 'all' && (
                <div className="flex items-center gap-3">
                  <Label htmlFor="video-limit" className="text-xs text-muted-foreground whitespace-nowrap">
                    Number of videos:
                  </Label>
                  <Input
                    id="video-limit"
                    type="number"
                    min={MIN_VIDEO_LIMIT}
                    max={MAX_VIDEO_LIMIT}
                    value={importSettings.limit ?? DEFAULT_VIDEO_LIMIT}
                    onChange={(e) => setVideoLimit(e.target.value)}
                    disabled={isLoading}
                    className="h-9 w-20 rounded-lg text-center"
                  />
                  <span className="text-xs text-muted-foreground">
                    (max {MAX_VIDEO_LIMIT})
                  </span>
                </div>
              )}

              {/* Import Preview */}
              <div className="p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                Will import: <span className="font-medium text-foreground">{getImportPreview()}</span>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading} className="h-10 rounded-xl">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!url.trim() || isLoading || !isValidSelection} 
                className="h-10 rounded-xl gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Indexing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Add Creator
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }
