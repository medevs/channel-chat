// Channel URL parsing and YouTube API resolution logic
import { ChannelInfo, Dependencies, Result } from "../types/common.ts";

// ============================================
// CHANNEL URL PARSING
// ============================================
export interface ParsedChannelUrl {
  type: 'channel' | 'custom' | 'user' | 'handle';
  id: string;
}

export function parseChannelUrl(url: string): ParsedChannelUrl | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    if (pathname.startsWith('/@')) {
      return { type: 'handle', id: pathname.substring(2).replace(/\/$/, '') };
    }
    if (pathname.startsWith('/channel/')) {
      return { type: 'channel', id: pathname.split('/')[2] };
    }
    if (pathname.startsWith('/c/')) {
      return { type: 'custom', id: pathname.split('/')[2] };
    }
    if (pathname.startsWith('/user/')) {
      return { type: 'user', id: pathname.split('/')[2] };
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================
// YOUTUBE API RESOLUTION
// ============================================
export interface ChannelResolverConfig {
  parsedUrl: ParsedChannelUrl;
  apiKey: string;
}

export async function resolveChannelId(
  config: ChannelResolverConfig,
  dependencies: Dependencies
): Promise<Result<ChannelInfo>> {
  const { parsedUrl, apiKey } = config;
  const { logger } = dependencies;

  try {
    let endpoint = '';
    
    if (parsedUrl.type === 'channel') {
      endpoint = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&id=${parsedUrl.id}&key=${apiKey}`;
    } else if (parsedUrl.type === 'handle') {
      endpoint = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&forHandle=${parsedUrl.id}&key=${apiKey}`;
    } else if (parsedUrl.type === 'custom' || parsedUrl.type === 'user') {
      endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${parsedUrl.id}&key=${apiKey}`;
      const searchResponse = await fetch(endpoint);
      const searchData = await searchResponse.json();
      
      if (searchData.items && searchData.items.length > 0) {
        const channelId = searchData.items[0].id.channelId;
        endpoint = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&id=${channelId}&key=${apiKey}`;
      } else {
        return { success: false, error: 'Channel not found' };
      }
    }

    const response = await fetch(endpoint);
    const data = await response.json();

    if (data.error) {
      logger.error('YouTube API error:', { 
        error: data.error, 
        channelType: parsedUrl.type, 
        channelId: parsedUrl.id 
      });
      if (data.error.errors?.[0]?.reason === 'quotaExceeded') {
        throw new Error('QUOTA_EXCEEDED');
      }
      throw new Error(data.error.message);
    }

    if (!data.items || data.items.length === 0) {
      return { success: false, error: 'Channel not found' };
    }

    const channel = data.items[0];
    const channelInfo: ChannelInfo = {
      channel_id: channel.id,
      channel_name: channel.snippet.title,
      avatar_url: channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.default?.url || '',
      subscriber_count: channel.statistics?.subscriberCount || '0',
      uploads_playlist_id: channel.contentDetails?.relatedPlaylists?.uploads || '',
    };

    return { success: true, data: channelInfo };
  } catch (error) {
    logger.error('Channel resolution error:', { 
      error: String(error), 
      channelType: parsedUrl.type, 
      channelId: parsedUrl.id 
    });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}