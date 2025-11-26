import React, { useMemo } from 'react'
import { Beast } from '../../types/beast'

/**
 * BeastCard component with mobile responsiveness
 * 
 * Features:
 * - Display beast traits (strength, agility, wisdom, vitality) (Requirement 7.1)
 * - Display rarity score and rarity tier prominently (Requirement 7.2, 12.5)
 * - Show cooldown timer when active (Requirement 7.3)
 * - Display claimable reward amount (Requirement 7.4)
 * - Show NFT metadata and imagery (Requirement 7.5, 12.4)
 * - Display generation and breeding information
 * - Provide action buttons (activity, upgrade, claim, breed)
 * - Mobile-responsive layout (single column on mobile) (Requirement 21.1)
 * - Touch-friendly action buttons for mobile (Requirement 21.3)
 * - Loading skeleton while fetching data (Requirement 20.1)
 */

export interface BeastCardProps {
  beast: Beast
  cooldownDuration?: number
  rewardRate?: number
  onActivity?: () => void
  onUpgrade?: () => void
  onClaim?: () => void
  onBreed?: () => void
  loading?: boolean
  className?: string
}

/**
 * Get rarity tier from rarity score
 * Requirement 12.5: Categorize beasts by rarity tier
 */
function getRarityTier(rarityScore: number): {
  tier: string
  color: string
  bgColor: string
} {
  if (rarityScore >= 951) {
    return { tier: 'Legendary', color: 'text-yellow-400', bgColor: 'bg-yellow-900/20' }
  }
  if (rarityScore >= 801) {
    return { tier: 'Epic', color: 'text-purple-400', bgColor: 'bg-purple-900/20' }
  }
  if (rarityScore >= 601) {
    return { tier: 'Rare', color: 'text-blue-400', bgColor: 'bg-blue-900/20' }
  }
  if (rarityScore >= 401) {
    return { tier: 'Uncommon', color: 'text-green-400', bgColor: 'bg-green-900/20' }
  }
  return { tier: 'Common', color: 'text-gray-400', bgColor: 'bg-gray-900/20' }
}

/**
 * Format cooldown time remaining
 */
