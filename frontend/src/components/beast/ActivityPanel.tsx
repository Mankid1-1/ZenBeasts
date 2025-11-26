'use client'
import { useState, useEffect, useMemo } from 'react'
import { useActivity } from '../../hooks/useActivity'
import { useBeast } from '../../hooks/useBeast'
import { translateError } from '../../lib/errors/errorTranslation'

/**
 * ActivityPanel component with activity types
 * 
 * Features:
 * - Activity type selection with reward rate display (Requirement 15.2)
 * - Cooldown status display with remaining time (Requirement 2.1, 2.4)
 * - Activity initiation button with loading state (Requirement 2.2, 2.3)
 * - Expected rewards calculation display (Requirement 2.5)
 * - Mobile-responsive layout (Requirement 21.1)
 */

interface ActivityType {
  id: number
  name: string
  description: string
  icon: string
  rewardMultiplier: number
  cooldownHours: number
}

const ACTIVITY_TYPES: ActivityType[] = [
  {
    id: 0,
    name: 'Meditation',
    description: 'Peaceful contemplation to restore energy',
    icon: '🧘',
    rewardMultiplier: 1.0,
    cooldownHours: 1
  },
  {
    id: 1,
    name: 'Training',
    description: 'Rigorous practice to hone skills',
    icon: '⚔️',
    rewardMultiplier: 1.5,
    cooldownHours: 2
  },
  {
    id: 2,
    name: 'Exploration',
    description: 'Venture into unknown territories',
    icon: '🗺️',
    rewardMultiplier: 2.0,
    cooldownHours: 3
  },
  {
    id: 3,
    name: 'Battle',
    description: 'Engage in fierce combat for glory',
    icon: '⚡',
    rewardMultiplier: 3.0,
    cooldownHours: 4
  }
]

interface ActivityPanelProps {
  mint: string
  className?: string
}

