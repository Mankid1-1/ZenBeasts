---
inclusion: always
---

# ZenBeasts Product Context

ZenBeasts is a Solana-based NFT game where players mint, upgrade, and manage digital creatures (beasts) with dynamic on-chain traits, cooldown-based activities, and a ZEN token economy.

## Core Game Mechanics

### Beast NFTs
- Each beast is a Metaplex-standard NFT with mutable on-chain state stored in a PDA
- Four core traits: **strength**, **agility**, **wisdom**, **vitality** (randomized at mint)
- **Rarity score** calculated from trait values (higher traits = rarer beast)
- Traits can be upgraded permanently using ZEN tokens, which recalculates rarity

### Activities System
- Beasts perform time-gated activities to earn rewards
- **Cooldown enforcement**: On-chain timestamps prevent activity spam
- Activities have different durations and reward rates
- Activity state (active/idle) and cooldown timers stored in beast account

### Rewards & Economy
- Rewards accumulate over time based on activity duration
- **Explicit claiming required**: Rewards don't auto-transfer
- ZEN token is the primary in-game currency
- Upgrade costs scale with current trait levels

### Breeding (Future)
- Combine two parent beasts to create offspring with inherited traits
- Breeding has cooldowns and costs ZEN tokens

## Critical Business Rules

When implementing or modifying features, enforce these rules:

1. **Cooldown Validation**: Always check `last_activity_time` + cooldown duration before allowing new activities
2. **Rarity Recalculation**: Any trait modification must trigger rarity score update
3. **Reward Calculation**: Use `Clock::get()?.unix_timestamp` for accurate time-based rewards
4. **Token Validation**: Verify ZEN token mint matches `NEXT_PUBLIC_ZEN_MINT` in all token operations
5. **Account Ownership**: Validate that the signer owns the beast NFT before state modifications
6. **State Consistency**: Beast account must reflect current activity status (active/idle) accurately

## User Experience Guidelines

### Wallet Integration
- Show clear connection status (disconnected, connecting, connected)
- Handle wallet errors gracefully with user-friendly messages
- Don't expose raw Solana error codes to users

### Beast Display
- Prominently show trait values and rarity score
- Use visual indicators for rarity tiers (common, rare, epic, legendary)
- Display cooldown timers with countdown or "Ready" status

### Activity Flow
- Show available activities with expected rewards
- Disable activity buttons during cooldown with time remaining
- Confirm successful activity start with visual feedback

### Rewards & Upgrades
- Display accumulated rewards before claiming
- Show upgrade costs and resulting trait changes before confirmation
- Provide transaction feedback (pending, success, error)

## Domain Terminology

Use consistent terminology across code, UI, and documentation:

- **Beast**: The NFT creature (not "monster", "pet", or "character")
- **Trait**: Individual attribute (strength, agility, wisdom, vitality)
- **Rarity**: Calculated score from traits (not "level" or "power")
- **Activity**: Time-gated action beasts perform (not "quest" or "task")
- **Cooldown**: Enforced waiting period between activities
- **Claim**: Explicit action to transfer accumulated rewards
- **Upgrade**: Permanent trait enhancement using ZEN tokens
- **Mint**: Create a new beast NFT

## Technical Constraints

- All timestamps use Unix epoch seconds (not milliseconds)
- Rarity calculations must happen on-chain for verifiability
- PDAs use consistent seed patterns: `[b"beast", mint.key()]` for beasts, `[b"config"]` for program config
- Activity cooldowns are enforced on-chain, not client-side
- Beast state changes emit events for off-chain indexing

## Development Priorities

When adding features or fixing bugs:

1. **On-chain validation first**: Never trust client-side checks alone
2. **Gas efficiency**: Minimize compute units in frequently-called instructions
3. **State consistency**: Ensure beast account state always reflects reality
4. **Error clarity**: Emit specific error codes with context
5. **Event emission**: Emit events for all state changes to support indexing
