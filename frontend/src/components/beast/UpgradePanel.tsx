'use client'
import { useState, useEffect, useMemo } from 'react'
import { useUpgrade } from '../../hooks/useUpgrade'
import { useBeast } from '../../hooks/useBeast'
import { translateError } from '../../lib/errors/errorTranslation'
import { Beast } from '../../types/beast'

/**
 * UpgradePanel component with cost scaling
 * 
 * Features:
 * - Trait selection dropdown (Requirement 4.1)
 * - Scaled cost display based on current trait value (Requirement 17.2)
 * - Trait max value indicator (255) (Requirement 17.1)
 * - Upgrade confirmation button (Requirement 4.2, 4.3, 4.4, 4.5)
 * - Achievement indicators for maxed traits (Requirement 17.3)
 * - Mobile-responsive layout (Requirement 21.1)
 * - Real-time updates via WebSocket (Requirement 20.3)
 * - Transaction progress indication (Requirement 20.2)
 */

interface UpgradePanelProps {
  mint: string
  zenMint: string
  className?: string
  onUpgradeComplete?: () => void
}

interface TraitInfo {
  index: number
  name: string
  icon: string
  description: string
}

const TRAIT_INFO: TraitInfo[] = [
  {
    index: 0,
    name: 'Strength',
    icon: '💪',
    description: 'Physical power and combat prowess'
  },
  {
    index: 1,
    name: 'Agility',
    icon: '⚡',
    description: 'Speed and reflexes'
  },
  {
    index: 2,
    name: 'Wisdom',
    icon: '🧠',
    description: 'Intelligence and strategic thinking'
  },
  {
    index: 3,
    name: 'Vitality',
    icon: '❤️',
    description: 'Health and endurance'
  }
]

// Configuration values (should match program config)
const UPGRADE_BASE_COST = 1_000_000_000 // 1 ZEN in lamports
const UPGRADE_SCALING_FACTOR = 100

