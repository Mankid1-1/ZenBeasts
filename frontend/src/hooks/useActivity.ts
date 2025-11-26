import { useState, useCallback, useEffect, useRef } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction, LAMPORTS_PER_SOL, AccountInfo } from '@solana/web3.js'
import { useProgram, executeProgramMethod } from './useProgram'
import { getBeastPDA, getProgramConfigPDA } from '../lib/anchor/setup'
import { Beast } from '../types/beast'

/**
 * Hook for performing beast activities with real-time updates and fee estimation
 * 
 * Features:
 * - Activity initiation logic (Requirement 2.1, 2.2, 2.3, 2.4, 2.5)
 * - Client-side cooldown validation (Requirement 2.1)
 * - Transaction fee estimation (Requirement 13.1)
 * - Real-time account updates via WebSocket (Requirement 20.3)
 * - Automatic retry logic via executeProgramMethod
 * - Progress indication and error handling
 * 
 * @returns {Object} performActivity function, cooldown check, loading state, error state, and estimated fee
 */
export function useActivity() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const { program } = useProgram()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null)
  const [progress, setProgress] = useState<string>('')
  
  // Track subscriptions for cleanup
  const subscriptions = useRef<Map<string, number>>(new Map())

  /**
   * Check if a beast is currently in cooldown
   * Requirement 2.1: Validate cooldown status client-side
   * 
   * @param beast - Beast data with last_activity timestamp
   * @param cooldownDuration - Cooldown duration in seconds
   * @returns Object with inCooldown flag and remaining time
   */
  const checkCooldown = useCallback((beast: Beast, cooldownDuration: number): { 
    inCooldown: boolean
    remainingTime: number 
  } => {
    if (!beast.lastActivity || beast.lastActivity === 0) {
      return { inCooldown: false, remainingTime: 0 }
    }

    const currentTime = Math.floor(Date.now() / 1000)
    const cooldownEndTime = beast.lastActivity + cooldownDuration
    const remainingTime = Math.max(0, cooldownEndTime - currentTime)
    
    return {
      inCooldown: remainingTime > 0,
      remainingTime
    }
  }, [])

  /**
   * Subscribe to beast account changes for real-time updates
   * Requirement 20.3: Update UI within 2 seconds using WebSocket subscriptions
   * 
   * @param mint - Beast NFT mint address
   * @param onUpdate - Callback function when account data changes
   */
  const subscribeToUpdates = useCallback((
    mint: PublicKey,
    onUpdate: (beast: Beast) => void
  ) => {
    if (!connection || !program) return

    const mintStr = mint.toString()
    
    // Don't subscribe if already subscribed
    if (subscriptions.current.has(mintStr)) return

    try {
      const [beastPDA] = getBeastPDA(mint)
      
      const subscriptionId = connection.onAccountChange(
        beastPDA,
        (accountInfo: AccountInfo<Buffer>) => {
          try {
            // Decode the account data
            const accountData = program.account.beastAccount.coder.accounts.decode(
              'BeastAccount',
              accountInfo.data
            )
            
            // Parse into Beast type
            const beast: Beast = {
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
            
            onUpdate(beast)
          } catch (err) {
            console.error('Failed to decode beast account update:', err)
          }
        },
        { commitment: 'confirmed' }
      )
      
      subscriptions.current.set(mintStr, subscriptionId)
    } catch (err) {
      console.error('Failed to subscribe to account:', err)
    }
  }, [connection, program])

  /**
   * Unsubscribe from a specific beast's updates
   */
  const unsubscribe = useCallback((mintStr: string) => {
    if (!connection) return
    
    const subscriptionId = subscriptions.current.get(mintStr)
    if (subscriptionId !== undefined) {
      try {
        connection.removeAccountChangeListener(subscriptionId)
        subscriptions.current.delete(mintStr)
      } catch (err) {
        console.error('Failed to unsubscribe:', err)
      }
    }
  }, [connection])

  /**
   * Estimate transaction fee for performing an activity
   * Requirement 13.1: Display required SOL for transaction fees
   */
  const estimateFee = useCallback(async (mintStr: string): Promise<number | null> => {
    if (!program || !publicKey) return null
    
    try {
      setProgress('Estimating transaction fee...')
      
      const mint = new PublicKey(mintStr)
      const [beastAccount] = getBeastPDA(mint)
      const [config] = getProgramConfigPDA()
      
      const instruction = await program.methods
        .performActivity()
        .accounts({
          user: publicKey,
          beastAccount,
          config,
        })
        .instruction()
      
      const transaction = new Transaction().add(instruction)
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      transaction.feePayer = publicKey
      
      const fee = await connection.getFeeForMessage(
        transaction.compileMessage(),
        'confirmed'
      )
      
      const feeInSOL = fee.value ? fee.value / LAMPORTS_PER_SOL : 0.0005
      setEstimatedFee(feeInSOL)
      setProgress('')
      return feeInSOL
    } catch (e) {
      console.error('Fee estimation failed:', e)
      setProgress('')
      // Return a conservative estimate if calculation fails
      return 0.0005
    }
  }, [program, publicKey, connection])

  /**
   * Perform an activity for a beast
   * Requirements 2.1, 2.2, 2.3, 2.4, 2.5: Activity system implementation
   * 
   * @param mintStr - Beast NFT mint address as string
   * @param onUpdate - Optional callback for real-time updates
   * @returns Transaction signature or null on failure
   */
  const performActivity = useCallback(async (
    mintStr: string,
    onUpdate?: (beast: Beast) => void
  ): Promise<string | null> => {
    if (!program || !publicKey) {
      setError(new Error('Wallet not connected'))
      return null
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // Step 1: Derive accounts
      setProgress('Preparing transaction...')
      const mint = new PublicKey(mintStr)
      const [beastAccount] = getBeastPDA(mint)
      const [config] = getProgramConfigPDA()
      
      // Step 2: Fetch beast data for client-side validation
      setProgress('Validating cooldown...')
      const beastData = await program.account.beastAccount.fetch(beastAccount) as any
      const configData = await program.account.programConfig.fetch(config) as any
      
      const beast: Beast = {
        mint: mintStr,
        owner: beastData.owner.toString(),
        traits: Array.from(beastData.traits),
        rarityScore: Number(beastData.rarityScore),
        lastActivity: Number(beastData.lastActivity),
        activityCount: beastData.activityCount,
        pendingRewards: Number(beastData.pendingRewards),
        parents: [],
        generation: 0,
        lastBreeding: 0,
        breedingCount: 0,
        metadataUri: ''
      }
      
      // Client-side cooldown check (Requirement 2.1)
      const cooldownDuration = Number(configData.activityCooldown)
      const { inCooldown, remainingTime } = checkCooldown(beast, cooldownDuration)
      
      if (inCooldown) {
        const minutes = Math.ceil(remainingTime / 60)
        throw new Error(`Beast is in cooldown. Please wait ${minutes} more minute(s).`)
      }
      
      // Step 3: Subscribe to real-time updates if callback provided
      if (onUpdate) {
        subscribeToUpdates(mint, onUpdate)
      }
      
      // Step 4: Execute transaction with retry logic
      setProgress('Performing activity...')
      const signature = await executeProgramMethod(async () => {
        return await program.methods
          .performActivity()
          .accounts({
            user: publicKey,
            beastAccount,
            config,
          })
          .rpc()
      })
      
      // Step 5: Confirm transaction
      setProgress('Confirming transaction...')
      const latestBlockhash = await connection.getLatestBlockhash('confirmed')
      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }, 'confirmed')
      
      setProgress('Activity completed successfully!')
      setTimeout(() => setProgress(''), 2000)
      
      return signature
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred'
      setError(new Error(`Failed to perform activity: ${errorMessage}`))
      setProgress('')
      return null
    } finally {
      setLoading(false)
    }
  }, [program, publicKey, connection, checkCooldown, subscribeToUpdates])

  /**
   * Cleanup subscriptions on unmount
   */
  useEffect(() => {
    return () => {
      subscriptions.current.forEach((subscriptionId) => {
        try {
          connection.removeAccountChangeListener(subscriptionId)
        } catch (err) {
          console.error('Failed to cleanup subscription:', err)
        }
      })
      subscriptions.current.clear()
    }
  }, [connection])

  return { 
    performActivity,
    checkCooldown,
    estimateFee,
    subscribeToUpdates,
    unsubscribe,
    loading, 
    error,
    estimatedFee,
    progress
  }
}
