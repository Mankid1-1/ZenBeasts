import { useState, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useProgram, executeProgramMethod } from './useProgram'
import { getBeastPDA } from '../lib/anchor/setup'

/**
 * Hook for handling beast NFT transfers
 * 
 * Features:
 * - Update beast owner field after NFT transfer (Requirement 14.1)
 * - Preserve all trait values, activity history, and pending rewards (Requirement 14.3)
 * - Allow new owner to claim pending rewards (Requirement 14.4)
 * - Automatic retry logic via executeProgramMethod
 * - Progress indication and error handling
 * 
 * @returns {Object} updateOwner function, loading state, error state, and progress
 */
export function useTransfer() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const { program } = useProgram()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [progress, setProgress] = useState<string>('')

  /**
   * Update beast owner field after NFT transfer
   * Requirements 14.1, 14.3, 14.4: Beast transfer and marketplace integration
   * 
   * This function should be called after an NFT transfer has occurred
   * to sync the beast account owner field with the new NFT holder.
   * 
   * @param mintStr - Beast NFT mint address as string
   * @param newOwner - New owner's public key (optional, will be detected from NFT if not provided)
   * @returns Transaction signature or null on failure
   */
  const updateOwner = useCallback(async (
    mintStr: string,
    newOwner?: PublicKey
  ): Promise<string | null> => {
    if (!program || !publicKey) {
      setError(new Error('Wallet not connected'))
      return null
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // Step 1: Derive beast account
      setProgress('Preparing transfer update...')
      const mint = new PublicKey(mintStr)
      const [beastAccount] = getBeastPDA(mint)
      
      // Step 2: Fetch current beast data
      setProgress('Fetching beast data...')
      const beastData = await program.account.beastAccount.fetch(beastAccount) as any
      
      // Step 3: Determine new owner
      let actualNewOwner: PublicKey
      
      if (newOwner) {
        actualNewOwner = newOwner
      } else {
        // Detect new owner from NFT token account
        setProgress('Detecting new owner...')
        const tokenAccounts = await connection.getTokenLargestAccounts(mint)
        
        if (tokenAccounts.value.length === 0) {
          throw new Error('No token accounts found for this NFT')
        }
        
        const largestAccount = tokenAccounts.value[0]
        const accountInfo = await connection.getParsedAccountInfo(largestAccount.address)
        
        if (!accountInfo.value || !('parsed' in accountInfo.value.data)) {
          throw new Error('Failed to parse token account')
        }
        
        actualNewOwner = new PublicKey(accountInfo.value.data.parsed.info.owner)
      }
      
      // Validate that ownership has actually changed
      if (beastData.owner.toString() === actualNewOwner.toString()) {
        throw new Error('Beast owner is already set to this address')
      }
      
      // Step 4: Execute update transaction
      setProgress('Updating beast owner...')
      const signature = await executeProgramMethod(async () => {
        return await program.methods
          .updateBeastOwner()
          .accounts({
            beastAccount,
            currentOwner: beastData.owner,
            newOwner: actualNewOwner,
            nftMint: mint,
          })
          .rpc()
      })
      
      // Step 5: Confirm transaction
      setProgress('Confirming transaction...')
      await connection.confirmTransaction(signature, 'confirmed')
      
      // Verify the update
      const updatedBeastData = await program.account.beastAccount.fetch(beastAccount) as any
      
      console.log('Beast transfer details:')
      console.log('  Previous owner:', beastData.owner.toString())
      console.log('  New owner:', updatedBeastData.owner.toString())
      console.log('  Traits preserved:', JSON.stringify(Array.from(updatedBeastData.traits)))
      console.log('  Pending rewards preserved:', Number(updatedBeastData.pendingRewards))
      console.log('  Activity count preserved:', updatedBeastData.activityCount)
      
      setProgress('Beast owner updated successfully!')
      setTimeout(() => setProgress(''), 3000)
      
      return signature
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred'
      setError(new Error(`Failed to update beast owner: ${errorMessage}`))
      setProgress('')
      return null
    } finally {
      setLoading(false)
    }
  }, [program, publicKey, connection])

  /**
   * Verify that a beast's owner field matches the NFT holder
   * Useful for checking if an update is needed after a marketplace sale
   * 
   * @param mintStr - Beast NFT mint address as string
   * @returns Object with needsUpdate flag and current/expected owners
   */
  const checkOwnerSync = useCallback(async (mintStr: string): Promise<{
    needsUpdate: boolean
    currentOwner: string | null
    nftHolder: string | null
  }> => {
    if (!program || !connection) {
      return { needsUpdate: false, currentOwner: null, nftHolder: null }
    }
    
    try {
      const mint = new PublicKey(mintStr)
      const [beastAccount] = getBeastPDA(mint)
      
      // Get beast account owner
      const beastData = await program.account.beastAccount.fetch(beastAccount) as any
      const currentOwner = beastData.owner.toString()
      
      // Get NFT holder
      const tokenAccounts = await connection.getTokenLargestAccounts(mint)
      if (tokenAccounts.value.length === 0) {
        return { needsUpdate: false, currentOwner, nftHolder: null }
      }
      
      const largestAccount = tokenAccounts.value[0]
      const accountInfo = await connection.getParsedAccountInfo(largestAccount.address)
      
      if (!accountInfo.value || !('parsed' in accountInfo.value.data)) {
        return { needsUpdate: false, currentOwner, nftHolder: null }
      }
      
      const nftHolder = accountInfo.value.data.parsed.info.owner
      
      return {
        needsUpdate: currentOwner !== nftHolder,
        currentOwner,
        nftHolder
      }
    } catch (err) {
      console.error('Failed to check owner sync:', err)
      return { needsUpdate: false, currentOwner: null, nftHolder: null }
    }
  }, [program, connection])

  return { 
    updateOwner,
    checkOwnerSync,
    loading, 
    error,
    progress
  }
}
