export interface Beast {
  mint: string
  owner: string
  traits: number[]
  rarityScore: number
  lastActivity: number
  activityCount: number
  pendingRewards: number
  parents: string[]
  generation: number
  lastBreeding: number
  breedingCount: number
  metadataUri: string
}
