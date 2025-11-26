import { useState, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Keypair, SystemProgram, SYSVAR_RENT_PUBKEY, PublicKey, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token'
import { BN } from '@coral-xyz/anchor'
import { useProgram, executeProgramMethod } from './useProgram'
import { getBeastPDA, getProgramConfigPDA, getMetadataPDA, getMasterEditionPDA } from '../lib/anchor/setup'

/**
 * Hook for minting beast NFTs with fee estimation and progress indication
 * 
 * Features:
 * - Beast minting transaction construction (Requirement 1.1, 1.2, 1.3, 1.4, 1.5)
 * - Transaction fee estimation and display (Requirement 13.1)
 * - Loading state management with progress indication (Requirement 20.2)
 * - Error handling with user-friendly messages
 * - Automatic retry logic via executeProgramMethod
 * 
 * @returns {Object} mintBeast function, loading state, error state, and estimated fee
 */
export function useMintBeast() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const { program } = useProgram()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null)
  const [progress, setProgress] = useState<string>('')

  /**
   * Estimate transaction fee for minting a beast
   * Requirement 13.1: Display required SOL for transaction fees
   */
  const estimateFee = useCallback(async (): Promise<number | null> => {
    if (!program || !publicKey) return null
    
    try {
      setProgress('Estimating transaction fee...')
      
      // Create a dummy transaction to estimate fees
      const nftMint = Keypair.generate()
      const seed = new BN(Date.now())
      const [beastAccount] = getBeastPDA(nftMint.publicKey)
      const [config] = getProgramConfigPDA()
      const [metadata] = getMetadataPDA(nftMint.publicKey)
      const [masterEdition] = getMasterEditionPDA(nftMint.publicKey)
      const nftTokenAccount = await getAssociatedTokenAddress(nftMint.publicKey, publicKey)
      
      const instruction = await program.methods
        .createBeast(seed, 'Estimate', 'https://example.com')
        .accounts({
          beastAccount,
          config,
          nftMint: nftMint.publicKey,
          nftTokenAccount,
          payer: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
          metadata,
          masterEdition,
          tokenMetadataProgram: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
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
  }, [program, publicKey, connection])

  /**
   * Mint a new beast NFT
   * 
   * @param name - Beast name for metadata
   * @param uri - Metadata URI pointing to off-chain JSON
   * @returns Beast mint public key as string, or null on failure
   */
  const mintBeast = useCallback(async (name: string, uri: string): Promise<string | null> => {
    if (!program || !publicKey) {
      setError(new Error('Wallet not connected'))
      return null
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // Step 1: Generate mint keypair
      setProgress('Generating beast keypair...')
      const nftMint = Keypair.generate()
      const seed = new BN(Date.now())
      
      // Step 2: Derive PDAs
      setProgress('Deriving program addresses...')
      const [beastAccount] = getBeastPDA(nftMint.publicKey)
      const [config] = getProgramConfigPDA()
      const [metadata] = getMetadataPDA(nftMint.publicKey)
      const [masterEdition] = getMasterEditionPDA(nftMint.publicKey)
      const nftTokenAccount = await getAssociatedTokenAddress(nftMint.publicKey, publicKey)
      
      // Step 3: Construct and send transaction
      setProgress('Minting beast NFT...')
      const signature = await executeProgramMethod(async () => {
        return await program.methods
          .createBeast(seed, name, uri)
          .accounts({
            beastAccount,
            config,
            nftMint: nftMint.publicKey,
            nftTokenAccount,
            payer: publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
            metadata,
            masterEdition,
            tokenMetadataProgram: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
          })
          .signers([nftMint])
          .rpc()
      })
      
      // Step 4: Confirm transaction
      setProgress('Confirming transaction...')
      await connection.confirmTransaction(signature, 'confirmed')
      
      setProgress('Beast minted successfully!')
      setTimeout(() => setProgress(''), 2000)
      
      return nftMint.publicKey.toString()
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred'
      setError(new Error(`Failed to mint beast: ${errorMessage}`))
      setProgress('')
      return null
    } finally {
      setLoading(false)
    }
  }, [program, publicKey, connection])

  return { 
    mintBeast, 
    estimateFee,
    loading, 
    error,
    estimatedFee,
    progress
  }
}