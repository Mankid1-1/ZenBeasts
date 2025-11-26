import React, { useState, useEffect } from 'react'
import { useMintBeast } from '../../hooks/useMintBeast'
import { translateError } from '../../lib/errors/errorTranslation'

/**
 * MintForm component with fee estimation
 * 
 * Features:
 * - Input fields for beast metadata with mobile-friendly inputs (Requirement 1.1, 1.2, 1.3, 1.4, 1.5)
 * - Mint button with loading state and progress indication (Requirement 20.2)
 * - Transaction fee estimation display (Requirement 13.1)
 * - Error display with actionable messages
 * - Keyboard navigation support (Requirement 21.5)
 * - ARIA labels for screen readers (Requirement 21.4)
 */

export interface MintFormProps {
  onSuccess?: (mintAddress: string) => void
  onCancel?: () => void
  className?: string
}

export function MintForm({ onSuccess, onCancel, className = '' }: MintFormProps) {
  const { mintBeast, estimateFee, loading, error, estimatedFee, progress } = useMintBeast()
  
  const [name, setName] = useState('')
  const [uri, setUri] = useState('')
  const [showFeeEstimate, setShowFeeEstimate] = useState(false)
  
  // Estimate fee when form is ready
  useEffect(() => {
    if (name && uri && !showFeeEstimate) {
      estimateFee().then(() => setShowFeeEstimate(true))
    }
  }, [name, uri, estimateFee, showFeeEstimate])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim() || !uri.trim()) {
      return
    }
    
    const result = await mintBeast(name.trim(), uri.trim())
    
    if (result && onSuccess) {
      onSuccess(result)
      // Reset form
      setName('')
      setUri('')
      setShowFeeEstimate(false)
    }
  }
  
  const isFormValid = name.trim().length > 0 && uri.trim().length > 0
  
  return (
    <div className={`bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
      <h2 className="text-2xl font-bold text-white mb-6">
        🐉 Mint New Beast
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Input */}
        <div>
          <label
            htmlFor="beast-name"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Beast Name *
          </label>
          <input
            id="beast-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter beast name"
            disabled={loading}
            required
            aria-required="true"
            aria-label="Beast name"
            className="
              w-full px-4 py-3 rounded-lg
              bg-gray-700 text-white
              border-2 border-gray-600
              focus:border-blue-500 focus:outline-none
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
              text-base
            "
            maxLength={50}
          />
          <p className="mt-1 text-xs text-gray-400">
            {name.length}/50 characters
          </p>
        </div>
        
        {/* Metadata URI Input */}
        <div>
          <label
            htmlFor="metadata-uri"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Metadata URI *
          </label>
          <input
            id="metadata-uri"
            type="url"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder="https://arweave.net/..."
            disabled={loading}
            required
            aria-required="true"
            aria-label="Metadata URI"
            className="
              w-full px-4 py-3 rounded-lg
              bg-gray-700 text-white
              border-2 border-gray-600
              focus:border-blue-500 focus:outline-none
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
              text-base
            "
          />
          <p className="mt-1 text-xs text-gray-400">
            URL to off-chain JSON metadata (Arweave, IPFS, etc.)
          </p>
        </div>
        
        {/* Fee Estimation */}
        {showFeeEstimate && estimatedFee !== null && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Estimated Transaction Fee:</span>
              <span className="text-lg font-bold text-blue-400">
                {estimatedFee.toFixed(6)} SOL
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              This is an estimate. Actual fee may vary slightly.
            </p>
          </div>
        )}
        
        {/* Progress Indicator */}
        {progress && (
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
              <span className="text-sm text-gray-300">{progress}</span>
            </div>
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <span className="text-red-500 text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">
                  {translateError(error).title}
                </p>
                <p className="mt-1 text-xs text-gray-300">
                  {translateError(error).message}
                </p>
                {translateError(error).action && (
                  <p className="mt-2 text-xs text-gray-400">
                    💡 {translateError(error).action}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="submit"
            disabled={!isFormValid || loading}
            aria-label="Mint beast"
            className="
              flex-1 px-6 py-3 rounded-lg
              bg-blue-600 hover:bg-blue-700
              text-white font-medium
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
              active:scale-95 transform
              touch-manipulation
            "
          >
            {loading ? (
              <span className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                <span>Minting...</span>
              </span>
            ) : (
              '🐉 Mint Beast'
            )}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              aria-label="Cancel minting"
              className="
                px-6 py-3 rounded-lg
                bg-gray-700 hover:bg-gray-600
                text-white font-medium
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-200
                active:scale-95 transform
                touch-manipulation
              "
            >
              Cancel
            </button>
          )}
        </div>
        
        {/* Info Box */}
        <div className="bg-gray-700/50 rounded-lg p-4 text-sm text-gray-300">
          <p className="font-medium mb-2">ℹ️ What happens when you mint:</p>
          <ul className="space-y-1 text-xs">
            <li>• Random traits will be generated (Strength, Agility, Wisdom, Vitality)</li>
            <li>• Rarity score will be calculated based on traits</li>
            <li>• A unique NFT will be created and sent to your wallet</li>
            <li>• You'll be able to perform activities, upgrade traits, and breed</li>
          </ul>
        </div>
      </form>
    </div>
  )
}
