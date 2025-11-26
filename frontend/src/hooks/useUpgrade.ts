import { useState, useCallback, useEffect, useRef } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction, LAMPORTS_PER_SOL, AccountInfo } from '@solana/web3.js'
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { BN } from '@coral-xyz/anchor'
import { useProgram, executeProgramMethod } from './useProgram'
import { getBeastPDA, getProgramConfigPDA } from '../lib/anchor/setup'
import { Beast } from '../types/beast'

/**
 * Hook for upgrading beast traits with cost calculation and real-time updates
 * 
 * Features:
 * - Client-side token balance validation (Requirement 4.1)
 * - Calculate scaled upgrade cost based on trait value (Requirement 17.2)
 * - Construct upgrade_trait transactions (Requirement 4.2, 4.3, 4.4, 4.5)
 * - Real-time beast updates via WebSocket subscription (Requirement 20.3)
 * - Automatic retry logic via executeProgramMethod
 * - Progress indication and error handling
 * 
 * @param zenMintStr - ZEN token mint address
 * @returns {Object} upgradeTrait function, cost calculation, loading state, error state, and estimated fee
 */
export function useUpgrade(zenMintStr?: string) {
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
   * Calculate scaled upgrade cost based on current trait value
   * Requirement 17.2: Cost = base_cost × (1 + trait_value / scaling_factor)
   * 
   * @param currentTraitValue - Current value of the trait (0-255)
   * @param baseCost - Base cost from program config
   * @param scalingFactor - Scaling factor from program config
   * @returns Upgrade cost in lamports
   */
  const calculateUpgradeCost = useCallback((
    currentTraitValue: number,
    baseCost: number,
    scalingFactor: number
  ): number => {
    // Cost formula: base_cost * (1 + trait_value / scaling_factor)
    const multiplier = 1 + (currentTraitValue / scalingFactor)
    return Math.floor(baseCost * multiplier)
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
        'confirmed'
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
   * Estimate transaction fee for upgrading a trait
   * Requirement 13.1: Display required SOL for transaction fees
   */
  const estimateFee = useCallback(async (mintStr: string, traitIndex: number): Promise<number | null> => {
    if (!program || !publicKey || !zenMintStr) return null
    
    try {
      setProgress('Estimating transaction fee...')
      
      const mint = new PublicKey(mintStr)
      const [beastAccount] = getBeastPDA(mint)
      const [config] = getProgramConfigPDA()
      const zenMint = new PublicKey(zenMintStr)
      const userTokenAccount = await getAssociatedTokenAddress(zenMint, publicKey)
      
      // Get config to find treasury
      const configData = await program.account.programConfig.fetch(config) as any
      const treasury = configData.treasury
      
      // Get treasury authority PDA
      const [treasuryAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from('treasury_authority')],
        program.programId
      )
      
      const instruction = await program.methods
        .upgradeTrait(traitIndex)
        .accounts({
          user: publicKey,
          beastAccount,
          config,
          userTokenAccount,
          treasury,
          treasuryAuthority,
          zenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
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
  }, [program, publicKey, connection, zenMintStr])

  /**
   * Upgrade a beast's trait
   * Requirements 4.1, 4.2, 4.3, 4.4, 4.5: Trait upgrade implementation
   * 
   * @param mintStr - Beast NFT mint address as string
   * @param traitIndex - Index of trait to upgrade (0-3 for core traits)
   * @param onUpdate - Optional callback for real-time updates
   * @returns Transaction signature or null on failure
   */
  const upgradeTrait = useCallback(async (
    mintStr: string,
    traitIndex: number,
    onUpdate?: (beast: Beast) => void
  ): Promise<string | null> => {
    if (!program || !publicKey) {
      setError(new Error('Wallet not connected'))
      return null
    }
    
    if (!zenMintStr) {
      setError(new Error('ZEN mint not configured'))
      return null
    }
    
    // Validate trait index
    if (traitIndex < 0 || traitIndex > 3) {
      setError(new Error('Invalid trait index. Must be 0-3 for core traits.'))
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
      const zenMint = new PublicKey(zenMintStr)
      const userTokenAccount = await getAssociatedTokenAddress(zenMint, publicKey)
      
      // Step 2: Fetch config and beast data
      setProgress('Fetching beast data...')
      const configData = await program.account.programConfig.fetch(config) as any
      const beastData = await program.account.beastAccount.fetch(beastAccount) as any
      
      const treasury = configData.treasury
      
      // Get treasury authority PDA
      const [treasuryAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from('treasury_authority')],
        program.programId
      )
      
      // Step 3: Calculate upgrade cost
      const currentTraitValue = beastData.traits[traitIndex]
      const baseCost = Number(configData.upgradeBaseCost)
      const scalingFactor = Number(configData.upgradeScalingFactor)
      const upgradeCost = calculateUpgradeCost(currentTraitValue, baseCost, scalingFactor)
      
      // Requirement 17.1: Validate trait is not at maximum
      if (currentTraitValue >= 255) {
        throw new Error('Trait is already at maximum value (255)')
      }
      
      // Step 4: Validate token balance (Requirement 4.1)
      setProgress('Validating token balance...')
      const tokenAccountInfo = await connection.getTokenAccountBalance(userTokenAccount)
      const userBalance = Number(tokenAccountInfo.value.amount)
      
      if (userBalance < upgradeCost) {
        throw new Error(
          `Insufficient ZEN tokens. Required: ${upgradeCost / 1e9} ZEN, Balance: ${userBalance / 1e9} ZEN`
        )
      }
      
      // Step 5: Subscribe to real-time updates if callback provided
      if (onUpdate) {
        subscribeToUpdates(mint, onUpdate)
      }
      
      // Step 6: Execute transaction with retry logic
      setProgress(`Upgrading trait ${traitIndex}...`)
      const signature = await executeProgramMethod(async () => {
        return await program.methods
          .upgradeTrait(traitIndex)
          .accounts({
            user: publicKey,
            beastAccount,
            config,
            userTokenAccount,
            treasury,
            treasuryAuthority,
            zenMint,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc()
      })
      
      // Step 7: Confirm transaction
      setProgress('Confirming transaction...')
      await connection.confirmTransaction(signature, 'confirmed')
      
      setProgress(`Trait upgraded successfully! Cost: ${upgradeCost / 1e9} ZEN`)
      setTimeout(() => setProgress(''), 3000)
      
      return signature
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred'
      setError(new Error(`Failed to upgrade trait: ${errorMessage}`))
      setProgress('')
      return null
    } finally {
      setLoading(false)
    }
  }, [program, publicKey, connection, zenMintStr, calculateUpgradeCost, subscribeToUpdates])

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
    upgradeTrait,
    calculateUpgradeCost,
    estimateFee,
    subscribeToUpdates,
    unsubscribe,
    loading, 
    error,
    estimatedFee,
    progress
  }
}
