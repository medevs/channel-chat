import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { Creator, ImportSettings, VideoImportMode } from '@/lib/types';
import { useIngestChannel, type LimitExceededError } from '@/hooks/useIngestChannel';
import { Youtube, Loader2, Sparkles, AlertCircle, Lock, ArrowDown, ArrowUp, Infinity } from 'lucide-react';

interface AddCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCreator: (creator: Creator) => void;
}

const DEFAULT_VIDEO_LIMIT = 5;
const MIN_VIDEO_LIMIT = 1;
const MAX_VIDEO_LIMIT = 500;

export function AddCreatorModal({ isOpen, onClose, onAddCreator }: AddCreatorModalProps) {
  const [url, setUrl] = useState('');
  const [importSettings, setImportSettings] = useState<ImportSettings>({
    mode: 'latest',
    limit: DEFAULT_VIDEO_LIMIT,
  });
  const [upgradeDialog, setUpgradeDialog] = useState<{
    isOpen: boolean;
    limitInfo: LimitExceededError | null;
  }>({ isOpen: false, limitInfo: null });
  
  const { ingestChannel, isLoading, error, clearError } = useIngestChannel();

  // Mock usage limits for now (you can implement useUsageLimits later)
  const canAddCreator = true;
  const remainingCreators = 10;
  const limits = { maxCreators: 10, maxVideosPerCreator: MAX_VIDEO_LIMIT };

  // Calculate effective max based on plan limits
  const effectiveMaxVideos = Math.min(
    importSettings.limit ?? limits.maxVideosPerCreator,
    limits.maxVideosPerCreator
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    // Prepare import settings - clamp limit to plan max
    const finalImportSettings: ImportSettings = {
      mode: importSettings.mode,
      limit: importSettings.mode === 'all' ? null : Math.min(importSettings.limit ?? DEFAULT_VIDEO_LIMIT, limits.maxVideosPerCreator),
    };

    const result = await ingestChannel(url, undefined, finalImportSettings);

    if (result) {
      // Handle Creator response (your current format)
      onAddCreator(result);
      setUrl('');
      setImportSettings({ mode: 'latest', limit: DEFAULT_VIDEO_LIMIT });
      
      // Close modal immediately since creator was successfully added
      onClose();
    }
  };

  const handleClose = () => {
    clearError();
    setUrl('');
    setImportSettings({ mode: 'latest', limit: DEFAULT_VIDEO_LIMIT });
    onClose();
  };

  const handleUpgradeDialogClose = () => {
    setUpgradeDialog({ isOpen: false, limitInfo: null });
  };

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

  // Preview message for what will be imported
  const getImportPreview = (): string => {
    if (importSettings.mode === 'all') {
      return `Up to ${limits.maxVideosPerCreator} videos (plan limit)`;
    }
    const label = importSettings.mode === 'latest' ? 'most recent' : 'oldest';
    return `${effectiveMaxVideos} ${label} videos`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="w-[95vw] max-w-md mx-auto rounded-2xl p-4 sm:p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2 font-display text-lg">
              <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Youtube className="w-3.5 h-3.5 text-destructive" />
              </div>
              Add a Creator
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Enter the YouTube channel URL to start indexing their content.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 mt-3">
            {!canAddCreator && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs sm:text-sm">
                <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Creator limit reached</p>
                  <p className="text-xs opacity-80">Free plan allows {limits.maxCreators} creator. Upgrade for more.</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="channel-url" className="text-xs font-medium">Channel URL</Label>
              <Input
                id="channel-url"
                placeholder="https://youtube.com/@channelname"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading || !canAddCreator}
                className="h-9 sm:h-10 rounded-xl text-sm"
              />
              <p className="text-2xs text-muted-foreground">
                {canAddCreator 
                  ? `You can add ${remainingCreators} more creator(s)`
                  : 'Upgrade to add more creators'}
              </p>
            </div>

            {/* Import Settings */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Import Settings</Label>
              
              {/* Import Mode Selection */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setImportMode('latest')}
                  disabled={isLoading || !canAddCreator}
                  className={`flex flex-col items-center gap-1 p-2 sm:p-2.5 rounded-xl border-2 transition-all ${
                    importSettings.mode === 'latest' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                  } ${(isLoading || !canAddCreator) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span className="text-2xs sm:text-xs font-medium">Latest</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setImportMode('oldest')}
                  disabled={isLoading || !canAddCreator}
                  className={`flex flex-col items-center gap-1 p-2 sm:p-2.5 rounded-xl border-2 transition-all ${
                    importSettings.mode === 'oldest' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                  } ${(isLoading || !canAddCreator) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span className="text-2xs sm:text-xs font-medium">Oldest</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setImportMode('all')}
                  disabled={isLoading || !canAddCreator}
                  className={`flex flex-col items-center gap-1 p-2 sm:p-2.5 rounded-xl border-2 transition-all ${
                    importSettings.mode === 'all' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                  } ${(isLoading || !canAddCreator) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Infinity className="w-3.5 h-3.5" />
                  <span className="text-2xs sm:text-xs font-medium">All</span>
                </button>
              </div>

              {/* Video Limit Input (only shown when not "all") */}
              {importSettings.mode !== 'all' && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="video-limit" className="text-2xs sm:text-xs text-muted-foreground whitespace-nowrap">
                    Number of videos:
                  </Label>
                  <Input
                    id="video-limit"
                    type="number"
                    min={MIN_VIDEO_LIMIT}
                    max={limits.maxVideosPerCreator}
                    value={importSettings.limit ?? DEFAULT_VIDEO_LIMIT}
                    onChange={(e) => setVideoLimit(e.target.value)}
                    disabled={isLoading || !canAddCreator}
                    className="h-8 w-16 rounded-lg text-center text-sm"
                  />
                  <span className="text-2xs sm:text-xs text-muted-foreground">
                    (max {limits.maxVideosPerCreator})
                  </span>
                </div>
              )}

              {/* Import Preview */}
              <div className="p-2 rounded-lg bg-muted/50 text-2xs sm:text-xs text-muted-foreground">
                Will import: <span className="font-medium text-foreground">{getImportPreview()}</span>
              </div>
            </div>

            {error && !upgradeDialog.isOpen && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs sm:text-sm">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading} className="h-9 rounded-xl text-sm">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!url.trim() || isLoading || !canAddCreator} 
                className="h-9 rounded-xl gap-2 text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Indexing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Add Creator
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upgrade Plan Dialog - Placeholder for future implementation */}
      {upgradeDialog.limitInfo && (
        <Dialog open={upgradeDialog.isOpen} onOpenChange={(open) => !open && handleUpgradeDialogClose()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upgrade Required</DialogTitle>
              <DialogDescription>
                {upgradeDialog.limitInfo.message}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleUpgradeDialogClose}>
                Cancel
              </Button>
              <Button onClick={handleUpgradeDialogClose}>
                Upgrade Plan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