export default function UpgradePanel({ 
  mint, 
  zenMint, 
  className = '',
  onUpgradeComplete
}: UpgradePanelProps) {
  const { 
    upgradeTrait, 
    calculateUpgradeCost, 
    estimateFee,
    subscribeToUpdates,
    loading, 
    error,
    estimatedFee,
    progress
  } = useUpgrade(zenMint)
  
  const { beast, loading: beastLoading, refetch } = useBeast(mint)
  const [selectedTrait, setSelectedTrait] = useState<number>(0)
  const [localBeast, setLocalBeast] = useState<Beast | null>(null)
  
  // Use local beast state for real-time updates, fallback to fetched beast
  const displayBeast = localBeast || beast
  
  // Subscribe to real-time updates when component mounts
  useEffect(() => {
    if (beast) {
      setLocalBeast(beast)
    }
  }, [beast])
  
  // Calculate upgrade cost for selected trait
  const upgradeCost = useMemo(() => {
    if (!displayBeast) return 0
    
    const currentValue = displayBeast.traits[selectedTrait]
    return calculateUpgradeCost(currentValue, UPGRADE_BASE_COST, UPGRADE_SCALING_FACTOR)
  }, [displayBeast, selectedTrait, calculateUpgradeCost])
  
  // Check if selected trait is at maximum
  const isTraitMaxed = useMemo(() => {
    if (!displayBeast) return false
    return displayBeast.traits[selectedTrait] >= 255
  }, [displayBeast, selectedTrait])
  
  // Count maxed traits for achievement display
  const maxedTraitsCount = useMemo(() => {
    if (!displayBeast) return 0
    return displayBeast.traits.slice(0, 4).filter(t => t >= 255).length
  }, [displayBeast])
  
  // Calculate trait percentage
  const getTraitPercentage = (value: number): number => {
    return (value / 255) * 100
  }
  
  // Handle upgrade
  const handleUpgrade = async () => {
    const signature = await upgradeTrait(mint, selectedTrait, (updatedBeast) => {
      // Real-time update callback
      setLocalBeast(updatedBeast)
    })
    
    if (signature) {
      // Refetch to ensure consistency
      await refetch()
      onUpgradeComplete?.()
    }
  }
  
  // Estimate fee when trait selection changes
  useEffect(() => {
    if (displayBeast && !isTraitMaxed) {
      estimateFee(mint, selectedTrait)
    }
  }, [mint, selectedTrait, displayBeast, isTraitMaxed, estimateFee])
  
  if (beastLoading) {
    return (
      <div className={`bg-slate-800 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
          <div className="h-32 bg-slate-700 rounded"></div>
          <div className="h-12 bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }
  
  if (!displayBeast) {
    return (
      <div className={`bg-slate-800 rounded-lg p-6 ${className}`}>
        <p className="text-slate-400">Beast not found</p>
      </div>
    )
  }
  
  return (
    <div className={`bg-slate-800 rounded-lg shadow-lg p-6 ${className}`}>
      <h3 className="text-xl font-bold text-slate-100 mb-4">
        ⬆️ Upgrade Traits
      </h3>
      
      {/* Achievement Indicators for Maxed Traits */}
      {maxedTraitsCount > 0 && (
        <div className="mb-6 p-4 bg-yellow-900/20 border-2 border-yellow-500/30 rounded-lg">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">🏆</span>
            <div className="flex-1">
              <p className="text-yellow-400 font-bold">
                Achievement Unlocked!
              </p>
              <p className="text-sm text-slate-300">
                {maxedTraitsCount} trait{maxedTraitsCount > 1 ? 's' : ''} maxed out at 255
              </p>
            </div>
          </div>
          {maxedTraitsCount === 4 && (
            <div className="mt-3 pt-3 border-t border-yellow-500/30">
              <p className="text-sm text-yellow-300 font-medium">
                ✨ Perfect Beast! All core traits are maxed! ✨
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Trait Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Select Trait to Upgrade
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TRAIT_INFO.map((trait) => {
            const currentValue = displayBeast.traits[trait.index]
            const isMaxed = currentValue >= 255
            const isSelected = selectedTrait === trait.index
            const percentage = getTraitPercentage(currentValue)
            
            return (
              <button
                key={trait.index}
                onClick={() => setSelectedTrait(trait.index)}
                disabled={loading}
                className={`
                  p-4 rounded-lg border-2 text-left transition-all
                  ${isSelected
                    ? 'bg-purple-900/30 border-purple-500 shadow-lg'
                    : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                  }
                  ${isMaxed ? 'ring-2 ring-yellow-500/50' : ''}
                  disabled:opacity-50 disabled:cursor-not-allowed
                  active:scale-95 transform
                  touch-manipulation
                `}
                aria-label={`Select ${trait.name} trait`}
              >
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">{trait.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-100">
                        {trait.name}
                      </span>
                      <span className={`text-lg font-bold ${
                        isMaxed ? 'text-yellow-400' : 'text-slate-100'
                      }`}>
                        {currentValue}
                        {isMaxed && ' 🏆'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">
                      {trait.description}
                    </p>
                    
                    {/* Progress Bar */}
                    <div className="relative">
                      <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isMaxed 
                              ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                              : 'bg-gradient-to-r from-purple-500 to-blue-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-xs text-slate-400">
                        <span>0</span>
                        <span className={isMaxed ? 'text-yellow-400 font-bold' : ''}>
                          {isMaxed ? 'MAX' : '255'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Selected Trait Details */}
      <div className="mb-6 p-4 bg-slate-700/50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{TRAIT_INFO[selectedTrait].icon}</span>
            <span className="font-medium text-slate-100">
              {TRAIT_INFO[selectedTrait].name}
            </span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-100">
              {displayBeast.traits[selectedTrait]}
            </div>
            <div className="text-xs text-slate-400">
              / 255 max
            </div>
          </div>
        </div>
        
        {/* Upgrade Cost Display with Scaling */}
        {!isTraitMaxed && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Upgrade Cost:</span>
              <span className="text-lg font-bold text-purple-400">
                {(upgradeCost / 1e9).toFixed(4)} ZEN
              </span>
            </div>
            
            {/* Cost Scaling Explanation */}
            <div className="text-xs text-slate-400 bg-slate-800/50 p-2 rounded">
              <p className="mb-1">
                💡 Cost Formula: Base × (1 + Current Value / {UPGRADE_SCALING_FACTOR})
              </p>
              <p>
                Higher trait values cost more to upgrade
              </p>
            </div>
            
            {/* Transaction Fee */}
            {estimatedFee !== null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Transaction Fee:</span>
                <span className="text-slate-300">
                  ~{estimatedFee.toFixed(6)} SOL
                </span>
              </div>
            )}
            
            {/* Next Level Preview */}
            <div className="pt-2 border-t border-slate-600">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">After Upgrade:</span>
                <span className="text-emerald-400 font-medium">
                  {displayBeast.traits[selectedTrait]} → {displayBeast.traits[selectedTrait] + 1}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-slate-400">New Rarity Score:</span>
                <span className="text-emerald-400 font-medium">
                  {displayBeast.rarityScore} → {displayBeast.rarityScore + 1}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Maxed Trait Message */}
        {isTraitMaxed && (
          <div className="flex items-center space-x-2 text-yellow-400">
            <span className="text-xl">🏆</span>
            <span className="text-sm font-medium">
              This trait is already at maximum value!
            </span>
          </div>
        )}
      </div>
      
      {/* Progress Indicator */}
      {progress && (
        <div className="mb-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
            <span className="text-sm text-blue-400">{progress}</span>
          </div>
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <span className="text-red-500 text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-400">
                {translateError(error).title}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                {translateError(error).message}
              </p>
              {translateError(error).action && (
                <p className="mt-2 text-xs text-slate-400">
                  💡 {translateError(error).action}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Upgrade Button */}
      <button
        onClick={handleUpgrade}
        disabled={isTraitMaxed || loading}
        className="
          w-full px-6 py-4 rounded-lg
          bg-purple-600 hover:bg-purple-700
          text-white font-medium text-lg
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
          active:scale-95 transform
          touch-manipulation
        "
        aria-label={`Upgrade ${TRAIT_INFO[selectedTrait].name}`}
      >
        {loading ? (
          <span className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            <span>Upgrading...</span>
          </span>
        ) : isTraitMaxed ? (
          '🏆 Trait Already Maxed'
        ) : (
          `⬆️ Upgrade ${TRAIT_INFO[selectedTrait].name} (+1)`
        )}
      </button>
      
      {/* Info Box */}
      <div className="mt-4 bg-slate-700/30 rounded-lg p-3 text-xs text-slate-400">
        <p className="font-medium mb-1">ℹ️ Upgrade Tips:</p>
        <ul className="space-y-1 ml-4 list-disc">
          <li>Each upgrade increases the trait by exactly 1 point</li>
          <li>Upgrade costs scale with current trait value</li>
          <li>Upgrading recalculates your beast's rarity score</li>
          <li>Maximum trait value is 255 (achievement unlocked!)</li>
        </ul>
      </div>
    </div>
  )
}