export default function ActivityPanel({ mint, className = '' }: ActivityPanelProps) {
  const { performActivity, loading, error } = useActivity()
  const { beast, loading: beastLoading, refetch } = useBeast(mint)
  const [selectedActivity, setSelectedActivity] = useState<number>(0)
  const [currentTime, setCurrentTime] = useState(Date.now())
  
  // Update current time every second for cooldown display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])
  
  // Calculate cooldown status
  const cooldownStatus = useMemo(() => {
    if (!beast) return { inCooldown: false, remainingSeconds: 0 }
    
    const lastActivityTime = beast.lastActivity * 1000 // Convert to milliseconds
    const cooldownDuration = 3600 * 1000 // 1 hour in milliseconds (from config)
    const cooldownEndTime = lastActivityTime + cooldownDuration
    const remainingMs = cooldownEndTime - currentTime
    
    return {
      inCooldown: remainingMs > 0,
      remainingSeconds: Math.max(0, Math.floor(remainingMs / 1000))
    }
  }, [beast, currentTime])
  
  // Format remaining time
  const formatRemainingTime = (seconds: number): string => {
    if (seconds === 0) return 'Ready!'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }
  
  // Calculate expected rewards
  const expectedRewards = useMemo(() => {
    if (!beast) return 0
    
    const selectedActivityType = ACTIVITY_TYPES.find(a => a.id === selectedActivity)
    if (!selectedActivityType) return 0
    
    // Base reward rate (tokens per second) - this should come from config
    const baseRewardRate = 0.001 // Example: 0.001 ZEN per second
    const activityDuration = selectedActivityType.cooldownHours * 3600 // Duration in seconds
    
    return baseRewardRate * selectedActivityType.rewardMultiplier * activityDuration
  }, [beast, selectedActivity])
  
  const handlePerformActivity = async () => {
    const success = await performActivity(mint, selectedActivity)
    if (success) {
      // Refetch beast data to update cooldown status
      await refetch()
    }
  }
  
  if (beastLoading) {
    return (
      <div className={`bg-slate-800 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
          <div className="h-20 bg-slate-700 rounded"></div>
          <div className="h-12 bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }
  
  if (!beast) {
    return (
      <div className={`bg-slate-800 rounded-lg p-6 ${className}`}>
        <p className="text-slate-400">Beast not found</p>
      </div>
    )
  }
  
  return (
    <div className={`bg-slate-800 rounded-lg shadow-lg p-6 ${className}`}>
      <h3 className="text-xl font-bold text-slate-100 mb-4">
        🎯 Activities
      </h3>
      
      {/* Cooldown Status */}
      <div className={`mb-6 p-4 rounded-lg border-2 ${
        cooldownStatus.inCooldown 
          ? 'bg-orange-900/20 border-orange-500/30' 
          : 'bg-emerald-900/20 border-emerald-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">
            {cooldownStatus.inCooldown ? '⏳ Cooldown Active' : '✅ Ready for Activity'}
          </span>
          <span className={`text-lg font-bold ${
            cooldownStatus.inCooldown ? 'text-orange-400' : 'text-emerald-400'
          }`}>
            {formatRemainingTime(cooldownStatus.remainingSeconds)}
          </span>
        </div>
        {cooldownStatus.inCooldown && (
          <div className="mt-2">
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-1000"
                style={{ 
                  width: `${Math.max(0, 100 - (cooldownStatus.remainingSeconds / 3600) * 100)}%` 
                }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Activity Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Select Activity Type
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ACTIVITY_TYPES.map((activity) => (
            <button
              key={activity.id}
              onClick={() => setSelectedActivity(activity.id)}
              disabled={loading}
              className={`
                p-4 rounded-lg border-2 text-left transition-all
                ${selectedActivity === activity.id
                  ? 'bg-emerald-900/30 border-emerald-500 shadow-lg'
                  : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-95 transform
                touch-manipulation
              `}
              aria-label={`Select ${activity.name} activity`}
            >
              <div className="flex items-start space-x-3">
                <span className="text-2xl">{activity.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-100 mb-1">
                    {activity.name}
                  </div>
                  <div className="text-xs text-slate-400 mb-2">
                    {activity.description}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-emerald-900/30 text-emerald-400 rounded">
                      {activity.rewardMultiplier}x rewards
                    </span>
                    <span className="px-2 py-1 bg-slate-600 text-slate-300 rounded">
                      {activity.cooldownHours}h cooldown
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Expected Rewards Display */}
      <div className="mb-6 p-4 bg-slate-700/50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">Expected Rewards:</span>
          <span className="text-lg font-bold text-emerald-400">
            ~{expectedRewards.toFixed(3)} ZEN
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Based on {ACTIVITY_TYPES.find(a => a.id === selectedActivity)?.cooldownHours}h activity duration
        </p>
      </div>
      
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
      
      {/* Action Button */}
      <button
        onClick={handlePerformActivity}
        disabled={cooldownStatus.inCooldown || loading}
        className="
          w-full px-6 py-4 rounded-lg
          bg-emerald-600 hover:bg-emerald-700
          text-white font-medium text-lg
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
          active:scale-95 transform
          touch-manipulation
        "
        aria-label="Start activity"
      >
        {loading ? (
          <span className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            <span>Starting Activity...</span>
          </span>
        ) : cooldownStatus.inCooldown ? (
          `⏳ Cooldown: ${formatRemainingTime(cooldownStatus.remainingSeconds)}`
        ) : (
          `${ACTIVITY_TYPES.find(a => a.id === selectedActivity)?.icon} Start ${ACTIVITY_TYPES.find(a => a.id === selectedActivity)?.name}`
        )}
      </button>
      
      {/* Info Box */}
      <div className="mt-4 bg-slate-700/30 rounded-lg p-3 text-xs text-slate-400">
        <p className="font-medium mb-1">ℹ️ Activity Tips:</p>
        <ul className="space-y-1 ml-4 list-disc">
          <li>Higher reward multipliers come with longer cooldowns</li>
          <li>Rewards accumulate over time and can be claimed later</li>
          <li>Choose activities strategically based on your schedule</li>
        </ul>
      </div>
    </div>
  )
}