function formatCooldownTime(seconds: number): string {
  if (seconds <= 0) return 'Ready'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

/**
 * Calculate cooldown remaining
 */
function getCooldownRemaining(lastActivity: number, cooldownDuration: number): number {
  if (!lastActivity || lastActivity === 0) return 0
  
  const currentTime = Math.floor(Date.now() / 1000)
  const cooldownEndTime = lastActivity + cooldownDuration
  return Math.max(0, cooldownEndTime - currentTime)
}

/**
 * Calculate claimable rewards
 */
function calculateClaimableRewards(
  beast: Beast,
  rewardRate: number
): number {
  if (!beast.lastActivity || beast.lastActivity === 0) {
    return beast.pendingRewards
  }
  
  const currentTime = Math.floor(Date.now() / 1000)
  const timeElapsed = Math.max(0, currentTime - beast.lastActivity)
  const calculatedRewards = timeElapsed * rewardRate
  
  return beast.pendingRewards + calculatedRewards
}

export function BeastCard({
  beast,
  cooldownDuration = 3600,
  rewardRate = 2777,
  onActivity,
  onUpgrade,
  onClaim,
  onBreed,
  loading = false,
  className = ''
}: BeastCardProps) {
  const rarity = useMemo(() => getRarityTier(beast.rarityScore), [beast.rarityScore])
  
  const cooldownRemaining = useMemo(
    () => getCooldownRemaining(beast.lastActivity, cooldownDuration),
    [beast.lastActivity, cooldownDuration]
  )
  
  const claimableRewards = useMemo(
    () => calculateClaimableRewards(beast, rewardRate),
    [beast, rewardRate]
  )
  
  const isInCooldown = cooldownRemaining > 0
  
  if (loading) {
    return <BeastCardSkeleton className={className} />
  }
  
  return (
    <div
      className={`
        bg-gray-800 rounded-lg shadow-lg overflow-hidden
        border-2 ${rarity.bgColor} border-opacity-50
        hover:shadow-xl transition-shadow duration-200
        ${className}
      `}
    >
      {/* Header with Rarity */}
      <div className={`${rarity.bgColor} px-4 py-2 flex justify-between items-center`}>
        <span className="text-sm text-gray-400">
          Gen {beast.generation}
        </span>
        <span className={`font-bold ${rarity.color}`}>
          {rarity.tier}
        </span>
      </div>
      
      {/* Beast Image/Placeholder */}
      <div className="relative h-48 bg-gray-900 flex items-center justify-center">
        {beast.metadataUri ? (
          <img
            src={beast.metadataUri}
            alt="Beast"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to placeholder on error
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className="text-6xl">🐉</div>
        )}
        
        {/* Rarity Score Badge */}
        <div className="absolute top-2 right-2 bg-black/70 px-3 py-1 rounded-full">
          <span className="text-sm font-bold text-white">
            ⭐ {beast.rarityScore}
          </span>
        </div>
      </div>
      
      {/* Traits Section */}
      <div className="p-4 space-y-3">
        <h3 className="text-lg font-bold text-white mb-2">Traits</h3>
        
        <div className="grid grid-cols-2 gap-2">
          <TraitDisplay label="💪 Strength" value={beast.traits[0]} />
          <TraitDisplay label="⚡ Agility" value={beast.traits[1]} />
          <TraitDisplay label="🧠 Wisdom" value={beast.traits[2]} />
          <TraitDisplay label="❤️  Vitality" value={beast.traits[3]} />
        </div>
        
        {/* Stats Section */}
        <div className="pt-3 border-t border-gray-700 space-y-2">
          {/* Cooldown Status */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Cooldown:</span>
            <span className={`text-sm font-medium ${isInCooldown ? 'text-yellow-400' : 'text-green-400'}`}>
              {isInCooldown ? `⏳ ${formatCooldownTime(cooldownRemaining)}` : '✅ Ready'}
            </span>
          </div>
          
          {/* Claimable Rewards */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Rewards:</span>
            <span className="text-sm font-medium text-blue-400">
              💰 {(claimableRewards / 1e9).toFixed(4)} ZEN
            </span>
          </div>
          
          {/* Activity Count */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Activities:</span>
            <span className="text-sm font-medium text-gray-300">
              {beast.activityCount}
            </span>
          </div>
          
          {/* Breeding Info */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Breeding:</span>
            <span className="text-sm font-medium text-gray-300">
              {beast.breedingCount} times
            </span>
          </div>
        </div>
        
        {/* Action Buttons - Mobile Responsive */}
        <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          <ActionButton
            label="Activity"
            onClick={onActivity}
            disabled={isInCooldown}
            variant="primary"
          />
          <ActionButton
            label="Upgrade"
            onClick={onUpgrade}
            variant="secondary"
          />
          <ActionButton
            label="Claim"
            onClick={onClaim}
            disabled={claimableRewards === 0}
            variant="success"
          />
          <ActionButton
            label="Breed"
            onClick={onBreed}
            variant="accent"
          />
        </div>
        
        {/* Mint Address (truncated) */}
        <div className="pt-2 text-xs text-gray-500 text-center truncate">
          {beast.mint}
        </div>
      </div>
    </div>
  )
}

/**
 * Trait display component
 */
function TraitDisplay({ label, value }: { label: string; value: number }) {
  const percentage = (value / 255) * 100
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">{value}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Action button component with touch-friendly sizing
 */
function ActionButton({
  label,
  onClick,
  disabled = false,
  variant = 'primary'
}: {
  label: string
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'success' | 'accent'
}) {
  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600',
    secondary: 'bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600',
    success: 'bg-green-600 hover:bg-green-700 disabled:bg-gray-600',
    accent: 'bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600'
  }
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`
        ${variantStyles[variant]}
        text-white text-sm font-medium
        px-3 py-2 rounded-lg
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-95 transform
        touch-manipulation
      `}
    >
      {label}
    </button>
  )
}

/**
 * Loading skeleton for BeastCard
 * Requirement 20.1: Display loading skeleton while fetching data
 */
export function BeastCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gray-800 rounded-lg shadow-lg overflow-hidden animate-pulse ${className}`}>
      {/* Header */}
      <div className="bg-gray-700 px-4 py-2 h-8" />
      
      {/* Image placeholder */}
      <div className="h-48 bg-gray-900" />
      
      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="h-6 bg-gray-700 rounded w-1/3" />
        
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-4 bg-gray-700 rounded" />
              <div className="h-2 bg-gray-700 rounded" />
            </div>
          ))}
        </div>
        
        <div className="pt-3 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 bg-gray-700 rounded" />
          ))}
        </div>
        
        <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
