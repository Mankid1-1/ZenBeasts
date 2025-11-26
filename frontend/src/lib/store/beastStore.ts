import { create } from 'zustand'
import { Beast } from '../../types/beast'

interface BeastState {
  beasts: Record<string, Beast>
  selectedBeast: string | null
  addBeast: (beast: Beast) => void
  updateBeast: (mint: string, updates: Partial<Beast>) => void
  removeBeast: (mint: string) => void
  selectBeast: (mint: string | null) => void
  getBeast: (mint: string) => Beast | undefined
}

export const useBeastStore = create<BeastState>((set, get) => ({
  beasts: {},
  selectedBeast: null,
  addBeast: beast => set(state => ({ beasts: { ...state.beasts, [beast.mint]: beast } })),
  updateBeast: (mint, updates) => set(state => ({ beasts: { ...state.beasts, [mint]: { ...state.beasts[mint], ...updates } } })),
  removeBeast: mint => set(state => { const next = { ...state.beasts }; delete next[mint]; return { beasts: next } }),
  selectBeast: mint => set({ selectedBeast: mint }),
  getBeast: mint => get().beasts[mint]
}))