# ZenBeasts — Solana NFT Ecosystem

**A next-generation NFT gaming platform built on Solana**

![Version](https://img.shields.io/badge/version-2.0-blue)
![Installer](https://img.shields.io/badge/installer-v2.0-green)
![Solana](https://img.shields.io/badge/solana-1.17+-purple)
![Anchor](https://img.shields.io/badge/anchor-0.29+-orange)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-production--ready-brightgreen)

---

## 🌟 Overview

ZenBeasts is a fully on-chain NFT ecosystem where users can mint unique creatures, perform activities to earn rewards, and evolve their beasts using the native $ZEN token. Built on Solana for speed and low costs, ZenBeasts demonstrates advanced smart contract patterns, compressed NFTs, and innovative gameplay mechanics.

### Key Features

- 🎨 **Dynamic NFT Minting** — Generate unique beasts with 10 trait layers and on-chain rarity calculation
- ⚡ **Activity System** — Meditation, Yoga, and Brawl activities with cooldown mechanics
- 💎 **Trait Evolution** — Upgrade traits by burning $ZEN tokens
- 🏆 **Staking & Rewards** — Stake $ZEN for time-weighted multipliers
- 📦 **Compressed NFTs** — Scale to millions of NFTs at 1/10th the cost (Phase 3)
- 🔐 **Session Keys** — Gasless transactions for seamless UX (Phase 3)
- 🌐 **Metaplex Compatible** — Full marketplace support

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Development Phases](#-development-phases)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Client Integration](#-client-integration)
- [API Reference](#-api-reference)
- [Contributing](#-contributing)
- [Security](#-security)
- [License](#-license)

---

## 🚀 Quick Start - Automated Installation v2.0

> **NEW in v2.0:** Production-ready installer with error handling, retry logic, resume capability, and 8+ command-line options!

### ⚡ One-Command Installation (Recommended)

#### Windows (PowerShell - Run as Administrator)

```powershell
# Clone repository
git clone https://github.com/YOUR_REPO/ZenBeasts.git
cd ZenBeasts

# Run installer (v2.0 - Production Ready)
.\install.ps1

# Or with advanced options:
.\install.ps1 -Mode full -SkipInstalled     # Skip already installed components
.\install.ps1 -DryRun                       # Preview what would be installed
.\install.ps1 -Silent                       # Non-interactive mode
.\install.ps1 -Resume                       # Resume from failure
```

#### Linux/macOS (Bash)

```bash
# Clone repository
git clone https://github.com/YOUR_REPO/ZenBeasts.git
cd ZenBeasts

# Make installer executable and run
chmod +x install.sh
./install.sh
```

#### Docker (Cross-Platform)

```bash
# Clone repository
git clone https://github.com/YOUR_REPO/ZenBeasts.git
cd ZenBeasts

# Start with Docker Compose
docker-compose up -d

# Access services:
# - Frontend: http://localhost:3000
# - Bot Hub Dashboard: http://localhost:5000
# - Grafana: http://localhost:3001
```

The automated installer will set up:
- ✅ Git, Node.js, Python, Rust, Solana CLI, Anchor Framework
- ✅ All project dependencies with automatic retry logic
- ✅ Environment configuration files
- ✅ Development tools and utilities
- ✅ **NEW:** Smart PATH management (no restart needed)
- ✅ **NEW:** Resume capability on failures
- ✅ **NEW:** Pre-flight system checks
- ✅ **NEW:** Progress tracking and verbose logging

### 🎯 v2.0 Features

**New Command-Line Options:**
- `--dry-run` - Preview changes without installing
- `--skip-installed` - Skip components already installed (50% faster!)
- `--silent` - Non-interactive mode for CI/CD
- `--resume` - Resume from last failure point
- `--force` - Continue on non-critical errors
- `--log-level` - Control verbosity (Quiet/Normal/Verbose)
- `--verify` - Run verification only
- `--update` - Update from Git

**Production Features:**
- ✅ Automatic retry on network failures (3 attempts)
- ✅ Comprehensive error handling with recovery suggestions
- ✅ Real-time progress tracking (Step X/Y)
- ✅ State persistence for resume capability
- ✅ Pre-flight checks (admin, internet, disk space)
- ✅ Post-install validation and health checks
- ✅ Rotating logs with multiple severity levels
- ✅ Color-coded output for better UX

**Documentation:**
- 📚 [QUICK_START.md](./QUICK_START.md) - Get started in 5 minutes
- 📚 [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md) - Comprehensive guide (539 lines)
- 📚 [TROUBLESHOOTING_INSTALL.md](./TROUBLESHOOTING_INSTALL.md) - Fix any issues (558 lines)
- 📚 [REFACTORING_COMPLETE.md](./REFACTORING_COMPLETE.md) - v2.0 changelog and features
- 📚 [AUTOMATED_SETUP.md](./AUTOMATED_SETUP.md) - System architecture (698 lines)

**Total Documentation: 4,489 lines covering every aspect!**

### Manual Prerequisites (if not using automated installer)

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Rust** 1.70+ ([Install](https://rustup.rs/))
- **Solana CLI** 1.17+ ([Install](https://docs.solana.com/cli/install-solana-cli-tools))
- **Anchor** 0.29+ ([Install](https://www.anchor-lang.com/docs/installation))
- **Git** 2.30+

### 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/zenbeasts.git
cd zenbeasts

# 2. Install Solana CLI & set to devnet
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
solana config set --url https://api.devnet.solana.com

# 3. Create wallet and get airdrop
solana-keygen new --outfile ~/.config/solana/id.json
solana airdrop 2

# 4. Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install 0.29.0
avm use 0.29.0

# 5. Build and deploy
anchor build
anchor deploy --provider.cluster devnet

# 6. Run tests
anchor test
```

### First Mint

```bash
# Use the provided CLI tool
npm run mint -- --name "My First Beast" --seed 12345

# Or interact via frontend
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                       │
│  React + Next.js + Wallet Adapter + Three.js           │
└───────────────────────┬─────────────────────────────────┘
                        │ RPC/WebSocket
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  Solana Blockchain                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ NFT Mint   │  │ Activities │  │  Economy   │        │
│  │ Program    │◄─┤  Program   │◄─┤  Program   │        │
│  └────────────┘  └────────────┘  └────────────┘        │
│         │               │                │              │
│         └───────────────┴────────────────┘              │
│                         │                               │
│              ┌──────────▼──────────┐                    │
│              │   Program PDAs      │                    │
│              │ • Beast Accounts    │                    │
│              │ • Staking Vaults    │                    │
│              │ • Treasury          │                    │
│              │ • Config            │                    │
│              └─────────────────────┘                    │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Backend Services (Optional)                │
│  Indexer + Redis Cache + GraphQL API + WebSocket       │
└─────────────────────────────────────────────────────────┘
```

### Core Components

1. **On-Chain Programs (Rust/Anchor)**
   - `nft-factory`: Minting and metadata management
   - `activities`: Gameplay interactions and cooldowns
   - `economy`: Token operations and treasury

2. **PDAs (Program Derived Accounts)**
   - `BeastAccount`: Stores traits, rarity, cooldowns, rewards
   - `ProgramConfig`: Global settings and parameters
   - `StakingVault`: User staking positions (Phase 2)

3. **SPL Token Integration**
   - $ZEN token for upgrades and governance
   - NFT mints with Metaplex metadata
   - Associated token accounts

4. **Indexing Layer**
   - Helius DAS API for real-time queries
   - Redis caching for sub-100ms responses
   - WebSocket events for live updates

---

## 🗓️ Development Phases

### Phase 1: Core MVP ✅ (Current)
*Duration: 4-6 weeks*

- [x] Standard SPL NFT minting
- [x] Metaplex metadata compatibility
- [x] On-chain trait storage (10 traits)
- [x] Pseudo-random generation
- [x] Rarity scoring system
- [x] Activity system with cooldowns
- [x] $ZEN token integration
- [x] Trait upgrade mechanism
- [x] Event emission
- [x] Basic frontend (React + Wallet Adapter)

### Phase 2: Enhanced Features 🔄 (Next)
*Duration: 6-8 weeks*

- [ ] Staking vault with time-weighted rewards
- [ ] Breeding system (2 beasts → 1 offspring)
- [ ] Achievement NFT badges
- [ ] Advanced trait fusion
- [ ] Trait locking during activities
- [ ] Admin multisig controls
- [ ] Batch operations
- [ ] Improved randomness (oracle-based)

### Phase 3: Scale & Optimization 📋 (Future)
*Duration: 8-12 weeks*

- [ ] Compressed NFTs (Metaplex Bubblegum)
- [ ] Session keys for gasless transactions
- [ ] Off-chain rarity oracle (Pyth-style)
- [ ] Clockwork automation for rewards
- [ ] Solana Mobile Stack integration
- [ ] WebGL 3D trait visualization
- [ ] Progressive Web App
- [ ] Cross-program composability

---

## 📂 Project Structure

```
zenbeasts/
├── programs/
│   └── zenbeasts/
│       ├── src/
│       │   ├── lib.rs                 # Program entry point
│       │   ├── errors.rs              # Error definitions
│       │   ├── instructions/          # Instruction handlers
│       │   │   ├── initialize.rs
│       │   │   ├── create_beast.rs
│       │   │   ├── perform_activity.rs
│       │   │   ├── upgrade_trait.rs
│       │   │   └── claim_rewards.rs
│       │   ├── state/                 # Account structures
│       │   │   ├── beast_account.rs
│       │   │   └── program_config.rs
│       │   └── utils/                 # Helper functions
│       │       ├── traits.rs
│       │       └── rarity.rs
│       ├── Cargo.toml
├── tests/
│   ├── integration/
│   │   ├── zenbeasts.spec.ts
│   │   └── mint-and-activity.spec.ts
├── frontend/                          # Frontend (Next.js)
│   ├── src/
│   │   ├── app/                       # Next.js App Router
│   │   ├── components/                # React components
│   │   ├── hooks/                     # Wallet + program hooks
│   │   └── lib/anchor/                # PDA helpers + setup
│   ├── package.json
├── scripts/
│   └── initialize.ts                  # Program config initializer
├── Anchor.toml
├── Cargo.toml
├── package.json
├── ARCHITECTURE.md                    # Detailed architecture
├── TESTING_DEPLOYMENT.md              # Testing guide
├── CLIENT_INTEGRATION.md              # Frontend guide
├── ERRORS.md                          # Error reference
└── README.md                          # This file
```

---

## 💻 Installation

### Full Development Setup

**1. System Dependencies**

```bash
# macOS
brew install git node rust

# Ubuntu/Debian
sudo apt update
sudo apt install git nodejs npm build-essential pkg-config libssl-dev

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

**2. Solana Toolchain**

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Add to PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Verify installation
solana --version  # Should show v1.17+
```

**3. Anchor Framework**

```bash
# Install AVM (Anchor Version Manager)
cargo install --git https://github.com/coral-xyz/anchor avm --locked

# Install Anchor 0.29.0
avm install 0.29.0
avm use 0.29.0

# Verify
anchor --version  # Should show anchor-cli 0.29.0
```

**4. Project Setup**

```bash
# Clone repository
git clone https://github.com/yourusername/zenbeasts.git
cd zenbeasts

# Install dependencies
npm install

# Build programs
anchor build

# Generate TypeScript types
anchor build && npm run generate-types
```

**5. Configuration**

```bash
# Create Solana keypair
solana-keygen new --outfile ~/.config/solana/id.json

# Set cluster (devnet for development)
solana config set --url https://api.devnet.solana.com

# Get devnet SOL
solana airdrop 2

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your values
nano .env.local
```

**6. Deploy to Devnet**

```bash
# Build program
anchor build

# Deploy
anchor deploy --provider.cluster devnet

# Note the program ID and update Anchor.toml
# Also update .env.local with NEXT_PUBLIC_PROGRAM_ID
```

**7. Initialize Program**

```bash
# Run initialization script
ts-node scripts/initialize.ts

# Or use Anchor CLI
anchor run initialize
```

---

## 🧪 Testing

### Run All Tests

```bash
# Unit tests (Rust)
cargo test --lib

# Integration tests (TypeScript)
anchor test

# Security tests
npm run test:security

# Load tests (devnet)
npm run test:load
```

### Test Coverage

```bash
# Generate coverage report
cargo tarpaulin --out Html --output-dir coverage

# View report
open coverage/index.html
```

### Continuous Testing

```bash
# Watch mode for rapid development
cargo watch -x test

# Run tests on file change (TypeScript)
npm run test:watch
```

### Manual Testing

```bash
# 1. Mint a beast
ts-node scripts/mint-sample.ts --name "Test Beast" --seed 12345

# 2. Perform activity
ts-node scripts/perform-activity.ts --mint <MINT_ADDRESS> --activity 0

# 3. Upgrade trait
ts-node scripts/upgrade-trait.ts --mint <MINT_ADDRESS> --trait 0 --value 3
```

---

## 🚢 Deployment

### Devnet Deployment

```bash
# 1. Set cluster to devnet
solana config set --url https://api.devnet.solana.com

# 2. Build
anchor build

# 3. Deploy
anchor deploy --provider.cluster devnet

# 4. Verify deployment
solana program show <PROGRAM_ID>
```

### Mainnet Deployment

```bash
# 1. Security audit REQUIRED before mainnet
npm run audit

# 2. Set cluster to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# 3. Ensure sufficient SOL (check deployment cost)
solana balance

# 4. Build with optimizations
anchor build --verifiable

# 5. Deploy
anchor deploy --provider.cluster mainnet

# 6. Verify on Solana Explorer
# https://explorer.solana.com/address/<PROGRAM_ID>
```

### Upgrade Process

```bash
# Build new version
anchor build

# Upgrade program (requires upgrade authority)
solana program deploy --program-id <PROGRAM_ID> target/deploy/zenbeasts.so

# Run migration script if needed
ts-node migrations/upgrade_v2.ts
```

---

## 🌐 Client Integration

### Frontend Setup

```bash
cd app
npm install
npm run dev
# Open http://localhost:3000
```

### Quick Integration Example

```typescript
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';

export function MintButton() {
  const { publicKey } = useWallet();
  const { program } = useProgram();
  const { mintBeast, loading } = useMintBeast();

  const handleMint = async () => {
    if (!publicKey || !program) return;
    
    const mint = await mintBeast(
      "My ZenBeast",
      "https://arweave.net/metadata.json"
    );
    
    console.log("Minted:", mint);
  };

  return (
    <button onClick={handleMint} disabled={loading}>
      {loading ? "Minting..." : "Mint Beast"}
    </button>
  );
}
```

### Key Hooks

- `useProgram()` — Access Anchor program instance
- `useBeast(mintAddress)` — Fetch beast data
- `useMintBeast()` — Mint new beasts
- `useActivity()` — Perform activities
- `useUpgrade()` — Upgrade traits

See [CLIENT_INTEGRATION.md](./CLIENT_INTEGRATION.md) for full documentation.

---

## 📖 API Reference

### Program Instructions

#### `initialize`
Initialize program configuration.

**Accounts:**
- `config` — Program config PDA (writable, init)
- `authority` — Program authority (signer, mut)
- `zen_mint` — ZEN token mint
- `treasury` — Treasury token account

**Args:**
- `cooldown: u64` — Activity cooldown in seconds

---

#### `create_beast`
Mint a new ZenBeast NFT.

**Accounts:**
- `beast_account` — Beast PDA (writable, init)
- `config` — Program config (writable)
- `nft_mint` — NFT mint (writable, init)
- `nft_token_account` — User's NFT account (writable, init)
- `metadata` — Metaplex metadata (writable)
- `payer` — Transaction payer (signer, mut)

**Args:**
- `seed: u64` — Random seed for trait generation
- `name: String` — Beast name (max 32 chars)
- `uri: String` — Metadata URI (max 200 chars)

**Returns:** Emits `BeastMinted` event

---

#### `perform_activity`
Perform an activity with cooldown check.

**Accounts:**
- `payer` — User performing activity (signer, mut)
- `beast_account` — Beast PDA (writable)
- `program_state` — Program config

**Args:**
- `activity_type: u8` — 0=Meditation, 1=Yoga, 2=Brawl

**Returns:** Emits `ActivityPerformed` event

---

#### `upgrade_trait`
Upgrade a beast's trait by burning ZEN.

**Accounts:**
- `user` — Beast owner (signer, mut)
- `beast_account` — Beast PDA (writable)
- `user_zen_ata` — User's ZEN token account (writable)
- `program_zen_vault` — Program treasury (writable)
- `zen_mint` — ZEN mint (writable)

**Args:**
- `trait_index: u8` — Index 0-9
- `new_value: u8` — New trait value
- `zen_amount: u64` — ZEN tokens to burn

**Returns:** Emits `TraitUpgraded` event

---

### Account Structures

#### `BeastAccount`
```rust
pub struct BeastAccount {
    pub mint: Pubkey,           // NFT mint address
    pub owner: Pubkey,          // Current owner
    pub traits: [u8; 10],       // Trait indices
    pub rarity_score: u64,      // Calculated rarity
    pub last_activity: i64,     // Unix timestamp
    pub activity_count: u32,    // Total activities
    pub pending_rewards: u64,   // Unclaimed rewards
    pub bump: u8,               // PDA bump
}
```

#### `ProgramConfig`
```rust
pub struct ProgramConfig {
    pub authority: Pubkey,
    pub zen_mint: Pubkey,
    pub treasury: Pubkey,
    pub activity_cooldown: i64,
    pub upgrade_cost: u64,
    pub burn_percentage: u8,
    pub total_minted: u64,
    pub bump: u8,
}
```

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** with clear commit messages
4. **Write/update tests** for new functionality
5. **Run tests**: `anchor test && npm test`
6. **Run linter**: `cargo clippy && npm run lint`
7. **Submit a pull request**

### Code Standards

- **Rust**: Follow Rust API Guidelines
- **TypeScript**: Use ESLint + Prettier
- **Commits**: Conventional Commits format
- **Documentation**: Update relevant .md files

### Bug Reports

Use GitHub Issues with:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Solana version, etc.)

---

## 🔒 Security

### Audit Status

- ✅ Internal review completed
- 🔄 Third-party audit: Scheduled (Q2 2024)
- 📋 Bug bounty program: Coming soon

### Security Features

- ✅ Account validation on all instructions
- ✅ Overflow protection with checked arithmetic
- ✅ PDA derivation validation
- ✅ Signer verification
- ✅ Token account ownership checks
- ✅ Emergency pause mechanism (Phase 2)

### Reporting Vulnerabilities

**DO NOT** create public issues for security vulnerabilities.

Email: security@zenbeasts.io (PGP key available)

We follow coordinated disclosure and offer rewards for valid reports.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Solana Foundation** — For the incredible blockchain platform
- **Coral (Anchor)** — For the best Solana development framework
- **Metaplex** — For NFT standards and tooling
- **Community** — For feedback and contributions

---

## 📞 Support & Community

- **Discord**: [discord.gg/zenbeasts](https://discord.gg/zenbeasts)
- **Twitter**: [@ZenBeasts](https://twitter.com/zenbeasts)
- **Documentation**: [docs.zenbeasts.io](https://docs.zenbeasts.io)
- **Email**: hello@zenbeasts.io

---

## 🗺️ Roadmap

### Q1 2024
- ✅ Phase 1 MVP completion
- ✅ Devnet deployment
- ✅ Initial frontend release

### Q2 2024
- 🔄 Phase 2 features (staking, breeding)
- 📋 Security audit
- 📋 Mainnet beta launch

### Q3 2024
- 📋 Phase 3 (cNFTs, session keys)
- 📋 Mobile app (Saga integration)
- 📋 Governance token launch

### Q4 2024
- 📋 DAO formation
- 📋 Cross-chain bridges
- 📋 Esports integration

---

## 💡 Tips & Best Practices

### For Developers

1. **Always test on devnet first**
2. **Use transaction simulation** before sending
3. **Monitor compute units** to optimize costs
4. **Implement proper error handling** with user-friendly messages
5. **Use PDA seeds consistently** for deterministic addresses

### For Users

1. **Never share your private key**
2. **Verify program IDs** before interacting
3. **Start with small amounts** on mainnet
4. **Use hardware wallets** for large holdings
5. **Check transaction details** before signing

---

## 📊 Performance Metrics

### Phase 1 Benchmarks

- **Mint Cost**: ~0.012 SOL (~$1.20 at $100/SOL)
- **Activity Cost**: ~0.000005 SOL (negligible)
- **Upgrade Cost**: ~0.00001 SOL + ZEN tokens
- **Transaction Time**: ~400ms average
- **Compute Units**: ~50k per mint, ~10k per activity

### Phase 3 Targets (cNFT)

- **Mint Cost**: ~0.001 SOL (10x reduction)
- **Transaction Time**: ~200ms average
- **Scalability**: 1M+ NFTs supported

---

**Built with ❤️ on Solana**

*"Evolve your beasts, embrace the zen"*