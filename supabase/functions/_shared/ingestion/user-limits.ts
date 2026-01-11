// User plan limits, creator limits, and usage tracking
import { UserUsage, CreatorLimitCheck, MessageLimitCheck, PlanLimits, Dependencies, Result } from "../types/common.ts";

// ============================================
// PLAN LIMITS CONFIGURATION
// ============================================
export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    maxCreators: 2,
    maxVideosPerCreator: 10,
    maxDailyMessages: 18,
  },
  pro: {
    maxCreators: 25,
    maxVideosPerCreator: 100,
    maxDailyMessages: 500,
  },
};

export const DEFAULT_PLAN = 'free';

// ============================================
// USER USAGE RETRIEVAL
// ============================================
export async function getUserUsage(
  userId: string,
  dependencies: Dependencies
): Promise<Result<UserUsage>> {
  const { supabase, logger } = dependencies;

  try {
    const { data, error } = await supabase.rpc('get_usage_with_limits', {
      p_user_id: userId,
    });

    if (error || !data || data.length === 0) {
      logger.warn('No usage data found, using defaults', { userId });
      return { 
        success: true, 
        data: { 
          plan_type: DEFAULT_PLAN, 
          creators_added: 0, 
          videos_indexed: 0,
          messages_sent_today: 0
        } 
      };
    }

    return {
      success: true,
      data: {
        plan_type: data[0].plan_type || DEFAULT_PLAN,
        creators_added: data[0].creators_added || 0,
        videos_indexed: data[0].videos_indexed || 0,
        messages_sent_today: data[0].messages_sent_today || 0,
      }
    };
  } catch (error) {
    logger.error('Error getting user usage:', { error: String(error), userId });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// CREATOR LIMIT CHECKING
// ============================================
export async function checkCreatorLimit(
  userId: string,
  dependencies: Dependencies
): Promise<Result<CreatorLimitCheck>> {
  const { supabase, logger } = dependencies;

  try {
    const usageResult = await getUserUsage(userId, dependencies);
    if (!usageResult.success) {
      return { success: false, error: usageResult.error };
    }

    const usage = usageResult.data;
    const limits = PLAN_LIMITS[usage.plan_type] || PLAN_LIMITS.free;
    
    // Count actual user_creators links for accuracy
    const { count, error } = await supabase
      .from('user_creators')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    // Use database count as primary source, fallback to usage data only if query fails
    const actualCount = error ? usage.creators_added : (count ?? 0);
    
    logger.debug('Creator count check', { 
      userId, 
      dbCount: count, 
      usageCount: usage.creators_added, 
      actualCount, 
      dbError: error ? 'present' : 'none' 
    });
    
    return {
      success: true,
      data: {
        allowed: actualCount < limits.maxCreators,
        current: actualCount,
        limit: limits.maxCreators,
        planType: usage.plan_type,
      }
    };
  } catch (error) {
    logger.error('Error checking creator limit:', { error: String(error), userId });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// MESSAGE LIMIT CHECKING
// ============================================
export async function checkMessageLimit(
  userId: string,
  dependencies: Dependencies
): Promise<Result<MessageLimitCheck>> {
  const { logger } = dependencies;

  try {
    const usageResult = await getUserUsage(userId, dependencies);
    if (!usageResult.success) {
      return { success: false, error: usageResult.error };
    }

    const usage = usageResult.data;
    const limits = PLAN_LIMITS[usage.plan_type] || PLAN_LIMITS.free;
    
    return {
      success: true,
      data: {
        allowed: usage.messages_sent_today < limits.maxDailyMessages,
        current: usage.messages_sent_today,
        limit: limits.maxDailyMessages,
        planType: usage.plan_type,
      }
    };
  } catch (error) {
    logger.error('Error checking message limit:', { error: String(error), userId });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// EFFECTIVE VIDEO LIMIT CALCULATION
// ============================================
export function getEffectiveVideoLimit(
  importSettings: { mode: string; limit: number | null },
  planLimits: PlanLimits
): number {
  // If "all" mode, use plan limit
  if (importSettings.mode === 'all' || importSettings.limit === null) {
    return planLimits.maxVideosPerCreator;
  }
  
  // Otherwise, use the minimum of user's requested limit and plan limit
  return Math.min(importSettings.limit, planLimits.maxVideosPerCreator);
}