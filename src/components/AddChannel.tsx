import { useState } from 'react';
import { useIngestChannel } from '@/hooks/useIngestChannel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus } from 'lucide-react';
import type { Creator } from '@/types/chat';

interface AddChannelProps {
  onChannelAdded: (creator: Creator) => void;
}

export function AddChannel({ onChannelAdded }: AddChannelProps) {
  const [channelUrl, setChannelUrl] = useState('');
  const { ingestChannel, isLoading, error } = useIngestChannel();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelUrl.trim()) return;

    const creator = await ingestChannel(channelUrl.trim());
    if (creator) {
      onChannelAdded(creator);
      setChannelUrl('');
    }
  };

  return (
    <div className="p-4 border-b">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="url"
          placeholder="Enter YouTube channel URL (e.g., https://youtube.com/@channelname)"
          value={channelUrl}
          onChange={(e) => setChannelUrl(e.target.value)}
          disabled={isLoading}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading || !channelUrl.trim()}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add
        </Button>
      </form>
      {error && (
        <p className="text-sm text-red-500 mt-2">{error}</p>
      )}
    </div>
  );
}
