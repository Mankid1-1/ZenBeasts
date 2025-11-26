import { useState, useEffect, useCallback } from 'react'
import { PublicKey } from '@solana/web3.js'
import { useProgram } from './useProgram'
import { getBeastPDA } from '../lib/anchor/setup'
import { Beast } from '../types/beast'

export function useBeast(mintAddress: string | null) {
  const { program } = useProgram()
  const [beast, setBeast] = useState<Beast | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchBeast = useCallback(async () => {
    if (!program || !mintAddress) return
    setLoading(true)
    setError(null)
    try {
      const mint = new PublicKey(mintAddress)
      const [pda] = getBeastPDA(mint)
      const acc: any = await program.account.beastAccount.fetch(pda)
      setBeast({
        mint: acc.mint.toString(),
        owner: acc.owner.toString(),
        traits: Array.from(acc.traits),
        rarityScore: Number(acc.rarityScore),
        lastActivity: Number(acc.lastActivity),
        activityCount: acc.activityCount,
        pendingRewards: Number(acc.pendingRewards),
        parents: Array.isArray(acc.parents) ? acc.parents.map((p: any) => p.toString()) : [],
        generation: typeof acc.generation === 'number' ? acc.generation : 0
      })
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }, [program, mintAddress])

  useEffect(() => { fetchBeast() }, [fetchBeast])
  return { beast, loading, error, refetch: fetchBeast }
}