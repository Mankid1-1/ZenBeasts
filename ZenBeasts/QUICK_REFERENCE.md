# ZenBeasts — Quick Reference Guide

**Version:** 2.0  
**Last Updated:** 2024  
**One-page reference for developers**

---

## 🎯 Core Concepts

### What is ZenBeasts?
- **NFT Gaming Platform** on Solana with fully on-chain gameplay
- **10 Trait Layers** per beast with dynamic rarity calculation
- **$ZEN Token** economy for upgrades and rewards
- **Activity System** (Meditation, Yoga, Brawl) with cooldowns
- **Metaplex Compatible** for marketplace integration

### Key Innovation Points
- ✅ On-chain trait storage (not just metadata)
- ✅ Verifiable rarity calculation in smart contract
- ✅ Token burning mechanism (deflationary economics)
- ✅ Time-based cooldowns enforced on-chain
- 🔄 Compressed NFTs (Phase 3) - 10x cost reduction
- 🔄 Session keys (Phase 3) - gasless transactions

---

## 📋 Quick Start Commands

```bash
# Environment Setup (5 minutes)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install 0.29.0 && avm use 0.29.0

# Project Setup
solana-keygen new --outfile ~/.config/solana/id.json
solana config set --url https://api.devnet.solana.com
solana airdrop 2

# Build & Deploy
anchor build
anchor deploy --provider.cluster devnet
anchor test

# Initialize Program
ts-node scripts/initialize.ts --cooldown 3600

# Mint First Beast
ts-node scripts/mint-sample.ts --name "Genesis Beast" --seed 12345
```

---

## 🏗️ Architecture Overview

```
Frontend (React/Next.js)
    ↓ RPC Calls
Solana Programs (Rust/Anchor)
    ├── NFT Factory → Minting + Metadata
    ├── Activities → Gameplay + Cooldowns  
    └── Economy → Tokens + Treasury
    ↓ State Storage
PDAs (Program Derived Accounts)
    ├── BeastAccount (per NFT)
    ├── ProgramConfig (global)
    └── StakingVault (Phase 2)
```

---

## 🔑 Key File Locations

```
programs/zenbeasts/src/
├── lib.rs                    # Program entry, instruction routing
├── errors.rs                 # Error codes (6000-6099)
├── instructions/
│   ├── create_beast.rs       # NFT minting logic
│   ├── perform_activity.rs   # Activity + cooldown checks
│   └── upgrade_trait.rs      # Trait modification
├── state/
│   ├── beast_account.rs      # Beast data structure
│   └── program_config.rs     # Global config
└── utils/
    ├── traits.rs             # Random generation + validation
    └── rarity.rs             # Scoring algorithm

frontend/src/
├── hooks/
│   ├── useProgram.ts         # Anchor program instance
│   ├── useMintBeast.ts       # Minting hook
│   ├── useActivity.ts        # Activity execution
│   └── useUpgrade.ts         # Trait upgrades
└── lib/anchor/
    └── setup.ts              # PDA helpers + program config
```

---

## 🎨 Data Structures

### BeastAccount (90 bytes)
```rust
pub struct BeastAccount {
    pub mint: Pubkey,           // 32 bytes - NFT mint address
    pub owner: Pubkey,          // 32 bytes - Current owner
    pub traits: [u8; 10],       // 10 bytes - Trait indices (0-4 each)
    pub rarity_score: u64,      // 8 bytes - Calculated rarity
    pub last_activity: i64,     // 8 bytes - Unix timestamp
    pub activity_count: u32,    // 4 bytes - Total activities
    pub pending_rewards: u64,   // 8 bytes - Unclaimed ZEN
    pub bump: u8,               // 1 byte - PDA bump seed
}
```

### Trait System
- **10 Layers**: Background, Body, Eyes, Mouth, Clothing, Accessory, Aura, Pattern, Element, Special
- **5 Variants per Layer**: Indexed 0-4 (0 = common, 4 = legendary)
- **Rarity Weights**: `[1000, 400, 200, 80, 20]` per layer
- **Total Score**: Sum of all trait weights (higher = rarer)

---

## 🔧 Common Operations

### 1. Mint Beast
```typescript
import { useMintBeast } from '@/hooks/useMintBeast';

const { mintBeast, loading } = useMintBeast();

const mint = await mintBeast(
  "Cool Beast",                        // Name (max 32 chars)
  "https://arweave.net/metadata.json"  // Metadata URI
);

console.log("Minted:", mint); // Returns mint address
```

### 2. Perform Activity
```typescript
import { useActivity, ActivityType } from '@/hooks/useActivity';

const { performActivity } = useActivity();

await performActivity(
  beastMintAddress,
  ActivityType.Meditation  // 0=Meditation, 1=Yoga, 2=Brawl
);

// Cooldown check happens on-chain
// Will throw CooldownActive error if too soon
```

