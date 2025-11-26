# Design Document: ZenBeasts Gaming Network

## Overview

The ZenBeasts Gaming Network is a decentralized NFT gaming platform built on Solana that combines blockchain-based asset ownership with engaging gameplay mechanics. The system consists of three primary layers:

1. **On-Chain Program Layer**: An Anchor-based Solana program that manages beast NFTs, enforces game rules, handles token economics, and maintains verifiable state
2. **Frontend Application Layer**: A Next.js 14+ web application providing user interface for wallet connection, beast management, and gameplay interactions
3. **API Backend Layer**: An Express.js service for caching IDL data and providing optimized off-chain queries

The architecture prioritizes on-chain verifiability for critical game state while leveraging client-side computation for user experience optimization. All economic transactions (minting, upgrades, breeding, rewards) are executed as atomic Solana transactions, ensuring consistency and preventing exploits.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Wallet     │  │    Beast     │  │   Activity   │      │
│  │  Connection  │  │  Management  │  │   Controls   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│           │                │                  │              │
│           └────────────────┴──────────────────┘              │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │  React Hooks    │                        │
│                   │  (useProgram,   │                        │
│                   │   useMintBeast) │                        │
│                   └────────┬────────┘                        │
└────────────────────────────┼─────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │ Wallet Adapter  │
                    │   (@solana/     │
                    │ wallet-adapter) │
                    └────────┬────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                   Solana Blockchain                          │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │  ZenBeasts      │                        │
│                   │  Program        │                        │
│                   │  (Anchor)       │                        │
│                   └────────┬────────┘                        │
│                            │                                 │
│         ┌──────────────────┼──────────────────┐             │
│         │                  │                  │             │
│  ┌──────▼──────┐  ┌────────▼────────┐  ┌─────▼──────┐     │
│  │   Beast     │  │     Program     │  │  Metaplex  │     │
│  │  Accounts   │  │     Config      │  │  Metadata  │     │
│  │   (PDAs)    │  │     (PDA)       │  │  Accounts  │     │
│  └─────────────┘  └─────────────────┘  └────────────┘     │
└─────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                      API Backend                             │
│                   ┌────────▼────────┐                        │
│                   │  Express.js     │                        │
│                   │  IDL Cache      │                        │
│                   └─────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Beast Minting Flow:**
1. User initiates mint through frontend UI
2. Frontend generates new keypair for NFT mint
3. Transaction constructed with all required accounts (beast PDA, config PDA, metadata PDA, master edition PDA)
4. Solana program validates inputs, generates random traits, calculates rarity
5. Program creates beast account, mints NFT token, creates Metaplex metadata
6. Frontend receives confirmation and updates UI with new beast

**Activity Execution Flow:**
1. User selects beast and activity type
2. Frontend derives beast PDA from mint address
3. Transaction sent to program with activity type parameter
4. Program validates cooldown period has elapsed
5. Program updates beast account with new activity timestamp
6. Program emits ActivityPerformed event
7. Frontend polls for updated state and displays cooldown timer

**Reward Claiming Flow:**
1. User initiates claim for beast with accumulated rewards
2. Frontend calculates expected reward amount based on time elapsed
3. Transaction sent to program with beast and user token accounts
4. Program calculates actual rewards on-chain
5. Program transfers ZEN tokens from treasury to user
6. Program resets beast's pending_rewards to zero
7. Frontend updates balance displays

## Components and Interfaces

### On-Chain Program Components

#### State Accounts

**BeastAccount (PDA)**
```rust
pub struct BeastAccount {
    pub mint: Pubkey,              // NFT mint address
    pub owner: Pubkey,             // Current owner wallet
    pub traits: [u8; 10],          // 10 trait values (0-255 each)
    pub rarity_score: u64,         // Sum of core traits (0-3)
    pub last_activity: i64,        // Unix timestamp of last activity
    pub activity_count: u32,       // Total activities performed
    pub pending_rewards: u64,      // Unclaimed ZEN tokens
    pub parents: [Pubkey; 2],      // Parent mints (zero for Gen0)
    pub generation: u8,            // Generation number
    pub last_breeding: i64,        // Unix timestamp of last breeding
    pub breeding_count: u8,        // Total times this beast has bred
    pub metadata_uri: String,      // URI to off-chain JSON metadata
    pub bump: u8,                  // PDA bump seed
}
```

**Design Rationale**: Added `last_breeding` and `breeding_count` to support Requirement 16 (breeding restrictions and cooldowns). Added `metadata_uri` to support Requirement 12 (rich metadata and visual representation).

**ProgramConfig (PDA)**
```rust
pub struct ProgramConfig {
    pub authority: Pubkey,         // Admin authority
    pub zen_mint: Pubkey,          // ZEN token mint address
    pub treasury: Pubkey,          // Treasury for token operations
    pub activity_cooldown: i64,    // Cooldown duration in seconds
    pub breeding_cooldown: i64,    // Breeding cooldown duration
    pub max_breeding_count: u8,    // Maximum times a beast can breed
    pub upgrade_base_cost: u64,    // Base cost per trait upgrade
    pub upgrade_scaling_factor: u64, // Scaling factor for upgrade costs
    pub breeding_base_cost: u64,   // Base breeding cost
    pub generation_multiplier: u64, // Multiplier for generation-based costs
    pub reward_rate: u64,          // ZEN tokens per second of activity
    pub burn_percentage: u8,       // Percentage of tokens to burn
    pub total_minted: u64,         // Total beasts minted
    pub rarity_thresholds: [u64; 5], // Thresholds for rarity tiers
    pub pending_changes: Option<PendingConfigChanges>, // Delayed config changes
    pub governance_enabled: bool,  // Whether governance voting is active
    pub bump: u8,                  // PDA bump seed
}

pub struct PendingConfigChanges {
    pub reward_rate: Option<u64>,
    pub burn_percentage: Option<u8>,
    pub max_breeding_count: Option<u8>,
    pub activation_time: i64,      // Unix timestamp when changes activate
}
```

**Design Rationale**: Expanded configuration to support:
- Requirement 16: Breeding cooldowns and limits (`breeding_cooldown`, `max_breeding_count`)
- Requirement 17: Scaling upgrade costs (`upgrade_scaling_factor`)
- Requirement 16: Generation-based breeding costs (`generation_multiplier`)
- Requirement 12: Rarity tier categorization (`rarity_thresholds`)
- Requirement 15: Configurable reward rates (`reward_rate`)
- Requirement 22.3: Time-delayed critical parameter changes (`pending_changes`)
- Requirement 22.5: Governance voting system (`governance_enabled`)

