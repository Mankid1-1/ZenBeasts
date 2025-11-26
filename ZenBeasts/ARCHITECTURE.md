# ZenBeasts Solana — Complete Architecture & Implementation Guide

**Version:** 2.0  
**Last Updated:** 2024  
**Status:** Production-Ready Architecture

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Development Environment Setup](#3-development-environment-setup)
4. [Phase 1: Core MVP Implementation](#4-phase-1-core-mvp-implementation)
5. [Phase 2: Enhanced Features](#5-phase-2-enhanced-features)
6. [Phase 3: Scale & Optimization](#6-phase-3-scale--optimization)
7. [Client Integration](#7-client-integration)
8. [Testing & Quality Assurance](#8-testing--quality-assurance)
9. [Deployment & Operations](#9-deployment--operations)
10. [Appendices](#10-appendices)

---

## 1. Executive Summary

### 1.1 What is ZenBeasts?

ZenBeasts is a Solana-based NFT ecosystem where users mint unique creatures with on-chain traits, perform activities to earn rewards, and upgrade traits using the native $ZEN token. The system emphasizes:

- **True on-chain gameplay**: Traits, rarity, and cooldowns stored on Solana
- **Composable NFTs**: Metaplex-compatible for marketplace integration
- **Token utility**: $ZEN powers upgrades, staking, and governance
- **Progressive decentralization**: Clear path from MVP to fully decentralized system

### 1.2 Three-Phase Roadmap

| Phase | Focus | Duration | Key Deliverables |
|-------|-------|----------|------------------|
| **Phase 1** | Core MVP | 4-6 weeks | Standard NFTs, basic activities, ZEN token integration |
| **Phase 2** | Enhanced Features | 6-8 weeks | Staking, advanced traits, breeding, achievement system |
| **Phase 3** | Scale & Optimize | 8-12 weeks | Compressed NFTs, session keys, off-chain indexing, mobile support |

### 1.3 Technical Stack

**Blockchain Layer:**
- Solana (Mainnet-beta / Devnet)
- Anchor Framework 0.29+
- Metaplex Token Metadata v1.13+
- SPL Token Program

**Backend:**
- Node.js 18+ / TypeScript
- Helius RPC + DAS API (Phase 3)
- Redis for caching
- PostgreSQL for indexing

**Frontend:**
- React 18+ / Next.js 14+
- Solana Wallet Adapter 0.19+
- TailwindCSS + Shadcn/ui
- Three.js for 3D trait visualization

---

## 2. Architecture Overview

### 2.1 System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│  (React + Wallet Adapter + WebGL Renderer)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ RPC Calls
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Solana Blockchain                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ NFT Factory  │  │  Activities  │  │   Economy    │      │
│  │   Program    │◄─┤   Program    │◄─┤   Program    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                            │                                │
│                  ┌─────────▼─────────┐                      │
│                  │   Program PDAs    │                      │
│                  │ ┌───────────────┐ │                      │
│                  │ │ Beast Account │ │                      │
│                  │ │ Staking Vault │ │                      │
│                  │ │ Treasury      │ │                      │
│                  │ └───────────────┘ │                      │
│                  └───────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
                     │
                     │ WebSocket Events
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend Services                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Indexer   │  │   Cache    │  │    API     │            │
│  │ (Accounts) │─►│  (Redis)   │◄─│  (Express) │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

**Minting Flow:**
1. User connects wallet and requests mint
2. Frontend generates random seed
3. Calls `create_beast` instruction
4. Program creates SPL token (supply=1)
5. Program creates Metaplex metadata
6. Program initializes Beast PDA with traits
7. Frontend displays creature visualization

**Activity Flow:**
1. User clicks activity button
2. Frontend calls `perform_activity`
3. Program checks cooldown
4. Program updates timestamp
5. Program emits event
6. Backend indexes event
7. Rewards distributed (off-chain or via claim)

**Upgrade Flow:**
1. User selects trait to upgrade
2. Frontend prompts ZEN token approval
3. User calls `upgrade_trait`
4. Program transfers ZEN from user
5. Program burns 50% of ZEN
6. Program sends 50% to treasury
7. Program updates trait value
8. Program recalculates rarity

### 2.3 Program Architecture (Phase 1)

**Single Monolithic Program:**
```
programs/zenbeasts/
├── src/
│   ├── lib.rs              # Main program entry
│   ├── instructions/
│   │   ├── mod.rs
│   │   ├── create_beast.rs
│   │   ├── perform_activity.rs
│   │   └── upgrade_trait.rs
│   ├── state/
│   │   ├── mod.rs
│   │   ├── beast_account.rs
│   │   └── program_config.rs
│   ├── utils/
│   │   ├── mod.rs
│   │   ├── traits.rs       # Trait generation
│   │   └── rarity.rs       # Rarity calculation
│   └── errors.rs
└── Cargo.toml
```

**Modular Architecture (Phase 2):**
```
programs/
├── nft-factory/           # Minting & metadata
├── activities/            # Gameplay interactions
└── economy/              # Token operations
```

---

## 3. Development Environment Setup

### 3.1 Prerequisites

**System Requirements:**
- OS: Linux, macOS, or WSL2 on Windows
- RAM: 8GB minimum, 16GB recommended
- Disk: 50GB+ free space

**Required Software:**
- Git 2.30+
- Node.js 18+ (use nvm)
- Yarn 1.22+ or pnpm 8+
- Rust 1.70+

### 3.2 Installation Steps

**1. Install Rust & Cargo:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustup default stable
rustup component add rustfmt clippy
```

**2. Install Solana CLI:**
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Verify installation
solana --version  # Should show v1.17+ or latest stable
```

**3. Install Anchor:**
```bash
# Install Anchor Version Manager (recommended)
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install 0.29.0
avm use 0.29.0

# Verify
anchor --version  # Should show anchor-cli 0.29.0
```

**4. Configure Solana CLI:**
```bash
# Generate new keypair (or use existing)
solana-keygen new --outfile ~/.config/solana/id.json

# Set cluster to devnet
solana config set --url https://api.devnet.solana.com
solana config set --keypair ~/.config/solana/id.json

# Verify configuration
solana config get
```

**5. Fund Devnet Wallet:**
```bash
# Request airdrop (2 SOL per request)
solana airdrop 2

# Check balance
solana balance

# If airdrop fails, use faucet: https://faucet.solana.com
```

### 3.3 Project Initialization

**1. Create Anchor Workspace:**
```bash
mkdir zenbeasts && cd zenbeasts
anchor init zenbeasts --template multiple

# Project structure created:
# ├── Anchor.toml
# ├── Cargo.toml
# ├── programs/
# │   └── zenbeasts/
# ├── tests/
# └── migrations/
```

**2. Update Anchor.toml:**
```toml
[toolchain]
anchor_version = "0.29.0"

[features]
seeds = true
skip-lint = false

[programs.devnet]
zenbeasts = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"

[programs.localnet]
zenbeasts = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

**3. Update Program Cargo.toml:**
```toml
[package]
name = "zenbeasts"
version = "0.1.0"
description = "ZenBeasts NFT ecosystem on Solana"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "zenbeasts"

[features]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
cpi = ["no-entrypoint"]
default = []

[dependencies]
anchor-lang = "0.29.0"
anchor-spl = "0.29.0"
mpl-token-metadata = "3.2.0"
solana-program = "~1.17"

[dev-dependencies]
solana-program-test = "~1.17"
solana-sdk = "~1.17"
```

### 3.4 Troubleshooting

**Issue: `solana-keygen: command not found`**
```bash
# Add to ~/.bashrc or ~/.zshrc:
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
source ~/.bashrc  # or ~/.zshrc
```

**Issue: Anchor build fails with "package not found"**
```bash
# Update Rust toolchain
rustup update stable
# Clean and rebuild
anchor clean && anchor build
```

**Issue: Airdrop fails on devnet**
```bash
# Use alternative RPC
solana config set --url https://rpc.ankr.com/solana_devnet
solana airdrop 2

# Or use web faucet: https://faucet.solana.com
```

---

## 4. Phase 1: Core MVP Implementation

### 4.1 Feature Scope

**Included in Phase 1:**
- ✅ Standard SPL NFT minting (1 supply)
- ✅ Metaplex metadata compatibility
- ✅ On-chain trait storage (10 traits per beast)
- ✅ Pseudo-random trait generation
- ✅ Rarity scoring system
- ✅ Activity system with cooldowns
- ✅ ZEN token integration
- ✅ Trait upgrade mechanism (burn ZEN)
- ✅ Basic event emission

**Deferred to Phase 2+:**
- ⏳ Staking & time-weighted rewards
- ⏳ Breeding system
- ⏳ Achievement NFTs
- ⏳ Governance features
- ⏳ Compressed NFTs
- ⏳ Session keys

### 4.2 Program Structure

**File: `programs/zenbeasts/src/lib.rs`**

```rust
use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod zenbeasts {
    use super::*;

    /// Initialize program configuration
    pub fn initialize(ctx: Context<Initialize>, cooldown: u64) -> Result<()> {
        instructions::initialize::handler(ctx, cooldown)
    }

    /// Mint a new ZenBeast NFT with random traits
    pub fn create_beast(
        ctx: Context<CreateBeast>,
        seed: u64,
        name: String,
        uri: String,
    ) -> Result<()> {
        instructions::create_beast::handler(ctx, seed, name, uri)
    }

    /// Perform an activity (meditation, yoga, brawl)
    pub fn perform_activity(
        ctx: Context<PerformActivity>,
        activity_type: u8,
    ) -> Result<()> {
        instructions::perform_activity::handler(ctx, activity_type)
    }

    /// Upgrade a trait by burning ZEN tokens
    pub fn upgrade_trait(
        ctx: Context<UpgradeTrait>,
        trait_index: u8,
        new_value: u8,
        zen_amount: u64,
    ) -> Result<()> {
        instructions::upgrade_trait::handler(ctx, trait_index, new_value, zen_amount)
    }

    /// Claim activity rewards (ZEN tokens)
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        instructions::claim_rewards::handler(ctx)
    }
}
```

### 4.3 State Definitions

**File: `programs/zenbeasts/src/state/beast_account.rs`**

```rust
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct BeastAccount {
    /// The NFT mint address
    pub mint: Pubkey,
    
    /// Current owner of the beast
    pub owner: Pubkey,
    
    /// 10 trait indices (each 0-4 representing rarity within layer)
    pub traits: [u8; 10],
    
    /// Calculated rarity score (higher = rarer)
    pub rarity_score: u64,
    
    /// Unix timestamp of last activity
    pub last_activity: i64,
    
    /// Total activities performed
    pub activity_count: u32,
    
    /// Accumulated rewards (lamports equivalent)
    pub pending_rewards: u64,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl BeastAccount {
    pub const SEED_PREFIX: &'static [u8] = b"beast";
    
    /// Check if cooldown period has passed
    pub fn can_perform_activity(&self, current_time: i64, cooldown: i64) -> bool {
        current_time - self.last_activity >= cooldown
    }
    
    /// Update activity timestamp
    pub fn update_activity(&mut self, current_time: i64) {
        self.last_activity = current_time;
        self.activity_count += 1;
    }
}
```

**File: `programs/zenbeasts/src/state/program_config.rs`**

```rust
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ProgramConfig {
    /// Program authority (for admin functions)
    pub authority: Pubkey,
    
    /// ZEN token mint address
    pub zen_mint: Pubkey,
    
    /// Treasury account to receive upgrade fees
    pub treasury: Pubkey,
    
    /// Activity cooldown period in seconds
    pub activity_cooldown: i64,
    
    /// Base cost for trait upgrade (in ZEN tokens)
    pub upgrade_cost: u64,
    
    /// Percentage of upgrade cost to burn (0-100)
    pub burn_percentage: u8,
    
    /// Total beasts minted
    pub total_minted: u64,
    
    /// Bump seed
    pub bump: u8,
}

impl ProgramConfig {
    pub const SEED_PREFIX: &'static [u8] = b"config";
}
```

### 4.4 Trait Generation System

**File: `programs/zenbeasts/src/utils/traits.rs`**

```rust
use anchor_lang::prelude::*;
use anchor_lang::solana_program::keccak;

/// Trait layers with their possible variants
pub const TRAIT_LAYERS: usize = 10;
pub const LAYER_SIZES: [usize; TRAIT_LAYERS] = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5];

/// Layer names for metadata
pub const LAYER_NAMES: [&str; TRAIT_LAYERS] = [
    "Background",
    "Body",
    "Eyes",
    "Mouth",
    "Clothing",
    "Accessory",
    "Aura",
    "Pattern",
    "Element",
    "Special",
];

/// Rarity weights per layer (lower index = rarer)
pub const RARITY_WEIGHTS: [[u32; 5]; TRAIT_LAYERS] = [
    [1000, 400, 200, 80, 20],    // Background
    [1000, 400, 200, 80, 20],    // Body
    [1000, 400, 200, 80, 20],    // Eyes
    [1000, 400, 200, 80, 20],    // Mouth
    [1000, 400, 200, 80, 20],    // Clothing
    [1000, 400, 200, 80, 20],    // Accessory
    [1000, 400, 200, 80, 20],    // Aura
    [1000, 400, 200, 80, 20],    // Pattern
    [1000, 400, 200, 80, 20],    // Element
    [1000, 400, 200, 80, 20],    // Special
];

/// Generate pseudo-random traits based on seed and entropy sources
pub fn generate_traits(
    seed: u64,
    owner: &Pubkey,
    recent_blockhash: &[u8],
) -> ([u8; TRAIT_LAYERS], u64) {
    let mut hash_input = Vec::with_capacity(32 + 8 + 32);
    hash_input.extend_from_slice(&owner.to_bytes());
    hash_input.extend_from_slice(&seed.to_le_bytes());
    hash_input.extend_from_slice(recent_blockhash);
    
    let hash = keccak::hash(&hash_input);
    let bytes = hash.0;
    
    let mut traits = [0u8; TRAIT_LAYERS];
    let mut total_score: u64 = 0;
    
    for i in 0..TRAIT_LAYERS {
        // Use 3 bytes per trait for better distribution
        let byte_offset = (i * 3) % 32;
        let rand_value = u32::from_le_bytes([
            bytes[byte_offset],
            bytes[(byte_offset + 1) % 32],
            bytes[(byte_offset + 2) % 32],
            0,
        ]);
        
        // Weighted random selection
        let trait_index = weighted_select(rand_value, &RARITY_WEIGHTS[i]);
        traits[i] = trait_index;
        
        // Accumulate rarity score
        total_score = total_score
            .checked_add(RARITY_WEIGHTS[i][trait_index as usize] as u64)
            .unwrap();
    }
    
    (traits, total_score)
}

/// Select index based on weighted probabilities
fn weighted_select(rand_value: u32, weights: &[u32; 5]) -> u8 {
    let total: u32 = weights.iter().sum();
    let mut roll = rand_value % total;
    
    for (i, &weight) in weights.iter().enumerate() {
        if roll < weight {
            return i as u8;
        }
        roll -= weight;
    }
    
    4 // Fallback to last index
}

/// Calculate rarity score from trait array
pub fn calculate_rarity(traits: &[u8; TRAIT_LAYERS]) -> Result<u64> {
    let mut score: u64 = 0;
    
    for i in 0..TRAIT_LAYERS {
        let trait_value = traits[i] as usize;
        require!(trait_value < LAYER_SIZES[i], crate::errors::ZenBeastsError::InvalidTrait);
        
        score = score
            .checked_add(RARITY_WEIGHTS[i][trait_value] as u64)
            .ok_or(crate::errors::ZenBeastsError::ArithmeticOverflow)?;
    }
    
    Ok(score)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_generate_traits() {
        let owner = Pubkey::new_unique();
        let blockhash = [1u8; 32];
        let (traits, score) = generate_traits(12345, &owner, &blockhash);
        
        // All traits should be within valid range
        for (i, &trait_val) in traits.iter().enumerate() {
            assert!((trait_val as usize) < LAYER_SIZES[i]);
        }
        
        // Score should be non-zero
        assert!(score > 0);
    }
    
    #[test]
    fn test_calculate_rarity() {
        let traits = [0, 1, 2, 3, 4, 0, 1, 2, 3, 4];
        let score = calculate_rarity(&traits).unwrap();
        
        let expected: u64 = (0..TRAIT_LAYERS)
            .map(|i| RARITY_WEIGHTS[i][traits[i] as usize] as u64)
            .sum();
        
        assert_eq!(score, expected);
    }
}
```

### 4.5 Core Instructions

**File: `programs/zenbeasts/src/instructions/initialize.rs`**

```rust
use anchor_lang::prelude::*;
use crate::state::ProgramConfig;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ProgramConfig::INIT_SPACE,
        seeds = [ProgramConfig::SEED_PREFIX],
        bump
    )]
    pub config: Account<'info, ProgramConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Validated in instruction
    pub zen_mint: UncheckedAccount<'info>,
    
    /// CHECK: Treasury token account
    pub treasury: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>, cooldown: u64) -> Result<()> {
    let config = &mut ctx.accounts.config;
    
    config.authority = ctx.accounts.authority.key();
    config.zen_mint = ctx.accounts.zen_mint.key();
    config.treasury = ctx.accounts.treasury.key();
    config.activity_cooldown = cooldown as i64;
    config.upgrade_cost = 1_000_000_000; // 1 ZEN (assuming 9 decimals)
    config.burn_percentage = 50; // Burn 50%
    config.total_minted = 0;
    config.bump = ctx.bumps.config;
    
    msg!("ZenBeasts program initialized!");
    msg!("Authority: {}", config.authority);
    msg!("ZEN Mint: {}", config.zen_mint);
    msg!("Cooldown: {}s", config.activity_cooldown);
    
    Ok(())
}
```

**File: `programs/zenbeasts/src/instructions/create_beast.rs`**

```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};
use anchor_spl::associated_token::AssociatedToken;
use mpl_token_metadata::instruction as mpl_instruction;
use crate::state::{BeastAccount, ProgramConfig};
use crate::utils::traits;
use crate::errors::ZenBeastsError;

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct CreateBeast<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + BeastAccount::INIT_SPACE,
        seeds = [BeastAccount::SEED_PREFIX, nft_mint.key().as_ref()],
        bump
    )]
    pub beast_account: Account<'info, BeastAccount>,
    
    #[account(
        mut,
        seeds = [ProgramConfig::SEED_PREFIX],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramConfig>,
    
    #[account(
        init,
        payer = payer,
        mint::decimals = 0,
        mint::authority = nft_mint,
        mint::freeze_authority = nft_mint,
    )]
    pub nft_mint: Account<'info, Mint>,
    
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = nft_mint,
        associated_token::authority = payer,
    )]
    pub nft_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: Metadata account validated by Metaplex
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    
    /// CHECK: Master Edition account
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    
    /// CHECK: Metaplex Token Metadata Program
    #[account(address = mpl_token_metadata::ID)]
    pub token_metadata_program: UncheckedAccount<'info>,
}

