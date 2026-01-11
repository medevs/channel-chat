// Channel database operations and user linking
import { Dependencies, Result } from "../types/common.ts";

// ============================================
// USER CHANNEL LINKING
// ============================================
export async function checkUserHasChannel(
  userId: string,
  channelUuid: string,
  dependencies: Dependencies
): Promise<Result<boolean>> {
  const { supabase, logger } = dependencies;

  try {
    const { data } = await supabase
      .from('user_creators')
      .select('id')
      .eq('user_id', userId)
      .eq('channel_id', channelUuid)
      .maybeSingle();
    
    return { success: true, data: !!data };
  } catch (error) {
    logger.error('Error checking user channel link:', { error: String(error), userId, channelUuid });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export interface LinkResult {
  success: boolean;
  error?: string;
}

export async function linkUserToChannel(
  userId: string,
  channelUuid: string,
  dependencies: Dependencies
): Promise<Result<LinkResult>> {
  const { supabase, logger } = dependencies;

  try {
    const { error } = await supabase
      .from('user_creators')
      .insert({
        user_id: userId,
        channel_id: channelUuid,
      });
    
    if (error) {
      if (error.code === '23505') { // Unique violation
        return { success: true, data: { success: false, error: 'already_linked' } };
      }
      return { success: true, data: { success: false, error: error.message } };
    }
    
    return { success: true, data: { success: true } };
  } catch (error) {
    logger.error('Error linking user to channel:', { error: String(error), userId, channelUuid });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// USAGE COUNT UPDATES
// ============================================
export interface UsageUpdateConfig {
  userId: string;
  videosCount: number;
  isNewCreator: boolean;
}

export async function incrementUsageCounts(
  config: UsageUpdateConfig,
  dependencies: Dependencies
): Promise<Result<void>> {
  const { userId, videosCount, isNewCreator } = config;
  const { supabase, logger } = dependencies;

  try {
    if (isNewCreator) {
      const { error: creatorError } = await supabase.rpc('increment_creator_count', {
        p_user_id: userId,
      });
      if (creatorError) {
        logger.error('Error incrementing creator count:', { error: creatorError });
      }
    }

    if (videosCount > 0) {
      const { error: videosError } = await supabase.rpc('increment_videos_indexed', {
        p_user_id: userId,
        p_count: videosCount,
      });
      if (videosError) {
        logger.error('Error incrementing videos count:', { error: videosError });
      }
    }

    return { success: true, data: undefined };
  } catch (error) {
    logger.error('Error updating usage counts:', { error: String(error), userId });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// MESSAGE COUNT INCREMENT
// ============================================
export async function incrementMessageCount(
  userId: string,
  dependencies: Dependencies
): Promise<Result<void>> {
  const { supabase, logger } = dependencies;

  try {
    const { error } = await supabase.rpc('increment_message_count', {
      p_user_id: userId,
    });

    if (error) {
      logger.error('Error incrementing message count:', { error });
      return { success: false, error: error.message };
    }

    return { success: true, data: undefined };
  } catch (error) {
    logger.error('Error incrementing message count:', { error: String(error), userId });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}