#### Instructions

**initialize**
- Creates ProgramConfig account with all economic and timing parameters
- Creates treasury token account controlled by program
- Sets authority, cooldown parameters, economic constants, rarity thresholds
- One-time setup operation
- _Supports: Requirements 8, 11_

**create_beast**
- Generates random trait values using seed + clock (Requirement 18.4)
- Calculates rarity score from core traits
- Creates BeastAccount PDA
- Generates unique metadata URI
- Mints NFT using Metaplex Token Metadata with Master Edition
- Initializes beast with zero rewards, activity count, and breeding count
- Emits BeastMinted event with all beast details
- _Supports: Requirements 1, 12, 19_

**perform_activity**
- Validates cooldown period has elapsed (checked math, Requirement 18.5)
- Validates account ownership (Requirement 18.1)
- Updates last_activity timestamp using Clock sysvar (Requirement 18.4)
- Increments activity_count
- Calculates and adds pending_rewards based on time and reward_rate
- Emits ActivityPerformed event
- _Supports: Requirements 2, 15, 19_

**upgrade_trait**
- Validates user has sufficient ZEN tokens
- Validates trait index is valid (0-3 for core traits)
- Validates trait value < 255 (Requirement 17.1)
- Calculates scaled upgrade cost based on current trait value (Requirement 17.2)
- Transfers tokens from user to treasury
- Burns configured percentage of tokens (Requirement 11.3)
- Increments specified trait value using checked math
- Recalculates rarity_score
- Emits TraitUpgraded event with details
- _Supports: Requirements 4, 11, 17, 18, 19_

**claim_rewards**
- Calculates total pending rewards
- Validates rewards are greater than zero
- Validates token account ownership (Requirement 18.3)
- Transfers ZEN tokens from treasury to user
- Resets pending_rewards to zero
- Updates last_activity timestamp
- Emits RewardsClaimed event
- _Supports: Requirements 3, 11, 19_

**breed_beasts**
- Validates both parents owned by user (Requirement 18.1)
- Validates PDA derivations for both parent accounts (Requirement 18.2)
- Validates breeding cooldown has elapsed for both parents (Requirement 16.2)
- Validates neither parent has reached max breeding count (Requirement 16.4)
- Calculates generation-scaled breeding cost (Requirement 16.5)
- Validates sufficient ZEN tokens for breeding cost
- Generates offspring traits by averaging parents with random variation
- Creates new BeastAccount with inherited traits
- Mints new NFT for offspring with unique metadata URI
- Sets generation to max(parent generations) + 1 (Requirement 16.3)
- Updates parent breeding timestamps and counts
- Transfers breeding cost to treasury and burns percentage
- Emits BeastBred event with parent and offspring details
- _Supports: Requirements 5, 11, 12, 16, 18, 19_

**update_beast_owner**
- Validates NFT ownership has changed (for marketplace transfers)
- Updates beast account owner field to match new NFT holder
- Preserves all trait values, activity history, and pending rewards
- Emits BeastTransferred event
- _Supports: Requirement 14_

**update_config**
- Validates caller is program authority (Requirement 22.1)
- Validates new parameters are within acceptable ranges
- For critical parameters (reward_rate, burn_percentage, max_breeding_count), enforces time delay before changes take effect (Requirement 22.3)
- Stores pending configuration changes with activation timestamp
- Updates specified configuration parameters (or schedules them for delayed activation)
- Emits ConfigurationUpdated event with old and new values
- _Supports: Requirements 11, 22_

**transfer_authority**
- Validates caller is current program authority
- Requires multi-signature approval from current authority (Requirement 22.4)
- Transfers program authority to new address
- Emits AuthorityTransferred event
- _Supports: Requirement 22.4_

**execute_governance_proposal**
- Validates proposal has passed token holder vote (Requirement 22.5)
- Validates proposal execution timelock has elapsed
- Executes approved parameter changes
- Emits ProposalExecuted event
- _Supports: Requirement 22.5_

### Frontend Architecture Enhancements

#### Performance Optimization (Requirement 20)

**Loading States:**
```typescript
// Skeleton loading component
<BeastCardSkeleton /> // Displays while fetching beast data

// Progressive loading
const { beasts, loading, error } = useBeasts();
if (loading) return <LoadingSkeleton />;
if (error) return <ErrorDisplay error={error} />;
```

**Real-Time Updates:**
```typescript
// WebSocket subscription for account changes
useEffect(() => {
  const subscription = connection.onAccountChange(
    beastPDA,
    (accountInfo) => {
      const beast = program.account.beastAccount.coder.accounts.decode(
        'BeastAccount',
        accountInfo.data
      );
      updateBeastState(beast);
    },
    'confirmed'
  );
  return () => connection.removeAccountChangeListener(subscription);
}, [beastPDA]);
```

**Pagination:**
```typescript
// Virtual scrolling for large collections
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: beasts.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 350, // Beast card height
});
```

**Error Retry Logic with RPC Failover:**
```typescript
const fetchWithRetry = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
};

// RPC endpoint redundancy (Requirement 23.3)
const RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_RPC_URL,
  'https://api.devnet.solana.com',
  'https://solana-devnet.g.alchemy.com/v2/',
];

const fetchWithFallback = async (fetchFn) => {
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      return await fetchFn(endpoint);
    } catch (error) {
      continue; // Try next endpoint
    }
  }
  throw new Error('All RPC endpoints failed');
};
```

#### Mobile Responsiveness (Requirement 21)

**Responsive Layout:**
```typescript
// Tailwind CSS responsive classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {beasts.map(beast => <BeastCard key={beast.mint} beast={beast} />)}
</div>

// Mobile-specific components
const isMobile = useMediaQuery('(max-width: 768px)');
return isMobile ? <MobileBeastCard /> : <DesktopBeastCard />;
```

**Mobile Wallet Integration:**
```typescript
// Deep linking for mobile wallets
const wallets = useMemo(
  () => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    // Mobile wallet adapters with deep link support
  ],
  []
);
```

