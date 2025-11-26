'use client'
import { useState } from 'react'
import { useBreed } from '../../hooks/useBreed'

interface Props {
  primaryMint: string | null
  zenMint: string
}

export default function BreedingPanel({ primaryMint, zenMint }: Props) {
  const { breedBeasts, loading, error } = useBreed(zenMint)
  const [mateMint, setMateMint] = useState('')
  const [name, setName] = useState('ZenBeast Jr.')
  const [uri, setUri] = useState('https://example.com/child-metadata.json')
  const [zenAmount, setZenAmount] = useState(2)
  const [status, setStatus] = useState('')
  const [childMint, setChildMint] = useState<string | null>(null)

  const canBreed = !!primaryMint && !!mateMint && primaryMint !== mateMint

  const onBreed = async () => {
    if (!primaryMint) return
    const res = await breedBeasts(primaryMint, mateMint, name, uri, zenAmount)
    if (res) {
      setStatus('Bred new Beast!')
      setChildMint(res.childMint)
    } else {
      setStatus('Breeding failed')
    }
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ fontSize: 14, marginBottom: 4 }}>Breed a new ZenBeast from two parents.</div>
      <label style={{ fontSize: 12 }}>
        Primary Parent (selected)
        <input value={primaryMint || ''} readOnly style={{ width: '100%', fontSize: 12 }} />
      </label>
      <label style={{ fontSize: 12 }}>
        Mate Parent Mint
        <input
          value={mateMint}
          onChange={(e) => setMateMint(e.target.value)}
          placeholder='Enter second parent mint address'
          style={{ width: '100%' }}
        />
      </label>
      <label style={{ fontSize: 12 }}>
        Child Name
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%' }} />
      </label>
      <label style={{ fontSize: 12 }}>
        Child Metadata URI
        <input value={uri} onChange={(e) => setUri(e.target.value)} style={{ width: '100%' }} />
      </label>
      <label style={{ fontSize: 12 }}>
        $ZEN to Spend (tokens)
        <input
          type='number'
          value={zenAmount}
          onChange={(e) => setZenAmount(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </label>
      <button onClick={onBreed} disabled={loading || !canBreed}>
        {loading ? 'Breeding...' : 'Breed New Beast'}
      </button>
      {status && <div style={{ fontSize: 12 }}>{status}</div>}
      {childMint && (
        <div style={{ fontSize: 12 }}>Child Mint: {childMint}</div>
      )}
      {error && <div style={{ fontSize: 12, color: '#fecaca' }}>{error.message}</div>}
    </div>
  )
}