pub fn handler(
    ctx: Context<CreateBeast>,
    seed: u64,
    name: String,
    uri: String,
) -> Result<()> {
    require!(name.len() <= 32, ZenBeastsError::NameTooLong);
    require!(uri.len() <= 200, ZenBeastsError::UriTooLong);
    
    // 1. Mint NFT to user (supply = 1)
    let mint_cpi_accounts = MintTo {
        mint: ctx.accounts.nft_mint.to_account_info(),
        to: ctx.accounts.nft_token_account.to_account_info(),
        authority: ctx.accounts.nft_mint.to_account_info(),
    };
    
    let mint_key = ctx.accounts.nft_mint.key();
    let seeds = &[
        &mint_key.as_ref(),
        &[ctx.accounts.nft_mint.to_account_info().data.borrow()[0]],
    ];
    let signer = &[&seeds[..]];
    
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            mint_cpi_accounts,
            signer,
        ),
        1,
    )?;
    
    // 2. Create Metaplex metadata
    let creators = vec![
        mpl_token_metadata::state::Creator {
            address: ctx.accounts.payer.key(),
            verified: false,
            share: 100,
        },
    ];
    
    let create_metadata_ix = mpl_instruction::create_metadata_accounts_v3(
        ctx.accounts.token_metadata_program.key(),
        ctx.accounts.metadata.key(),
        ctx.accounts.nft_mint.key(),
        ctx.accounts.nft_mint.key(),
        ctx.accounts.payer.key(),
        ctx.accounts.payer.key(),
        name.clone(),
        "ZBST".to_string(),
        uri.clone(),
        Some(creators),
        500, // 5% royalty
        true,
        true,
        None,
        None,
        None,
    );
    
    anchor_lang::solana_program::program::invoke_signed(
        &create_metadata_ix,
        &[
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.nft_mint.to_account_info(),
            ctx.accounts.nft_mint.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
        signer,
    )?;
    
    // 3. Generate traits and initialize beast account
    let recent_slothash = Clock::get()?.unix_timestamp.to_le_bytes();
    let (traits, rarity_score) = traits::generate_traits(
        seed,
        &ctx.accounts.payer.key(),
        &recent_slothash,
    );
    
    let beast = &mut ctx.accounts.beast_account;
    beast.mint = ctx.accounts.nft_mint.key();
    beast.owner = ctx.accounts.payer.key();
    beast.traits = traits;
    beast.rarity_score = rarity_score;
    beast.last_activity = 0;
    beast.activity_count = 0;
    beast.pending_rewards = 0;
    beast.bump = ctx.bumps.beast_account;
    
    // Update global counter
    let config = &mut ctx.accounts.config;
    config.total_minted = config.total_minted.checked_add(1).unwrap();
    
    emit!(BeastMinted {
        mint: beast.mint,
        owner: beast.owner,
        traits,
        rarity_score,
        mint_number: config.total_minted,
    });
    
    msg!("Beast minted! Rarity: {}", rarity_score);
    
    Ok(())
}

#[event]
pub struct BeastMinted {
    pub mint: Pubkey,
    pub owner: Pubkey,
    pub traits: [u8; 10],
    pub rarity_score: u64,
    pub mint_number