**Accessibility:**
```typescript
// ARIA labels and keyboard navigation
<button
  aria-label="Perform activity"
  onClick={handleActivity}
  onKeyPress={(e) => e.key === 'Enter' && handleActivity()}
  tabIndex={0}
>
  Start Activity
</button>

// Screen reader support
<span className="sr-only">Beast rarity score: {beast.rarityScore}</span>
```

### Frontend Components

#### React Hooks

**useProgram**
- Manages Anchor program instance
- Provides connection and wallet context
- Returns program object for instruction calls

**useMintBeast**
- Handles beast minting transaction construction
- Generates mint keypair and derives PDAs
- Manages loading and error states
- Returns mintBeast function

**useActivity**
- Manages activity initiation
- Validates cooldown status
- Constructs perform_activity transactions
- Polls for state updates

**useClaim**
- Calculates claimable rewards
- Constructs claim_rewards transactions
- Updates balance displays

**useUpgrade**
- Manages trait upgrade transactions
- Validates token balance
- Updates beast display after upgrade

**useBreed**
- Validates parent ownership
- Constructs breed_beasts transactions
- Handles offspring creation

#### UI Components

**BeastCard**
- Displays beast traits, rarity, and status
- Shows cooldown timer when active
- Provides action buttons (activity, upgrade, claim)

**MintForm**
- Input fields for beast name and metadata URI
- Mint button with loading state
- Error display

**ActivityPanel**
- Activity type selection
- Cooldown status display
- Activity initiation button

**UpgradePanel**
- Trait selection dropdown
- Cost display
- Upgrade confirmation button

**BreedingPanel**
- Parent beast selection
- Offspring trait preview
- Breeding cost and confirmation

**ClaimPanel**
- Accumulated rewards display
- Claim button
- Transaction status

## Data Models

### Beast Trait System

Beasts have 10 trait slots, each storing a u8 value (0-255). The first 4 traits are the core attributes used in gameplay:
- traits[0]: Strength
- traits[1]: Agility  
- traits[2]: Wisdom
- traits[3]: Vitality
- traits[4-9]: Reserved for future expansion

**Design Rationale**: While requirements specify four core traits, the system allocates 10 slots to allow future game mechanics without requiring account migrations. Currently, only the first 4 traits are generated during minting and used in rarity calculations.

**Rarity Calculation:**
```
rarity_score = sum(traits[0..4])  // Currently only core traits
```

Higher rarity scores indicate rarer beasts. Current maximum rarity is 1,020 (4 traits × 255). If future traits are activated, the calculation can be extended to include additional slots.

### Trait Generation

**Initial Minting:**
```rust
fn generate_trait(seed: u64, index: u8, clock: i64) -> u8 {
    let hash = hash(seed, index, clock);
    (hash % 256) as u8
}
```

**Breeding Inheritance:**
```rust
fn inherit_trait(parent1_trait: u8, parent2_trait: u8, variation: i8) -> u8 {
    let avg = (parent1_trait as u16 + parent2_trait as u16) / 2;
    let result = (avg as i16 + variation as i16).clamp(0, 255);
    result as u8
}
```

Variation is a random value between -20 and +20, allowing offspring to differ from exact parent averages.

### Reward Accumulation

Rewards accumulate linearly based on time spent in activity:

```
pending_rewards += (current_time - last_activity) * reward_rate
```

The reward_rate is configured in ProgramConfig and represents ZEN tokens per second of activity.

**Design Rationale**: The system uses `last_activity` timestamp for both cooldown tracking and reward calculation. When rewards are claimed:
1. The claim instruction calculates total pending rewards
2. Transfers tokens to the user
3. Resets `pending_rewards` to zero
4. Updates `last_activity` to current time (serving as the "last claim timestamp")

This dual-purpose timestamp approach simplifies the account structure while maintaining all required functionality per Requirements 2.2, 3.3, and 3.4.

### Cooldown Mechanics

After any activity, a beast enters cooldown:

```rust
fn can_perform_activity(beast: &BeastAccount, current_time: i64, cooldown: i64) -> bool {
    current_time - beast.last_activity >= cooldown
}

fn get_cooldown_end_time(beast: &BeastAccount, cooldown: i64) -> i64 {
    beast.last_activity + cooldown
}
```

**Design Rationale**: The cooldown end timestamp is calculated on-demand rather than stored separately. This approach:
- Reduces storage requirements (no additional field needed)
- Prevents desynchronization between stored timestamps
- Allows dynamic cooldown adjustments via ProgramConfig updates

Cooldown duration is global and configured in ProgramConfig (typically 3600 seconds / 1 hour). The frontend calculates remaining cooldown time as `cooldown_end_time - current_time` for display purposes.

## Token Economics and Treasury Design

### Treasury Management (Requirement 11)

**Treasury Account Structure:**
- SPL Token Account owned by program PDA
- Holds ZEN tokens for reward distribution
- Receives tokens from upgrades and breeding operations
- Controlled exclusively by program instructions

**Token Flow:**
```
User Upgrades/Breeding → Treasury (with burn) → Reward Claims → Users
```

**Burn Mechanism:**
When tokens are transferred to treasury:
```rust
let burn_amount = (cost * burn_percentage) / 100;
let treasury_amount = cost - burn_amount;
// Transfer treasury_amount to treasury
// Burn burn_amount permanently
```

**Economic Sustainability:**
- Configuration updates must maintain: `reward_rate * expected_activity_time < average_cost_per_beast`
- Treasury balance monitoring to prevent reward claim failures
- Burn percentage creates deflationary pressure

### Metadata and Visual System (Requirement 12)

**Metadata JSON Structure:**
```json
{
  "name": "ZenBeast #1234",
  "symbol": "ZBEAST",
  "description": "A unique ZenBeast with dynamic traits",
  "image": "https://arweave.net/...",
  "attributes": [
    {"trait_type": "Strength", "value": 142},
    {"trait_type": "Agility", "value": 198},
    {"trait_type": "Wisdom", "value": 87},
    {"trait_type": "Vitality", "value": 165},
    {"trait_type": "Rarity Score", "value": 592},
    {"trait_type": "Rarity Tier", "value": "Rare"},
    {"trait_type": "Generation", "value": 0},
    {"trait_type": "Minted", "value": 1699564800}
  ],
  "properties": {
    "category": "image",
    "files": [{"uri": "https://arweave.net/...", "type": "image/png"}]
  }
}
```

