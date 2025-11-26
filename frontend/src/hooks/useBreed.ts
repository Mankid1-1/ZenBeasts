import { useState, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { BN } from '@coral-xyz/anchor'
import { useProgram, executeProgramMethod } from './useProgram'
import { getBeastPDA, getProgramConfigPDA, getMetadataPDA, getMasterEditionPDA } from '../lib/anchor/setup'
import { Beast } from '../types/beast'

/**
 * Hook for breeding beasts with comprehensive validation
 * 
 * Features:
 * - Client-side parent ownership validation (Requirement 5.1)
 * - Breeding cooldown validation (Requirement 16.2)
 * - Breeding count limit validation (Requirement 16.4)
 * - Generation-scaled breeding cost calculation (Requirement 16.5)
 * - Construct breed_beasts transactions (Requirement 5.2, 5.3, 5.4, 5.5)
 * - Handle offspring creation with metadata (Requirement 12.1)
 * - Automatic retry logic via executeProgramMethod
 * - Progress indication and error handling
 * 
 * @param zenMintStr - ZEN token mint address
 * @returns {Object} breedBeasts function, validation functions, loading state, error state, and estimated fee
 */
export function useBreed(zenMintStr?: string) {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const { program } = useProgram()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null)
  const [progress, setProgress] = useState<string>('')

  /**
   * Check if a beast is in breeding cooldown
   * Requirement 16.2: Validate breeding cooldown has elapsed
   * 
   * @param beast - Beast data with last_breeding timestamp
   * @param cooldownDuration - Breeding cooldown duration in seconds
   * @returns Object with inCooldown flag and remaining time
   */
  const checkBreedingCooldown = useCallback((beast: Beast, cooldownDuration: number): { 
    inCooldown: boolean
    remainingTime: number 
  } => {
    if (!beast.lastBreeding || beast.lastBreeding === 0) {
      return { inCooldown: false, remainingTime: 0 }
    }

    const currentTime = Math.floor(Date.now() / 1000)
    const cooldownEndTime = beast.lastBreeding + cooldownDuration
    const remainingTime = Math.max(0, cooldownEndTime - currentTime)
    
    return {
      inCooldown: remainingTime > 0,
      remainingTime
    }
  }, [])

  /**
   * Calculate generation-scaled breeding cost
   * Requirement 16.5: Cost = base_cost × generation_multiplier^max_generation
   * 
   * @param parentAGeneration - Generation of first parent
   * @param parentBGeneration - Generation of second parent
   * @param baseCost - Base breeding cost from program config
   * @param generationMultiplier - Multiplier per generation (e.g., 150 = 1.5x)
   * @returns Breeding cost in lamports
   */
  const calculateBreedingCost = useCallback((
    parentAGeneration: number,
    parentBGeneration: number,
    baseCost: number,
    generationMultiplier: number
  ): number => {
    const maxGeneration = Math.max(parentAGeneration, parentBGeneration)
    const multiplier = Math.pow(generationMultiplier / 100, maxGeneration)
    return Math.floor(baseCost * multiplier)
  }, [])

  /**
   * Predict offspring traits based on parent traits
   * Requirement 5.3: Generate offspring trait values by averaging parent traits with randomized variation
   * 
   * @param parentATraits - Traits of first parent
   * @param parentBTraits - Traits of second parent
   * @returns Predicted offspring traits (approximate, actual will have random variation)
   */
  const predictOffspringTraits = useCallback((
    parentATraits: number[],
    parentBTraits: number[]
  ): number[] => {
    const offspring: number[] = []
    
    for (let i = 0; i < 4; i++) {
      const avg = Math.floor((parentATraits[i] + parentBTraits[i]) / 2)
      // Show range with ±20 variation
      offspring.push(avg)
    }
    
    return offspring
  }, [])

  /**
   * Estimate transaction fee for breeding
   * Requirement 13.1: Display required SOL for transaction fees
   */
  const estimateFee = useCallback(async (
    parentMintA: string,
    parentMintB: string
  ): Promise<number | null> => {
    if (!program || !publicKey || !zenMintStr) return null
    
    try {
      setProgress('Estimating transaction fee...')
      
      const parentA = new PublicKey(parentMintA)
      const parentB = new PublicKey(parentMintB)
      const [parentAAccount] = getBeastPDA(parentA)
      const [parentBAccount] = getBeastPDA(parentB)
      const [config] = getProgramConfigPDA()

      const childMint = Keypair.generate()
      const [childBeast] = getBeastPDA(childMint.publicKey)
      const [metadata] = getMetadataPDA(childMint.publicKey)
      const [masterEdition] = getMasterEditionPDA(childMint.publicKey)

      const childTokenAccount = await getAssociatedTokenAddress(childMint.publicKey, publicKey)
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

      const seed = new BN(Date.now())
      
      const instruction = await program.methods
        .breedBeasts(seed, 'Estimate', 'https://example.com')
        .accounts({
          user: publicKey,
          parentA: parentAAccount,
          parentB: parentBAccount,
          config,
          childBeast,
          childMint: childMint.publicKey,
          childTokenAccount,
          userTokenAccount,
          treasury,
          treasuryAuthority,
          zenMint,
          metadata,
          masterEdition,
          tokenMetadataProgram: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY
        })
        .instruction()
      
      const transaction = new Transaction().add(instruction)
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      transaction.feePayer = publicKey
      
      const fee = await connection.getFeeForMessage(
        transaction.compileMessage(),
        'confirmed'
      )
      
      const feeInSOL = fee.value ? fee.value / LAMPORTS_PER_SOL : 0.001
      setEstimatedFee(feeInSOL)
      setProgress('')
      return feeInSOL
    } catch (e) {
      console.error('Fee estimation failed:', e)
      setProgress('')
      // Return a conservative estimate if calculation fails
      return 0.001
    }
  }, [program, publicKey, connection, zenMintStr])

  /**
   * Breed two parent beasts to create offspring
   * Requirements 5.1, 5.2, 5.3, 5.4, 5.5: Beast breeding implementation
   * 
   * @param parentMintA - First parent beast NFT mint address
   * @param parentMintB - Second parent beast NFT mint address
   * @param name - Name for offspring beast
   * @param uri - Metadata URI for offspring beast
   * @returns Object with transaction signature and offspring mint address, or null on failure
   */
  const breedBeasts = useCallback(async (
    parentMintA: string,
    parentMintB: string,
    name: string,
    uri: string
  ): Promise<{ txSig: string; childMint: string } | null> => {
    if (!program || !publicKey) {
      setError(new Error('Wallet not connected'))
      return null
    }
    
    if (!zenMintStr) {
      setError(new Error('ZEN mint not configured'))
      return null
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // Step 1: Derive accounts
      setProgress('Preparing breeding transaction...')
      const parentA = new PublicKey(parentMintA)
      const parentB = new PublicKey(parentMintB)
      const [parentAAccount] = getBeastPDA(parentA)
      const [parentBAccount] = getBeastPDA(parentB)
      const [config] = getProgramConfigPDA()

      // Step 2: Fetch parent and config data for validation
      setProgress('Validating parent beasts...')
      const parentAData = await program.account.beastAccount.fetch(parentAAccount) as any
      const parentBData = await program.account.beastAccount.fetch(parentBAccount) as any
      const configData = await program.account.programConfig.fetch(config) as any
      
      // Requirement 5.1: Validate parent ownership
      if (parentAData.owner.toString() !== publicKey.toString()) {
        throw new Error('You do not own the first parent beast')
      }
      if (parentBData.owner.toString() !== publicKey.toString()) {
        throw new Error('You do not own the second parent beast')
      }
      
      // Create Beast objects for validation
      const parentABeast: Beast = {
        mint: parentMintA,
        owner: parentAData.owner.toString(),
        traits: Array.from(parentAData.traits),
        rarityScore: Number(parentAData.rarityScore),
        lastActivity: Number(parentAData.lastActivity),
        activityCount: parentAData.activityCount,
        pendingRewards: Number(parentAData.pendingRewards),
        parents: [],
        generation: typeof parentAData.generation === 'number' ? parentAData.generation : 0,
        lastBreeding: Number(parentAData.lastBreeding || 0),
        breedingCount: parentAData.breedingCount || 0,
        metadataUri: parentAData.metadataUri || ''
      }
      
      const parentBBeast: Beast = {
        mint: parentMintB,
        owner: parentBData.owner.toString(),
        traits: Array.from(parentBData.traits),
        rarityScore: Number(parentBData.rarityScore),
        lastActivity: Number(parentBData.lastActivity),
        activityCount: parentBData.activityCount,
        pendingRewards: Number(parentBData.pendingRewards),
        parents: [],
        generation: typeof parentBData.generation === 'number' ? parentBData.generation : 0,
        lastBreeding: Number(parentBData.lastBreeding || 0),
        breedingCount: parentBData.breedingCount || 0,
        metadataUri: parentBData.metadataUri || ''
      }
      
      // Requirement 16.2: Validate breeding cooldown
      const breedingCooldown = Number(configData.breedingCooldown)
      const parentACooldown = checkBreedingCooldown(parentABeast, breedingCooldown)
      const parentBCooldown = checkBreedingCooldown(parentBBeast, breedingCooldown)
      
      if (parentACooldown.inCooldown) {
        const hours = Math.ceil(parentACooldown.remainingTime / 3600)
        throw new Error(`First parent is in breeding cooldown. Please wait ${hours} more hour(s).`)
      }
      if (parentBCooldown.inCooldown) {
        const hours = Math.ceil(parentBCooldown.remainingTime / 3600)
        throw new Error(`Second parent is in breeding cooldown. Please wait ${hours} more hour(s).`)
      }
      
      // Requirement 16.4: Validate breeding count limit
      const maxBreedingCount = configData.maxBreedingCount
      if (parentABeast.breedingCount >= maxBreedingCount) {
        throw new Error(`First parent has reached maximum breeding count (${maxBreedingCount})`)
      }
      if (parentBBeast.breedingCount >= maxBreedingCount) {
        throw new Error(`Second parent has reached maximum breeding count (${maxBreedingCount})`)
      }
      
      // Step 3: Calculate breeding cost
      const baseCost = Number(configData.breedingBaseCost)
      const generationMultiplier = Number(configData.generationMultiplier)
      const breedingCost = calculateBreedingCost(
        parentABeast.generation,
        parentBBeast.generation,
        baseCost,
        generationMultiplier
      )
      
      // Validate token balance
      setProgress('Validating token balance...')
      const zenMint = new PublicKey(zenMintStr)
      const userTokenAccount = await getAssociatedTokenAddress(zenMint, publicKey)
      const tokenAccountInfo = await connection.getTokenAccountBalance(userTokenAccount)
      const userBalance = Number(tokenAccountInfo.value.amount)
      
      if (userBalance < breedingCost) {
        throw new Error(
          `Insufficient ZEN tokens. Required: ${breedingCost / 1e9} ZEN, Balance: ${userBalance / 1e9} ZEN`
        )
      }
      
      // Step 4: Create offspring accounts
      setProgress('Creating offspring beast...')
      const childMint = Keypair.generate()
      const [childBeast] = getBeastPDA(childMint.publicKey)
      const [metadata] = getMetadataPDA(childMint.publicKey)
      const [masterEdition] = getMasterEditionPDA(childMint.publicKey)
      const childTokenAccount = await getAssociatedTokenAddress(childMint.publicKey, publicKey)
      
      const treasury = configData.treasury
      
      // Get treasury authority PDA
      const [treasuryAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from('treasury_authority')],
        program.programId
      )

      const seed = new BN(Date.now())
      
      // Step 5: Execute transaction with retry logic
      setProgress('Breeding beasts...')
      const txSig = await executeProgramMethod(async () => {
        return await program.methods
          .breedBeasts(seed, name, uri)
          .accounts({
            user: publicKey,
            parentA: parentAAccount,
            parentB: parentBAccount,
            config,
            childBeast,
            childMint: childMint.publicKey,
            childTokenAccount,
            userTokenAccount,
            treasury,
            treasuryAuthority,
            zenMint,
            metadata,
            masterEdition,
            tokenMetadataProgram: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY
          })
          .signers([childMint])
          .rpc()
      })
      
      // Step 6: Confirm transaction
      setProgress('Confirming transaction...')
      const latestBlockhash = await connection.getLatestBlockhash('confirmed')
      await connection.confirmTransaction({
        signature: txSig,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }, 'confirmed')
      
      const offspringGeneration = Math.max(parentABeast.generation, parentBBeast.generation) + 1
      setProgress(`Successfully bred beasts! Offspring is Generation ${offspringGeneration}. Cost: ${breedingCost / 1e9} ZEN`)
      setTimeout(() => setProgress(''), 3000)
      
      return { txSig, childMint: childMint.publicKey.toBase58() }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred'
      setError(new Error(`Failed to breed beasts: ${errorMessage}`))
      setProgress('')
      return null
    } finally {
      setLoading(false)
    }
  }, [program, publicKey, connection, zenMintStr, checkBreedingCooldown, calculateBreedingCost])

  return { 
    breedBeasts,
    checkBreedingCooldown,
    calculateBreedingCost,
    predictOffspringTraits,
    estimateFee,
    loading, 
    error,
    estimatedFee,
    progress
  }
}
