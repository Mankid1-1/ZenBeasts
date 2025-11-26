'use client'
import { useState } from 'react'
import { useClaim } from '../../hooks/useClaim'

export default function ClaimPanel({ mint, onClaimed }: { mint: string, onClaimed?: () => void }) {
  const { claimRewards, loading, error } = useClaim()
  const [status, setStatus] = useState('')
  const onClick = async () => {
    const ok = await claimRewards(mint)
    setStatus(ok ? 'Claimed' : 'Error')
    if (ok) onClaimed?.()
  }
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={onClick} disabled={loading}>Claim Rewards</button>
      <span>{status}</span>
      {error && <span>{error.message}</span>}
    </div>
  )
}