**Rarity Tier Calculation:**
```rust
fn get_rarity_tier(rarity_score: u64, thresholds: &[u64; 5]) -> &str {
    if rarity_score >= thresholds[4] { "Legendary" }
    else if rarity_score >= thresholds[3] { "Epic" }
    else if rarity_score >= thresholds[2] { "Rare" }
    else if rarity_score >= thresholds[1] { "Uncommon" }
    else { "Common" }
}
```

**Default Thresholds:**
- Common: 0-400
- Uncommon: 401-600
- Rare: 601-800
- Epic: 801-950
- Legendary: 951-1020

### Transaction Fee Optimization (Requirement 13)

**Compute Unit Optimization:**
- Use `ComputeBudgetProgram` to set optimal compute units
- Batch multiple operations when possible
- Minimize account lookups and cross-program invocations

**Fee Estimation:**
```typescript
const estimatedFee = await connection.getFeeForMessage(message);
const priorityFee = userWantsFast ? 0.0001 * LAMPORTS_PER_SOL : 0;
const totalFee = estimatedFee + priorityFee;
```

**Batching Strategy:**
- Claim rewards from multiple beasts in single transaction
- Upgrade multiple traits in single transaction (if same beast)
- Not applicable for minting or breeding (require unique accounts)

### Activity Type System (Requirement 15)

**Activity Type Enum:**
```rust
pub enum ActivityType {
    Training,    // Standard rewards, 1hr cooldown
    Exploring,   // Higher rewards, 2hr cooldown
    Resting,     // Lower rewards, 30min cooldown
    Battling,    // Highest rewards, 4hr cooldown
}
```

**Activity Configuration:**
```rust
pub struct ActivityConfig {
    pub reward_multiplier: u64,  // Multiplier on base reward_rate
    pub cooldown_duration: i64,  // Cooldown in seconds
}
```

**Implementation Approach:**
- Store activity configs in ProgramConfig or separate ActivityConfig account
- Pass activity type as parameter to perform_activity instruction
- Calculate rewards as: `base_reward_rate * activity_multiplier * time_elapsed`

### Security Measures (Requirement 18)

**Authorization Checks:**
```rust
// Verify signer
require!(ctx.accounts.user.is_signer, ErrorCode::Unauthorized);

// Verify ownership
require!(
    beast.owner == ctx.accounts.user.key(),
    ErrorCode::Unauthorized
);

// Verify PDA derivation
let (expected_pda, expected_bump) = Pubkey::find_program_address(
    &[b"beast", mint.key().as_ref()],
    ctx.program_id
);
require!(beast.key() == expected_pda, ErrorCode::InvalidPDA);
require!(beast.bump == expected_bump, ErrorCode::InvalidPDA);
```

**Checked Math:**
```rust
// Use checked arithmetic to prevent overflow
let new_rewards = pending_rewards
    .checked_add(calculated_rewards)
    .ok_or(ErrorCode::ArithmeticOverflow)?;

let new_trait_value = trait_value
    .checked_add(1)
    .ok_or(ErrorCode::TraitMaxReached)?;
```

**Clock Usage:**
```rust
// Always use Clock sysvar for timestamps
let clock = Clock::get()?;
let current_time = clock.unix_timestamp;
```

### Event System (Requirement 19)

