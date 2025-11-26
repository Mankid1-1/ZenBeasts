import { useState, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction, TransactionInstruction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token'
import { useProgram, executeProgramMethod } from './useProgram'
import { getBeastPDA, getProgramConfigPDA } from '../lib/anchor/setup'
import { Beast } from '../types/beast'

/**
 * Hook for claiming beast rewards with batch support and fee optimization
 * 
 * Features:
 * - Calculate claimable rewards (Requirement 3.1)
 * - Support claiming from multiple beasts in single transaction (Requirement 13.2)
 * - Construct claim_rewards transactions with fee optimization (Requirement 3.2, 3.3, 3.4, 3.5)
 * - Update balance displays after claim
 * - Automatic retry logic via executeProgramMethod
 * - Progress indication and error handling
 * 
 * @returns {Object} claimRewards function, batch claim function, loading state, error state, and estimated fee
 */
export function useClaim() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const { program } = useProgram()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null)
  const [progress, setProgress] = useState<string>('')

  /**
   * Calculate claimable rewards for a beast
   * Requirement 3.1: Calculate total accumulated rewards based on activity duration
   * 
   * @param beast - Beast data with pending rewards and activity history
   * @param rewardRate - Reward rate from program config (tokens per second)
   * @returns Total claimable rewards in lamports
   */
  const calculateClaimableRewards = useCallback((beast: Beast, rewardRate: number): number => {
    if (!beast.lastActivity || beast.lastActivity === 0) {
      return beast.pendingRewards
    }

    const currentTime = Math.floor(Date.now() / 1000)
    const timeElapsed = Math.max(0, currentTime - beast.lastActivity)
    const calculatedRewards = timeElapsed * rewardRate
    
    return beast.pendingRewards + calculatedRewards
  }, [])

  /**
   * Estimate transaction fee for claiming rewards
   * Requirement 13.1: Display required SOL for transaction fees
   */
  const estimateFee = useCallback(async (mintStrs: string[]): Promise<number | null> => {
    if (!program || !publicKey) return null
    
    try {
      setProgress('Estimating transaction fee...')
      
      const instructions: TransactionInstruction[] = []
      
      for (const mintStr of mintStrs) {
        const mint = new PublicKey(mintStr)
        const [beastAccount] = getBeastPDA(mint)
        const [config] = getProgramConfigPDA()
        
        // Get treasury authority PDA
        const [treasuryAuthority] = PublicKey.findProgramAddressSync(
          [Buffer.from('treasury_authority')],
          program.programId
        )
        
        // Get config to find treasury and zen mint
        const configData = await program.account.programConfig.fetch(config) as any
        const treasury = configData.treasury
        const zenMint = configData.zenMint
        
        // Get user's token account
        const userTokenAccount = await getAssociatedTokenAddress(
          zenMint,
          publicKey
        )
        
        const instruction = await program.methods
          .claimRewards()
          .accounts({
            user: publicKey,
            beastAccount,
            config,
            treasury,
            userTokenAccount,
            treasuryAuthority,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .instruction()
        
        instructions.push(instruction)
      }
      
      const transaction = new Transaction().add(...instructions)
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      transaction.feePayer = publicKey
      
      const fee = await connection.getFeeForMessage(
        transaction.compileMessage(),
        'confirmed'
      )
      
      const feeInSOL = fee.value ? fee.value / LAMPORTS_PER_SOL : 0.0005 * mintStrs.length
      setEstimatedFee(feeInSOL)
      setProgress('')
      return feeInSOL
    } catch (e) {
      console.error('Fee estimation failed:', e)
      setProgress('')
      // Return a conservative estimate if calculation fails
      return 0.0005 * mintStrs.length
    }
  }, [program, publicKey, connection])

  /**
   * Claim rewards from a single beast
   * Requirements 3.1, 3.2, 3.3, 3.4, 3.5: Reward claiming implementation
   * 
   * @param mintStr - Beast NFT mint address as string
   * @param onBalanceUpdate - Optional callback when balance updates
   * @returns Transaction signature or null on failure
   */
  const claimRewards = useCallback(async (
    mintStr: string,
    onBalanceUpdate?: (newBalance: number) => void
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
      
      // Get treasury authority PDA
      const [treasuryAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from('treasury_authority')],
        program.programId
      )
      
      // Step 2: Fetch config and beast data
      setProgress('Fetching beast data...')
      const configData = await program.account.programConfig.fetch(config) as any
      const beastData = await program.account.beastAccount.fetch(beastAccount) as any
      
      const treasury = configData.treasury
      const zenMint = configData.zenMint
      
      // Calculate claimable rewards for validation
      const beast: Beast = {
        mint: mintStr,
        owner: beastData.owner.toString(),
        traits: [],
        rarityScore: 0,
        lastActivity: Number(beastData.lastActivity),
        activityCount: 0,
        pendingRewards: Number(beastData.pendingRewards),
        parents: [],
        generation: 0,
        lastBreeding: 0,
        breedingCount: 0,
        metadataUri: ''
      }
      
      const claimableRewards = calculateClaimableRewards(beast, Number(configData.rewardRate))
      
      // Requirement 3.5: Validate rewards are greater than zero
      if (claimableRewards === 0) {
        throw new Error('No rewards to claim for this beast')
      }
      
      // Get user's token account
      const userTokenAccount = await getAssociatedTokenAddress(
        zenMint,
        publicKey
      )
      
      // Step 3: Execute transaction with retry logic
      setProgress('Claiming rewards...')
      const signature = await executeProgramMethod(async () => {
        return await program.methods
          .claimRewards()
          .accounts({
            user: publicKey,
            beastAccount,
            config,
            treasury,
            userTokenAccount,
            treasuryAuthority,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc()
      })
      
      // Step 4: Confirm transaction
      setProgress('Confirming transaction...')
      const latestBlockhash = await connection.getLatestBlockhash('confirmed')
      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }, 'confirmed')
      
      // Step 5: Update balance display if callback provided
      if (onBalanceUpdate) {
        const tokenAccountInfo = await connection.getTokenAccountBalance(userTokenAccount)
        const newBalance = Number(tokenAccountInfo.value.amount)
        onBalanceUpdate(newBalance)
      }
      
      setProgress(`Successfully claimed ${claimableRewards / 1e9} ZEN!`)
      setTimeout(() => setProgress(''), 3000)
      
      return signature
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred'
      setError(new Error(`Failed to claim rewards: ${errorMessage}`))
      setProgress('')
      return null
    } finally {
      setLoading(false)
    }
  }, [program, publicKey, connection, calculateClaimableRewards])

  /**
   * Claim rewards from multiple beasts in a single transaction
   * Requirement 13.2: Batch multiple operations to minimize fees
   * 
   * @param mintStrs - Array of beast NFT mint addresses
   * @param onBalanceUpdate - Optional callback when balance updates
   * @returns Transaction signature or null on failure
   */
  const claimBatch = useCallback(async (
    mintStrs: string[],
    onBalanceUpdate?: (newBalance: number) => void
  ): Promise<string | null> => {
    if (!program || !publicKey) {
      setError(new Error('Wallet not connected'))
      return null
    }
    
    if (mintStrs.length === 0) {
      setError(new Error('No beasts provided for batch claim'))
      return null
    }
    
    setLoading(true)
    setError(null)
    
    try {
      setProgress(`Preparing batch claim for ${mintStrs.length} beasts...`)
      
      // Get config once for all claims
      const [config] = getProgramConfigPDA()
      const configData = await program.account.programConfig.fetch(config) as any
      const treasury = configData.treasury
      const zenMint = configData.zenMint
      
      // Get treasury authority PDA
      const [treasuryAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from('treasury_authority')],
        program.programId
      )
      
      // Get user's token account
      const userTokenAccount = await getAssociatedTokenAddress(
        zenMint,
        publicKey
      )
      
      // Build transaction with multiple claim instructions
      const transaction = new Transaction()
      let totalClaimable = 0
      const successfulBeasts: string[] = []
      const failedBeasts: { mint: string; reason: string }[] = []
      
      for (const mintStr of mintStrs) {
        try {
          const mint = new PublicKey(mintStr)
          const [beastAccount] = getBeastPDA(mint)
          
          // Fetch beast data to calculate claimable
          const beastData = await program.account.beastAccount.fetch(beastAccount) as any
          const beast: Beast = {
            mint: mintStr,
            owner: beastData.owner.toString(),
            traits: [],
            rarityScore: 0,
            lastActivity: Number(beastData.lastActivity),
            activityCount: 0,
            pendingRewards: Number(beastData.pendingRewards),
            parents: [],
            generation: 0,
            lastBreeding: 0,
            breedingCount: 0,
            metadataUri: ''
          }
          
          const claimable = calculateClaimableRewards(beast, Number(configData.rewardRate))
          if (claimable > 0) {
            totalClaimable += claimable
            
            const instruction = await program.methods
              .claimRewards()
              .accounts({
                user: publicKey,
                beastAccount,
                config,
                treasury,
                userTokenAccount,
                treasuryAuthority,
                tokenProgram: TOKEN_PROGRAM_ID,
              })
              .instruction()
            
            transaction.add(instruction)
            successfulBeasts.push(mintStr)
          } else {
            failedBeasts.push({ mint: mintStr, reason: 'No rewards to claim' })
          }
        } catch (e) {
          const reason = e instanceof Error ? e.message : 'Unknown error'
          failedBeasts.push({ mint: mintStr, reason })
        }
      }
      
      if (transaction.instructions.length === 0) {
        const reasons = failedBeasts.map(f => `${f.mint.slice(0, 8)}...: ${f.reason}`).join(', ')
        throw new Error(`No rewards to claim from any of the selected beasts. ${reasons}`)
      }
      
      // Log partial failures if any
      if (failedBeasts.length > 0) {
        console.warn(`Batch claim: ${failedBeasts.length} beast(s) skipped:`, failedBeasts)
      }
      
      setProgress(`Claiming ${totalClaimable / 1e9} ZEN from ${transaction.instructions.length} beasts...`)
      
      // Set recent blockhash and fee payer
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      transaction.feePayer = publicKey
      
      // Send and confirm transaction
      const signature = await executeProgramMethod(async () => {
        // Use wallet adapter's sendTransaction for proper signing
        if (!publicKey) throw new Error('Wallet not connected')
        
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
        transaction.recentBlockhash = blockhash
        transaction.feePayer = publicKey
        
        // Serialize and send
        const serialized = transaction.serialize({ requireAllSignatures: false })
        const sig = await connection.sendRawTransaction(serialized, {
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        })
        
        // Confirm with proper blockhash tracking
        await connection.confirmTransaction({
          signature: sig,
          blockhash,
          lastValidBlockHeight
        }, 'confirmed')
        
        return sig
      })
      
      // Update balance display if callback provided
      if (onBalanceUpdate) {
        const tokenAccountInfo = await connection.getTokenAccountBalance(userTokenAccount)
        const newBalance = Number(tokenAccountInfo.value.amount)
        onBalanceUpdate(newBalance)
      }
      
      const successMsg = `Successfully claimed ${totalClaimable / 1e9} ZEN from ${transaction.instructions.length} beast(s)!`
      const warningMsg = failedBeasts.length > 0 ? ` (${failedBeasts.length} skipped)` : ''
      setProgress(successMsg + warningMsg)
      setTimeout(() => setProgress(''), 3000)
      
      return signature
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred'
      setError(new Error(`Failed to batch claim rewards: ${errorMessage}`))
      setProgress('')
      return null
    } finally {
      setLoading(false)
    }
  }, [program, publicKey, connection, calculateClaimableRewards])

  return { 
    claimRewards,
    claimBatch,
    calculateClaimableRewards,
    estimateFee,
    loading, 
    error,
    estimatedFee,
    progress
  }
}
