/**
 * User tier system for frame limits and feature access
 * Designed for future premium membership integration
 */

export type UserTier = 'free' | 'premium' | 'pro'

export interface TierLimits {
  // Video import limits
  maxVideoFrames: number
  maxVideoFileSizeMB: number
  
  // GIF import limits  
  maxGifFrames: number
  maxGifFileSizeMB: number
  
  // Project limits
  maxProjectsPerUser?: number
  maxCanvasSizePixels: number
  
  // Feature access
  hasAdvancedExport: boolean
  hasCloudSync: boolean
  hasAIGeneration: boolean
}

export const TIER_LIMITS: Record<UserTier, TierLimits> = {
  free: {
    maxVideoFrames: 10,
    maxVideoFileSizeMB: 50,
    maxGifFrames: 50, // Keep existing GIF limits higher
    maxGifFileSizeMB: 10,
    maxCanvasSizePixels: 2048,
    hasAdvancedExport: false,
    hasCloudSync: false,
    hasAIGeneration: true // Keep AI features for kids
  },
  premium: {
    maxVideoFrames: 30,
    maxVideoFileSizeMB: 100,
    maxGifFrames: 100,
    maxGifFileSizeMB: 25,
    maxProjectsPerUser: 50,
    maxCanvasSizePixels: 4096,
    hasAdvancedExport: true,
    hasCloudSync: true,
    hasAIGeneration: true
  },
  pro: {
    maxVideoFrames: 100,
    maxVideoFileSizeMB: 200,
    maxGifFrames: 200,
    maxGifFileSizeMB: 50,
    maxProjectsPerUser: 200,
    maxCanvasSizePixels: 8192,
    hasAdvancedExport: true,
    hasCloudSync: true,
    hasAIGeneration: true
  }
}

/**
 * Get current user tier - placeholder for future membership integration
 * Currently returns 'free' for all users
 */
export function getCurrentUserTier(): UserTier {
  // TODO: In Phase 2, integrate with actual membership system
  // This could check localStorage, API, or auth context
  return 'free'
}

/**
 * Get tier limits for current or specified user
 */
export function getTierLimits(tier?: UserTier): TierLimits {
  const userTier = tier || getCurrentUserTier()
  return TIER_LIMITS[userTier]
}

/**
 * Check if user can perform an action based on their tier
 */
export function canUserPerformAction(action: keyof TierLimits, tier?: UserTier): boolean {
  const limits = getTierLimits(tier)
  return Boolean(limits[action])
}

/**
 * Get video frame limit for current user
 */
export function getVideoFrameLimit(tier?: UserTier): number {
  return getTierLimits(tier).maxVideoFrames
}

/**
 * Get GIF frame limit for current user
 */
export function getGifFrameLimit(tier?: UserTier): number {
  return getTierLimits(tier).maxGifFrames
}