**Event Definitions:**
```rust
#[event]
pub struct BeastMinted {
    pub mint: Pubkey,
    pub owner: Pubkey,
    pub traits: [u8; 4],
    pub rarity_score: u64,
    pub generation: u8,
    pub timestamp: i64,
}

#[event]
pub struct ActivityPerformed {
    pub beast: Pubkey,
    pub activity_type: ActivityType,
    pub timestamp: i64,
    pub rewards_earned: u64,
}

#[event]
pub struct RewardsClaimed {
    pub beast: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct TraitUpgraded {
    pub beast: Pubkey,
    pub trait_index: u8,
    pub old_value: u8,
    pub new_value: u8,
    pub cost_paid: u64,
    pub new_rarity: u64,
}

#[event]
pub struct BeastBred {
    pub parent1: Pubkey,
    pub parent2: Pubkey,
    pub offspring: Pubkey,
    pub generation: u8,
    pub cost_paid: u64,
}

#[event]
pub struct BeastTransferred {
    pub beast: Pubkey,
    pub from: Pubkey,
    pub to: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ConfigurationUpdated {
    pub parameter: String,
    pub old_value: u64,
    pub new_value: u64,
    pub updated_by: Pubkey,
    pub activation_time: Option<i64>, // For delayed changes
}

#[event]
pub struct AuthorityTransferred {
    pub old_authority: Pubkey,
    pub new_authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct GovernanceProposalExecuted {
    pub proposal_id: u64,
    pub parameter: String,
    pub new_value: u64,
    pub executed_by: Pubkey,
}

#[event]
pub struct BeastAccountRepaired {
    pub beast: Pubkey,
    pub old_rarity: u64,
    pub new_rarity: u64,
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Minting Properties

**Property 1: Trait generation bounds**
*For any* beast minting operation, all generated trait values should be within the valid range [0, 255].
**Validates: Requirements 1.1**

**Property 2: Rarity score invariant**
*For any* beast (newly minted or after trait modification), the rarity_score should always equal the sum of the four core trait values (traits[0..4]).
**Validates: Requirements 1.2, 4.4**

**Property 3: Metadata account creation**
*For any* minted beast, a Metaplex Token Metadata account should exist with attributes matching the beast's on-chain traits.
**Validates: Requirements 1.3**

**Property 4: Initial state correctness**
*For any* newly minted beast, the pending_rewards field should be zero and the owner field should match the minter's wallet address.
**Validates: Requirements 1.4, 1.5**

### Activity Properties

**Property 5: Cooldown enforcement**
*For any* beast in cooldown period, attempting to perform an activity should be rejected with an error.
**Validates: Requirements 2.1, 2.4**

**Property 6: Activity timestamp update**
*For any* successful activity operation, the beast's last_activity field should be updated to the current blockchain timestamp.
**Validates: Requirements 2.2**

**Property 7: Reward accumulation**
*For any* beast with activity history, the pending_rewards should equal (current_time - last_activity) × reward_rate.
**Validates: Requirements 2.5, 3.1**

### Reward Claiming Properties

**Property 8: Token transfer correctness**
*For any* successful reward claim, the user's ZEN token balance should increase by exactly the claimed amount.
**Validates: Requirements 3.2**

**Property 9: Reward reset after claim**
*For any* successful reward claim, the beast's pending_rewards should be reset to zero.
**Validates: Requirements 3.3**

**Property 10: Zero reward rejection**
*For any* beast with pending_rewards = 0, attempting to claim rewards should be rejected with an appropriate error.
**Validates: Requirements 3.5**

### Trait Upgrade Properties

**Property 11: Insufficient balance rejection**
*For any* upgrade or breeding attempt where user balance < required cost, the operation should be rejected with an error indicating insufficient funds.
**Validates: Requirements 4.1, 5.2**

**Property 12: Token deduction correctness**
*For any* successful upgrade or breeding operation, the user's ZEN token balance should decrease by exactly the operation cost.
**Validates: Requirements 4.2, 5.4**

**Property 13: Trait increment correctness**
*For any* successful trait upgrade, the specified trait value should increase by exactly 1.
**Validates: Requirements 4.3**

### Breeding Properties

**Property 14: Parent ownership validation**
*For any* breeding attempt, if either parent beast is not owned by the user, the operation should be rejected with an authorization error.
**Validates: Requirements 5.1**

**Property 15: Trait inheritance bounds**
*For any* offspring created through breeding, each trait value should be within the range [avg(parent_traits) - 20, avg(parent_traits) + 20], clamped to [0, 255].
**Validates: Requirements 5.3**

**Property 16: Offspring creation**
*For any* successful breeding operation, a new beast NFT should be created with generation = max(parent1.generation, parent2.generation) + 1.
**Validates: Requirements 5.5**

### Frontend Properties

**Property 17: Wallet address display**
*For any* connected wallet, the displayed wallet address should match the actual connected wallet's public key.
**Validates: Requirements 6.3**

**Property 18: Beast ownership query**
*For any* connected wallet, all displayed beasts should have owner field equal to the wallet's public key.
**Validates: Requirements 6.4**

**Property 19: State cleanup on disconnect**
*For any* wallet disconnect operation, all user-specific data (beasts, balances, addresses) should be cleared from frontend state.
**Validates: Requirements 6.5**

**Property 20: Trait display completeness**
*For any* displayed beast, the rendered output should contain all core trait values (strength, agility, wisdom, vitality) and the rarity score.
**Validates: Requirements 7.1, 7.2**

**Property 21: Cooldown display accuracy**
*For any* beast in cooldown, the displayed remaining time should equal cooldown_end_time - current_time.
**Validates: Requirements 7.3**

**Property 22: Reward display accuracy**
*For any* beast with accumulated rewards, the displayed claimable amount should match the beast's pending_rewards value.
**Validates: Requirements 7.4**

### Configuration Properties

**Property 23: Configuration parameter validation**
*For any* configuration operation, all numeric parameters (costs, durations, rates) should be validated to be within acceptable ranges before being set.
**Validates: Requirements 8.5**

### Error Handling Properties

**Property 24: Insufficient funds error content**
*For any* operation failure due to insufficient funds, the error message should contain both the required amount and the user's current balance.
**Validates: Requirements 9.1**

**Property 25: Cooldown error content**
*For any* operation failure due to cooldown restrictions, the error message should contain the remaining cooldown time.
**Validates: Requirements 9.2**

**Property 26: Authorization error content**
*For any* operation failure due to invalid ownership, the error message should indicate an authorization failure.
**Validates: Requirements 9.3**

**Property 27: Validation error content**
*For any* operation failure due to invalid input parameters, the error message should describe the specific validation failure.
**Validates: Requirements 9.4**

**Property 28: Error translation**
*For any* Solana program error received by the frontend, the system should translate the technical error code into a user-friendly message.
**Validates: Requirements 9.5**

### State Consistency Properties

**Property 29: On-chain data freshness**
*For any* frontend query for beast data, the returned data should match the current on-chain state of the beast account.
**Validates: Requirements 10.2**

**Property 30: Transaction atomicity**
*For any* failed transaction, no partial state changes should be persisted to any beast account or program configuration.
**Validates: Requirements 10.3, 10.4**

### Treasury and Economics Properties

**Property 31: Treasury token flow**
*For any* upgrade or breeding operation, the treasury balance should increase by (cost - burn_amount) and total supply should decrease by burn_amount.
**Validates: Requirements 11.2, 11.3**

**Property 32: Reward claim validity**
*For any* reward claim, the treasury balance should be sufficient to cover the claim amount before the transaction executes.
**Validates: Requirement 11.4**

**Property 33: Economic parameter validation**
*For any* configuration update, the new parameters should satisfy economic sustainability constraints.
**Validates: Requirement 11.5**

### Metadata Properties

**Property 34: Metadata URI uniqueness**
*For any* two different beasts, their metadata URIs should be unique.
**Validates: Requirement 12.1**

**Property 35: Metadata attribute consistency**
*For any* beast, the on-chain trait values should match the trait values in the metadata JSON.
**Validates: Requirement 12.2**

**Property 36: Rarity tier correctness**
*For any* beast, the rarity tier in metadata should match the tier calculated from rarity_score and configured thresholds.
**Validates: Requirement 12.5**

### Transaction Fee Properties

**Property 37: Fee estimation accuracy**
*For any* transaction, the estimated fee should be within 10% of the actual fee charged.
**Validates: Requirement 13.1**

**Property 38: Insufficient SOL error clarity**
*For any* transaction failure due to insufficient SOL, the error message should specify the exact SOL amount needed.
**Validates: Requirement 13.3**

### Transfer and Marketplace Properties

**Property 39: Owner synchronization**
*For any* beast NFT transfer, the beast account owner field should be updated to match the new NFT holder.
**Validates: Requirement 14.1**

**Property 40: Transfer state preservation**
*For any* beast transfer, all trait values, activity_count, pending_rewards, and generation should remain unchanged.
**Validates: Requirement 14.3**

**Property 41: Reward transferability**
*For any* beast with pending_rewards > 0, the new owner after transfer should be able to claim those rewards.
**Validates: Requirement 14.4**

### Breeding Restriction Properties

**Property 42: Breeding cooldown enforcement**
*For any* beast with (current_time - last_breeding) < breeding_cooldown, breeding attempts should be rejected.
**Validates: Requirement 16.2**

**Property 43: Breeding count limit**
*For any* beast with breeding_count >= max_breeding_count, breeding attempts should be rejected.
**Validates: Requirement 16.4**

**Property 44: Generation-based cost scaling**
*For any* breeding operation, the cost should equal breeding_base_cost × generation_multiplier^max(parent_generations).
**Validates: Requirement 16.5**

### Trait Upgrade Limit Properties

**Property 45: Maximum trait value enforcement**
*For any* trait with value = 255, upgrade attempts should be rejected with TraitMaxReached error.
**Validates: Requirement 17.1**

**Property 46: Scaled upgrade cost calculation**
*For any* trait upgrade, the cost should equal upgrade_base_cost × (1 + trait_value / upgrade_scaling_factor).
**Validates: Requirement 17.2**

### Security Properties

**Property 47: Signer authorization**
*For any* instruction call, all required signers should be verified before state modifications occur.
**Validates: Requirement 18.1**

**Property 48: PDA validation**
*For any* PDA account access, the derived address should match the expected derivation from seeds and program ID.
**Validates: Requirement 18.2**

**Property 49: Token account ownership**
*For any* token transfer, the token account owner should be verified before the transfer executes.
**Validates: Requirement 18.3**

**Property 50: Arithmetic safety**
*For any* arithmetic operation, overflow or underflow should result in transaction failure rather than wrapping.
**Validates: Requirement 18.5**

### Event Emission Properties

**Property 51: Mint event completeness**
*For any* successful beast minting, a BeastMinted event should be emitted containing all beast attributes.
**Validates: Requirement 19.1**

**Property 52: Activity event emission**
*For any* successful activity operation, an ActivityPerformed event should be emitted with beast ID and timestamp.
**Validates: Requirement 19.2**

**Property 53: Claim event emission**
*For any* successful reward claim, a RewardsClaimed event should be emitted with amount and recipient.
**Validates: Requirement 19.3**

**Property 54: Breeding event emission**
*For any* successful breeding, a BeastBred event should be emitted with parent and offspring IDs.
**Validates: Requirement 19.4**

**Property 55: Upgrade event emission**
*For any* successful trait upgrade, a TraitUpgraded event should be emitted with trait details and cost.
**Validates: Requirement 19.5**

### Frontend Performance Properties

**Property 56: Loading state display**
*For any* data fetch operation, a loading skeleton should be displayed until data is available.
**Validates: Requirement 20.1**

**Property 57: Transaction progress indication**
*For any* submitted transaction, progress status should be displayed and updated until confirmation.
**Validates: Requirement 20.2**

**Property 58: Real-time update latency**
*For any* on-chain state change, the UI should reflect the change within 2 seconds.
**Validates: Requirement 20.3**

**Property 59: Collection pagination**
*For any* beast collection with more than 50 beasts, pagination or virtual scrolling should be implemented.
**Validates: Requirement 20.4**

### Mobile and Accessibility Properties

**Property 60: Mobile responsive layout**
*For any* screen width < 768px, the layout should adapt to single-column mobile-optimized display.
**Validates: Requirement 21.1**

**Property 61: Mobile wallet support**
*For any* wallet connection on mobile, deep linking to mobile wallet apps should be supported.
**Validates: Requirement 21.2**

**Property 62: Keyboard navigation**
*For any* interactive element, keyboard navigation should be fully functional without requiring mouse input.
**Validates: Requirement 21.5**

### Governance Properties

**Property 63: Authority verification**
*For any* configuration update, the caller should be verified as the program authority before changes are applied.
**Validates: Requirement 22.1**

**Property 64: Configuration event emission**
*For any* parameter update, a ConfigurationUpdated event should be emitted with old and new values.
**Validates: Requirement 22.2**

**Property 65: Time delay enforcement**
*For any* critical parameter change, the change should not take effect until the configured time delay has elapsed.
**Validates: Requirement 22.3**

**Property 66: Multi-signature authority transfer**
*For any* authority transfer, the operation should require approval from multiple signers.
**Validates: Requirement 22.4**

**Property 67: Governance proposal execution**
*For any* governance proposal execution, the proposal should have passed token holder voting before being executed.
**Validates: Requirement 22.5**

### Backup and Recovery Properties

**Property 68: RPC endpoint redundancy**
*For any* on-chain data query, if one RPC endpoint fails, the system should automatically retry with an alternative endpoint.
**Validates: Requirement 23.3**

**Property 69: Account backward compatibility**
*For any* program upgrade, existing beast accounts should remain readable and functional without migration.
**Validates: Requirement 23.4**

## Backup and Recovery Mechanisms

### Wallet Recovery (Requirement 23.1)

**Documentation Approach:**
The system provides comprehensive wallet recovery documentation covering:
- Seed phrase backup and storage best practices
- Hardware wallet recovery procedures
- Multi-device wallet synchronization
- Emergency recovery contacts and procedures

**Design Rationale**: Wallet recovery is handled at the wallet provider level (Phantom, Solflare, etc.), not by the ZenBeasts program. The system's responsibility is to provide clear documentation and guidance to users on proper wallet security practices.

**Recovery Documentation Includes:**
- Step-by-step recovery guides for each supported wallet
- Common recovery scenarios and solutions
- Security best practices for seed phrase storage
- Links to official wallet provider recovery resources

### Alternative Interfaces (Requirement 23.2)

**Multiple Access Methods:**
1. **Primary Frontend**: Next.js web application (primary interface)
2. **Direct CLI Access**: Users can interact with the program using Solana CLI and Anchor CLI
3. **Third-Party Explorers**: Solana explorers (Solscan, Solana Explorer) allow viewing beast accounts
4. **Custom Scripts**: Users can write custom TypeScript/JavaScript scripts using @solana/web3.js

**CLI Example:**
```bash
# View beast account data
solana account <beast_pda_address> --output json

