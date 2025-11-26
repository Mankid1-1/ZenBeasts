import { useState, useEffect, useCallback, useRef } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, AccountInfo } from '@solana/web3.js'
import { useProgram } from './useProgram'
import { withRetry } from '../lib/connection'
import { Beast } from '../types/beast'

/**
 * Cache entry for beast data
 */
interface CacheEntry {
  data: Beast
  timestamp: number
}

/**
 * Hook for fetching all beasts owned by connected wallet with caching and real-time updates
 * 
 * Features:
 * - Query all beasts owned by connected wallet (Requirement 6.4)
 * - Fetch beast account data with retry logic (Requirement 20.5)
 * - Local caching with short TTL (Requirement 20.3)
 * - Subscribe to account changes for real-time updates (Requirement 20.3)
 * - Parse and format beast data for display (Requirement 10.2)
 * 
 * @returns {Object} beasts array, loading state, error state, and refetch function
 */
export function useBeasts() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const { program } = useProgram()
  const [beasts, setBeasts] = useState<Beast[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  // Cache with 30 second TTL
  const cache = useRef<Map<string, CacheEntry>>(new Map())
  const CACHE_TTL = 30000 // 30 seconds
  
  // Subscription IDs for cleanup
  const subscriptions = useRef<Map<string, number>>(new Map())

  /**
   * Parse raw beast account data into Beast type
   */
  const parseBeastAccount = useCallback((accountData: any, mint: PublicKey): Beast => {
    return {
      mint: mint.toString(),
      owner: accountData.owner.toString(),
      traits: Array.from(accountData.traits),
      rarityScore: Number(accountData.rarityScore),
      lastActivity: Number(accountData.lastActivity),
      activityCount: accountData.activityCount,
      pendingRewards: Number(accountData.pendingRewards),
      parents: Array.isArray(accountData.parents) 
        ? accountData.parents.map((p: any) => p.toString()) 
        : [],
      generation: typeof accountData.generation === 'number' ? accountData.generation : 0,
      lastBreeding: Number(accountData.lastBreeding || 0),
      breedingCount: accountData.breedingCount || 0,
      metadataUri: accountData.metadataUri || ''
    }
  }, [])

  /**
   * Check if cached data is still valid
   */
  const isCacheValid = useCallback((mint: string): boolean => {
    const entry = cache.current.get(mint)
    if (!entry) return false
    return Date.now() - entry.timestamp < CACHE_TTL
  }, [])

  /**
   * Subscribe to account changes for real-time updates
   * Requirement 20.3: Update UI within 2 seconds using WebSocket subscriptions
   */
  const subscribeToAccount = useCallback((mint: PublicKey, beastPDA: PublicKey) => {
    if (!connection) return

    const mintStr = mint.toString()
    
    // Don't subscribe if already subscribed
    if (subscriptions.current.has(mintStr)) return

    try {
      const subscriptionId = connection.onAccountChange(
        beastPDA,
        (accountInfo: AccountInfo<Buffer>) => {
          if (!program) return
          
          try {
            // Decode the account data
            const accountData = program.account.beastAccount.coder.accounts.decode(
              'BeastAccount',
              accountInfo.data
            )
            
            const beast = parseBeastAccount(accountData, mint)
            
            // Update cache
            cache.current.set(mintStr, {
              data: beast,
              timestamp: Date.now()
            })
            
            // Update state
            setBeasts(prev => {
              const index = prev.findIndex(b => b.mint === mintStr)
              if (index >= 0) {
                const updated = [...prev]
                updated[index] = beast
                return updated
              }
              return [...prev, beast]
            })
          } catch (err) {
            console.error('Failed to decode beast account update:', err)
          }
        },
        'confirmed'
      )
      
      subscriptions.current.set(mintStr, subscriptionId)
    } catch (err) {
      console.error('Failed to subscribe to account:', err)
    }
  }, [connection, program, parseBeastAccount])

  /**
   * Unsubscribe from all account changes
   */
  const unsubscribeAll = useCallback(() => {
    if (!connection) return
    
    subscriptions.current.forEach((subscriptionId) => {
      try {
        connection.removeAccountChangeListener(subscriptionId)
      } catch (err) {
        console.error('Failed to unsubscribe:', err)
      }
    })
    
    subscriptions.current.clear()
  }, [connection])

  /**
   * Fetch all beasts owned by the connected wallet
   * Requirement 6.4: Query and display all beasts owned by connected wallet
   */
  const fetchBeasts = useCallback(async () => {
    if (!program || !publicKey) {
      setBeasts([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch all beast accounts with retry logic
      const accounts = await withRetry(async () => {
        return await program.account.beastAccount.all([
          {
            memcmp: {
              offset: 8 + 32, // Discriminator (8) + mint (32)
              bytes: publicKey.toBase58()
            }
          }
        ])
      })

      const fetchedBeasts: Beast[] = []

      for (const account of accounts) {
        const mintStr = account.account.mint.toString()
        
        // Check cache first
        if (isCacheValid(mintStr)) {
          const cached = cache.current.get(mintStr)
          if (cached) {
            fetchedBeasts.push(cached.data)
            continue
          }
        }

        // Parse account data
        const beast = parseBeastAccount(account.account, account.account.mint)
        
        // Update cache
        cache.current.set(mintStr, {
          data: beast,
          timestamp: Date.now()
        })
        
        fetchedBeasts.push(beast)
        
        // Subscribe to real-time updates
        subscribeToAccount(account.account.mint, account.publicKey)
      }

      setBeasts(fetchedBeasts)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch beasts'
      setError(new Error(errorMessage))
      console.error('Error fetching beasts:', err)
    } finally {
      setLoading(false)
    }
  }, [program, publicKey, isCacheValid, parseBeastAccount, subscribeToAccount])

  /**
   * Fetch beasts on mount and when dependencies change
   */
  useEffect(() => {
    fetchBeasts()
    
    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeAll()
    }
  }, [fetchBeasts, unsubscribeAll])

  /**
   * Clear cache and subscriptions when wallet disconnects
   */
  useEffect(() => {
    if (!publicKey) {
      cache.current.clear()
      unsubscribeAll()
      setBeasts([])
    }
  }, [publicKey, unsubscribeAll])

  return {
    beasts,
    loading,
    error,
    refetch: fetchBeasts
  }
}