### 3. Upgrade Trait
```typescript
import { useUpgrade } from '@/hooks/useUpgrade';

const { upgradeTrait } = useUpgrade();

await upgradeTrait(
  beastMintAddress,
  0,                    // Trait index (0-9)
  3,                    // New value (0-4)
  1_000_000_000         // ZEN amount (9 decimals)
);

// Burns 50% of ZEN, sends 50% to treasury
// Recalculates rarity score automatically
```

### 4. Fetch Beast Data
```typescript
import { useBeast } from '@/hooks/useBeast';

const { beast, loading, error, refetch } = useBeast(mintAddress);

// beast object contains:
// - traits: [u8; 10]
// - rarityScore: number
// - lastActivity: timestamp
// - activityCount: number
// - owner: PublicKey
```

---

## 🧮 PDA Derivation

```typescript
import { PublicKey } from '@solana/web3.js';

// Program Config (singleton)
const [configPDA, configBump] = PublicKey.findProgramAddressSync(
  [Buffer.from('config')],
  programId
);

// Beast Account (per NFT)
const [beastPDA, beastBump] = PublicKey.findProgramAddressSync(
  [Buffer.from('beast'), nftMint.toBuffer()],
  programId
);

// Metaplex Metadata (for NFT)
const METADATA_PROGRAM = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const [metadataPDA] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('metadata'),
    METADATA_PROGRAM.toBuffer(),
    nftMint.toBuffer()
  ],
  METADATA_PROGRAM
);
```

---

## ⚠️ Error Codes Quick Reference

| Code | Name | Cause | Solution |
|------|------|-------|----------|
| 6000 | CooldownActive | Activity too soon | Wait for cooldown period |
| 6001 | NotOwner | Non-owner trying to modify | Verify wallet owns beast |
| 6002 | InvalidTraitIndex | Trait index > 9 | Use 0-9 range |
| 6006 | NameTooLong | Name > 32 chars | Shorten name |
| 6008 | InsufficientFunds | Not enough ZEN | Get more tokens |
| 6009 | InvalidActivityType | Activity type > 2 | Use 0, 1, or 2 |

**Full error reference**: See `ERRORS.md`

---

## 🧪 Testing Cheatsheet

```bash
# Unit Tests (Rust)
cargo test --lib

# Integration Tests (TS)
anchor test

# Specific Test File
anchor test --skip-build -- --grep "Beast Minting"

# With Logs
RUST_LOG=debug anchor test

# Coverage Report
cargo tarpaulin --out Html

# Load Test (devnet)
npm run test:load

# Security Audit
npm run audit
```

---

## 🚀 Deployment Checklist

### Devnet
- [ ] `anchor build`
- [ ] `anchor deploy --provider.cluster devnet`
- [ ] Record program ID in `Anchor.toml` and `.env`
- [ ] `ts-node scripts/initialize.ts`
- [ ] Smoke test: mint + activity + upgrade
- [ ] Update frontend with new program ID

### Mainnet (Additional Steps)
- [ ] ✅ Security audit completed
- [ ] ✅ All tests passing (100% integration coverage)
- [ ] ✅ Load tested on devnet (1000+ concurrent operations)
- [ ] ✅ Frontend tested with real users (beta group)
- [ ] ✅ Emergency pause mechanism tested
- [ ] ✅ Upgrade authority secured (multisig)
- [ ] Fund deployment wallet with 10+ SOL
- [ ] `anchor build --verifiable`
- [ ] Deploy with verification
- [ ] Verify on Solana Explorer
- [ ] Initialize with production parameters
- [ ] Monitor for 24 hours before announcing

---

## 🔥 Performance Benchmarks

| Operation | Compute Units | Cost (SOL) | Time (ms) |
|-----------|--------------|------------|-----------|
| Mint Beast | ~50,000 | ~0.012 | ~800 |
| Activity | ~10,000 | ~0.000005 | ~400 |
| Upgrade Trait | ~15,000 | ~0.00001 + ZEN | ~500 |
| Fetch Beast | N/A | Free (RPC) | ~100 |

**Phase 3 Targets (cNFT):**
- Mint: ~5,000 CU, ~0.001 SOL, ~300ms
- 10x cost reduction
- Same functionality

---

## 🛠️ Troubleshooting Quick Fixes

### Build Fails
```bash
rm -rf target/ .anchor/
cargo update
anchor build
```

### Deploy Fails (Insufficient Funds)
```bash
solana balance
solana airdrop 2  # devnet only
```

### Wallet Won't Connect
```typescript
// Check wallet installed
if (!window.solana?.isPhantom) {
  alert('Install Phantom wallet');
}
```

### Transaction Fails (Blockhash)
```typescript
// Use fresh blockhash with longer timeout
const { blockhash } = await connection.getLatestBlockhash('finalized');
// Set maxRetries: 3
```

### Beast Data Not Updating
```typescript
// Force refetch after transaction
await refetch();
// Or use WebSocket subscription
```

---

## 📊 Token Economics

### $ZEN Token
- **Supply**: TBD (recommend 1 billion with 9 decimals)
- **Utility**: Trait upgrades, staking, governance
- **Mint Authority**: Program or DAO (Phase 3)