# Call program instruction directly
anchor run <script_name>
```

**Design Rationale**: By building on Solana's open blockchain, all program data and instructions are accessible through multiple interfaces. This ensures users are never locked into a single frontend application.

### RPC Endpoint Redundancy (Requirement 23.3)

**Multi-Endpoint Configuration:**
```typescript
const RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_RPC_URL,           // Primary endpoint
  'https://api.devnet.solana.com',           // Solana public devnet
  'https://solana-devnet.g.alchemy.com/v2/', // Alchemy backup
  'https://rpc.ankr.com/solana_devnet',      // Ankr backup
];

async function fetchWithFallback<T>(
  fetchFn: (endpoint: string) => Promise<T>
): Promise<T> {
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      return await fetchFn(endpoint);
    } catch (error) {
      console.warn(`RPC endpoint ${endpoint} failed, trying next...`);
      continue;
    }
  }
  throw new Error('All RPC endpoints failed');
}
```

**Automatic Failover:**
- Frontend automatically retries failed requests with backup endpoints
- Connection health monitoring detects slow or unresponsive endpoints
- Users can manually configure preferred RPC endpoints
- Load balancing across endpoints for better performance

**Design Rationale**: RPC endpoint failures are a common issue in blockchain applications. By configuring multiple redundant endpoints, the system maintains availability even when individual RPC providers experience downtime.

### Program Upgrade Compatibility (Requirement 23.4)

**Account Structure Versioning:**
```rust
pub struct BeastAccount {
    pub version: u8,               // Account schema version
    pub mint: Pubkey,
    pub owner: Pubkey,
    // ... other fields
}
```

**Backward Compatibility Strategy:**
- Account structures include version field for schema tracking
- New fields are added to the end of structs to maintain offset compatibility
- Program code handles multiple account versions gracefully
- Migration instructions provided for optional account upgrades

**Upgrade Process:**
1. Deploy new program version with backward-compatible account handling
2. Existing accounts continue functioning without modification
3. New accounts use updated schema
4. Optional migration instruction for users who want to upgrade account structure

**Design Rationale**: Solana programs can be upgraded, but existing account data persists. By designing account structures with versioning and backward compatibility in mind, the system can evolve without requiring disruptive migrations.

### Account Verification and Repair (Requirement 23.5)

**Administrative Tools:**

**Account Verification Script:**
```typescript
// Verify beast account integrity
async function verifyBeastAccount(beastPDA: PublicKey): Promise<VerificationResult> {
  const account = await program.account.beastAccount.fetch(beastPDA);
  
  const checks = {
    rarityScoreValid: account.rarityScore === calculateRarity(account.traits),
    ownershipValid: await verifyNFTOwnership(account.mint, account.owner),
    pdaDerivationValid: verifyPDADerivation(beastPDA, account.mint),
    timestampsValid: account.lastActivity <= Date.now() / 1000,
    traitsInRange: account.traits.every(t => t >= 0 && t <= 255),
  };
  
  return {
    valid: Object.values(checks).every(v => v),
    checks,
    account,
  };
}
```

**Repair Instruction:**
```rust
// Administrative instruction to repair corrupted account data
pub fn repair_beast_account(
    ctx: Context<RepairBeastAccount>,
    corrected_rarity: u64,
) -> Result<()> {
    require!(ctx.accounts.authority.key() == ctx.accounts.config.authority, ErrorCode::Unauthorized);
    
    let beast = &mut ctx.accounts.beast;
    beast.rarity_score = corrected_rarity;
    
    emit!(BeastAccountRepaired {
        beast: beast.key(),
        old_rarity: beast.rarity_score,
        new_rarity: corrected_rarity,
    });
    
    Ok(())
}
```

**Design Rationale**: While blockchain data is immutable and corruption is rare, administrative tools provide a safety net for edge cases. These tools are restricted to program authority and emit events for transparency.

**Verification Scenarios:**
- Rarity score mismatch with trait values
- Owner field desynchronized from NFT holder
- Invalid PDA derivation
- Timestamp anomalies
- Trait values outside valid range

## State Persistence and Synchronization

### On-Chain State Management

**Immediate Persistence** (Requirement 10.1):
All beast state changes are committed to the Solana blockchain immediately within the transaction. There is no intermediate caching layer for critical game state. Each instruction that modifies beast data (perform_activity, upgrade_trait, claim_rewards, breed_beasts) writes directly to the beast's PDA account.

**State Query Strategy** (Requirement 10.2):
The frontend fetches current on-chain state using Anchor's account deserialization:
```typescript
const beastAccount = await program.account.beastAccount.fetch(beastPDA);
```

This ensures the displayed data always reflects the actual blockchain state. For performance optimization, the frontend may:
- Cache beast data locally with short TTL (time-to-live)
- Subscribe to account changes using Solana's WebSocket subscriptions
- Invalidate cache after user-initiated transactions

**Transaction Atomicity** (Requirements 10.3, 10.4):
Solana's runtime provides atomic transaction guarantees:
- All instructions in a transaction execute sequentially
- If any instruction fails, all state changes are reverted
- No partial updates can occur
- Account locks prevent concurrent modifications during transaction execution

**Design Rationale**: This architecture ensures:
- **Verifiability**: All game state is on-chain and auditable
- **Consistency**: Atomic transactions prevent race conditions
- **Security**: No trusted intermediary can manipulate state
- **Latency**: Acceptable for turn-based gameplay with cooldowns

**Acceptable Latency** (Requirement 10.5):
- Solana block time: ~400ms average
- Transaction confirmation: 1-2 seconds typical
- Frontend polling interval: 2-5 seconds for non-critical updates
- WebSocket subscriptions provide near-instant updates for user's own transactions

## Error Handling

### On-Chain Error Types

The Solana program defines custom error codes for all failure scenarios:

**Economic Errors:**
- `InsufficientFunds`: User lacks required ZEN tokens for operation
- `InsufficientSOL`: User lacks SOL for transaction fees

**Authorization Errors:**
- `Unauthorized`: User does not own the beast being operated on
- `InvalidAuthority`: Caller is not the program authority (for admin operations)

**State Errors:**
- `BeastInCooldown`: Activity attempted before cooldown period elapsed
- `NoRewardsAvailable`: Claim attempted with zero pending rewards
- `AlreadyInitialized`: Program initialization attempted when already initialized

**Validation Errors:**
- `InvalidTraitIndex`: Trait upgrade specified invalid trait index
- `InvalidParent`: Breeding attempted with invalid parent beast
- `InvalidConfiguration`: Configuration parameters outside acceptable ranges
- `TraitMaxReached`: Trait upgrade attempted on trait with value 255
- `InvalidPDA`: PDA derivation does not match expected address
- `ArithmeticOverflow`: Checked math operation would overflow
- `ArithmeticUnderflow`: Checked math operation would underflow

**Breeding Errors:**
- `BreedingCooldownActive`: Breeding attempted before cooldown elapsed
- `MaxBreedingReached`: Beast has reached maximum breeding count
- `InvalidGeneration`: Generation calculation error

**Treasury Errors:**
- `InsufficientTreasuryBalance`: Treasury lacks funds for reward claim
- `InvalidBurnPercentage`: Burn percentage outside valid range (0-100)

### Frontend Error Handling

The frontend implements a multi-layer error handling strategy:

**Transaction Error Handling:**
```typescript
try {
  const tx = await program.methods.performActivity(activityType)
    .accounts({ ... })
    .rpc();
  // Success handling
} catch (error) {
  if (error.code === 6001) { // BeastInCooldown
    showError(`Beast is in cooldown. Please wait ${remainingTime}.`);
  } else if (error.code === 6000) { // InsufficientFunds
    showError(`Insufficient ZEN tokens. Required: ${cost}, Available: ${balance}`);
  } else {
    showError('Transaction failed. Please try again.');
  }
}
```

**Error Message Translation:**
- All Anchor error codes are mapped to user-friendly messages
- Error messages include actionable information (amounts, times, requirements)
- Network errors are distinguished from program errors
- Wallet rejection errors are handled separately from transaction failures

**Error Recovery:**
- Failed transactions do not leave UI in inconsistent state
- Loading states are properly cleared on error
- Users can retry operations after addressing error conditions
- Optimistic UI updates are rolled back on transaction failure

### Validation Strategy

**Client-Side Validation:**
- Cooldown status checked before transaction submission
- Token balance verified before expensive operations
- Input parameters validated for type and range
- Ownership verified before beast operations

**Design Rationale**: Client-side validation provides immediate user feedback and reduces unnecessary transaction fees, but cannot be relied upon for security.

**On-Chain Validation:**
- All client-side validations are repeated on-chain
- Cryptographic ownership verification via Solana accounts
- Timestamp validation using blockchain clock
- Arithmetic overflow protection on all calculations

**Transaction Atomicity** (Requirements 10.3, 10.4):
- Solana's transaction model ensures atomicity: all instructions succeed or all fail
- No partial state changes can occur - if any instruction fails, the entire transaction is rolled back
- Account state is only committed when the transaction completes successfully
- This guarantees consistency even with multiple operations on the same beast

## Testing Strategy

### Unit Testing

Unit tests verify specific examples and integration points:

**Program Unit Tests (Rust):**
- Test individual instruction handlers with known inputs
- Verify PDA derivation logic
- Test trait generation with fixed seeds
- Verify rarity calculation with known trait values
- Test reward calculation with specific time intervals
- Verify breeding trait inheritance with known parents

**Frontend Unit Tests (TypeScript/Jest):**
- Test React hooks with mocked program responses
- Verify error message translation logic
- Test cooldown timer calculations
- Verify UI state management
- Test wallet connection flows

**Integration Tests:**
- Test complete user flows (mint → activity → claim)
- Verify cross-component interactions
- Test wallet adapter integration
- Verify Metaplex metadata creation

### Property-Based Testing

Property-based tests verify universal properties across all inputs using **fast-check** for TypeScript/JavaScript and **proptest** for Rust.

**Configuration:**
- Each property test runs a minimum of 100 iterations
- Random inputs are generated within valid ranges
- Edge cases (0, max values, boundaries) are automatically explored

**Test Tagging:**
- Each property-based test includes a comment explicitly referencing the design document property
- Format: `// Feature: zenbeasts-gaming-network, Property X: [property description]`
- This ensures traceability from requirements → design → tests

**Program Property Tests (Rust/proptest):**
- Property 2: Generate random trait arrays, verify rarity equals sum
- Property 5: Generate random beasts in cooldown, verify activity rejection
- Property 7: Generate random time intervals, verify reward calculation
- Property 13: Generate random trait indices and values, verify increment by 1
- Property 15: Generate random parent traits, verify offspring within bounds
- Property 31: Generate random costs and burn percentages, verify treasury flow
- Property 42: Generate random breeding timestamps, verify cooldown enforcement
- Property 44: Generate random parent generations, verify cost scaling
- Property 45: Generate trait values at boundary (255), verify upgrade rejection
- Property 46: Generate random trait values, verify scaled cost calculation
- Property 48: Generate random seeds, verify PDA derivation matches
- Property 50: Generate values near overflow boundaries, verify checked math

**Frontend Property Tests (TypeScript/fast-check):**
- Property 17: Generate random wallet addresses, verify display matches
- Property 20: Generate random beast data, verify all traits displayed
- Property 21: Generate random cooldown states, verify time calculation
- Property 28: Generate random error codes, verify translation exists
- Property 36: Generate random rarity scores, verify tier categorization
- Property 37: Generate random transactions, verify fee estimation accuracy
- Property 56: Generate random loading states, verify skeleton display
- Property 60: Generate random screen widths, verify responsive layout

**Example Property Test:**
```typescript
// Feature: zenbeasts-gaming-network, Property 2: Rarity score invariant
test('rarity score always equals sum of traits', () => {
  fc.assert(
    fc.property(
      fc.array(fc.integer({ min: 0, max: 255 }), { minLength: 10, maxLength: 10 }),
      (traits) => {
        const expectedRarity = traits.reduce((sum, t) => sum + t, 0);
        const beast = createBeastWithTraits(traits);
        expect(beast.rarityScore).toBe(expectedRarity);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Test Coverage Goals

- **Unit Tests**: Cover specific examples, edge cases, and error conditions
- **Property Tests**: Verify universal properties hold across all valid inputs
- **Integration Tests**: Validate end-to-end user flows and component interactions

Together, these testing approaches provide comprehensive coverage: unit tests catch concrete bugs, property tests verify general correctness, and integration tests ensure the system works as a whole.

### Testing Tools

- **Rust**: `cargo test`, `proptest` for property-based testing
- **TypeScript**: `jest`, `@testing-library/react`, `fast-check` for property-based testing
- **Solana**: Anchor testing framework with local validator
- **E2E**: Playwright for browser-based testing (optional)