### Upgrade Costs (Configurable)
- **Base Cost**: 1 ZEN per upgrade
- **Burn Rate**: 50% burned, 50% to treasury
- **Dynamic Pricing**: Based on rarity tier (Phase 2)

### Reward Distribution
- **Activity Rewards**: Calculated by: `base_reward * rarity_multiplier`
- **Staking APY**: Time-weighted (Phase 2)
- **Breeding Costs**: 10 ZEN per breed (Phase 2)

---

## 🔐 Security Best Practices

### Program-Side
```rust
// ✅ Always validate accounts
#[account(constraint = beast.owner == user.key())]

// ✅ Use checked arithmetic
let score = old_score.checked_add(points)?;

// ✅ Verify PDAs
#[account(seeds = [b"beast", mint.key().as_ref()], bump)]

// ✅ Check signers
require!(ctx.accounts.user.is_signer, ErrorCode::Unauthorized);
```

### Client-Side
```typescript
// ✅ Verify program ID before transactions
if (program.programId.toString() !== EXPECTED_PROGRAM_ID) {
  throw new Error('Invalid program');
}

// ✅ Simulate before sending
const simulation = await connection.simulateTransaction(tx);
if (simulation.value.err) {
  console.error('Simulation failed:', simulation.value.logs);
}

// ✅ Check token accounts
const accountInfo = await getAccount(connection, tokenAccount);
if (accountInfo.mint.toString() !== ZEN_MINT) {
  throw new Error('Wrong token mint');
}
```

---

## 📚 Additional Resources

| Resource | Location |
|----------|----------|
| **Full Architecture** | `ARCHITECTURE.md` |
| **Testing Guide** | `TESTING_DEPLOYMENT.md` |
| **Client Integration** | `CLIENT_INTEGRATION.md` |
| **Error Reference** | `ERRORS.md` |
| **Migration Guide** | `MIGRATION_TROUBLESHOOTING.md` |
| **API Docs** | `README.md` (API Reference section) |

### External Links
- [Solana Docs](https://docs.solana.com)
- [Anchor Book](https://book.anchor-lang.com)
- [Metaplex Docs](https://docs.metaplex.com)
- [SPL Token Guide](https://spl.solana.com/token)

---

## 🎓 Learning Path

### Beginner (Week 1-2)
1. Complete Solana CLI setup
2. Deploy "Hello World" Anchor program
3. Mint your first beast on devnet
4. Read `ARCHITECTURE.md` sections 1-4

### Intermediate (Week 3-4)
1. Implement custom frontend component
2. Add new activity type
3. Write integration tests
4. Study trait generation algorithm

### Advanced (Week 5+)
1. Implement breeding system (Phase 2)
2. Add compressed NFT support (Phase 3)
3. Build session key mechanism
4. Optimize compute units

---

## 💡 Pro Tips

### Development
- **Use devnet liberally** — it's free and resets won't hurt
- **Test edge cases** — max values, zero values, concurrent ops
- **Profile compute units** — use `RUST_LOG=solana_runtime::message_processor=debug`
- **Batch operations** — combine multiple instructions where possible

### Production
- **Monitor error rates** — set up alerts for error spikes
- **Use premium RPC** — Helius/QuickNode for reliability
- **Implement caching** — Redis for sub-100ms API responses
- **Backup regularly** — export all PDAs daily

### User Experience
- **Optimistic UI** — update UI immediately, confirm in background
- **Clear error messages** — use `parseError()` helper
- **Show transaction status** — Building → Signing → Confirming → Success
- **Handle wallet disconnects** — graceful fallbacks

---

## 🎯 Phase-by-Phase Focus

### Phase 1 (Now): MVP Stability
- ✅ Core functionality working
- ✅ Comprehensive testing
- ✅ Security review
- 🎯 **Goal**: Production-ready on devnet

### Phase 2 (Next 6-8 weeks): Enhanced Features
- 🔄 Staking implementation
- 🔄 Breeding mechanics
- 🔄 Achievement system
- 🎯 **Goal**: Feature parity with competitors

### Phase 3 (Future): Scale & Optimize
- 📋 Compressed NFTs (10x cheaper)
- 📋 Session keys (gasless UX)
- 📋 Mobile app (Saga)
- 🎯 **Goal**: Industry-leading performance

---

## 📞 Getting Help

### Community Support
- **Discord**: Most active, fastest responses
- **GitHub Issues**: Bug reports and feature requests
- **Twitter**: Announcements and updates

### Debugging Steps
1. Check this Quick Reference first
2. Search existing GitHub Issues
3. Review relevant `.md` files
4. Ask in Discord #dev-help channel
5. Create detailed GitHub Issue if needed

### When Creating Issues
Include:
- Environment (OS, Solana version, Anchor version)
- Steps to reproduce
- Expected vs actual behavior
- Relevant code snippets
- Transaction signatures (if applicable)

---

**Last Updated**: 2024  
**Maintainer**: ZenBeasts Core Team  
**License**: MIT

---

*"Master the zen, evolve your beasts"* 🐉✨