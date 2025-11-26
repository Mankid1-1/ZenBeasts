# ZenBeasts Testing & Deployment Guide

**Version:** 2.0  
**Last Updated:** 2024

---

## Table of Contents

1. [Testing Strategy](#1-testing-strategy)
2. [Unit Testing](#2-unit-testing)
3. [Integration Testing](#3-integration-testing)
4. [Security Testing](#4-security-testing)
5. [Performance Testing](#5-performance-testing)
6. [Deployment Process](#6-deployment-process)
7. [Monitoring & Observability](#7-monitoring--observability)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Testing Strategy

### 1.1 Testing Pyramid

```
                    ┌─────────────┐
                    │   E2E Tests │  (5-10%)
                    │  (Devnet)   │
                    └─────────────┘
                  ┌───────────────────┐
                  │ Integration Tests │  (20-30%)
                  │  (Bankrun/Local)  │
                  └───────────────────┘
              ┌─────────────────────────────┐
              │        Unit Tests           │  (60-70%)
              │  (Pure Functions/Logic)     │
              └─────────────────────────────┘
```

### 1.2 Test Coverage Goals

- **Unit Tests**: 90%+ coverage on utils/traits.rs, utils/rarity.rs
- **Integration Tests**: 80%+ coverage on all instructions
- **Security Tests**: 100% coverage on access control and token operations
- **E2E Tests**: All critical user flows (mint, activity, upgrade, claim)

### 1.3 Testing Tools

```toml
[dev-dependencies]
solana-program-test = "~1.17"
solana-sdk = "~1.17"
tokio = { version = "1.0", features = ["full"] }
anchor-client = "0.29.0"
```

---

## 2. Unit Testing

### 2.1 Trait Generation Tests

**File: `programs/zenbeasts/src/utils/traits.rs`**

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::prelude::Pubkey;

    #[test]
    fn test_generate_traits_deterministic() {
        let owner = Pubkey::new_unique();
        let seed = 12345u64;
        let blockhash = [1u8; 32];

        let (traits1, score1) = generate_traits(seed, &owner, &blockhash);
        let (traits2, score2) = generate_traits(seed, &owner, &blockhash);

        // Same inputs should produce same outputs
        assert_eq!(traits1, traits2);
        assert_eq!(score1, score2);
    }

    #[test]
    fn test_generate_traits_different_seeds() {
        let owner = Pubkey::new_unique();
        let blockhash = [1u8; 32];

        let (traits1, _) = generate_traits(12345, &owner, &blockhash);
        let (traits2, _) = generate_traits(67890, &owner, &blockhash);

        // Different seeds should produce different traits
        assert_ne!(traits1, traits2);
    }

    #[test]
    fn test_all_traits_within_bounds() {
        let owner = Pubkey::new_unique();
        let blockhash = [1u8; 32];

        // Test 100 random generations
        for seed in 0..100 {
            let (traits, _) = generate_traits(seed, &owner, &blockhash);
            
            for (i, &trait_val) in traits.iter().enumerate() {
                assert!(
                    (trait_val as usize) < LAYER_SIZES[i],
                    "Trait {} value {} exceeds layer size {}",
                    i, trait_val, LAYER_SIZES[i]
                );
            }
        }
    }

    #[test]
    fn test_calculate_rarity_valid() {
        let traits = [0, 1, 2, 3, 4, 0, 1, 2, 3, 4];
        let result = calculate_rarity(&traits);
        
        assert!(result.is_ok());
        let score = result.unwrap();
        
        // Verify score matches expected calculation
        let expected: u64 = traits.iter().enumerate()
            .map(|(i, &t)| RARITY_WEIGHTS[i][t as usize] as u64)
            .sum();
        
        assert_eq!(score, expected);
    }

    #[test]
    fn test_calculate_rarity_invalid_trait() {
        let traits = [0, 1, 2, 3, 4, 0, 1, 2, 3, 10]; // 10 is invalid
        let result = calculate_rarity(&traits);
        
        assert!(result.is_err());
    }

    #[test]
    fn test_weighted_select_distribution() {
        let weights = [1000, 400, 200, 80, 20];
        let mut counts = [0u32; 5];
        
        // Run 10000 selections
        for i in 0..10000 {
            let selected = weighted_select(i, &weights);
            counts[selected as usize] += 1;
        }
        
        // Most common should be index 0 (weight 1000)
        let max_count = counts.iter().max().unwrap();
        let max_index = counts.iter().position(|&c| c == *max_count).unwrap();
        assert_eq!(max_index, 0, "Highest weight should be selected most often");
    }

    #[test]
    fn test_rarity_score_consistency() {
        // Test that rarity calculation is stable
        let traits = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2];
        
        let score1 = calculate_rarity(&traits).unwrap();
        let score2 = calculate_rarity(&traits).unwrap();
        
        assert_eq!(score1, score2);
    }

    #[test]
    fn test_trait_layer_names() {
        assert_eq!(LAYER_NAMES.len(), TRAIT_LAYERS);
        assert_eq!(LAYER_NAMES[0], "Background");
        assert_eq!(LAYER_NAMES[9], "Special");
    }
}
```

### 2.2 Beast Account Tests

**File: `programs/zenbeasts/src/state/beast_account.rs`**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_can_perform_activity_no_cooldown() {
        let mut beast = BeastAccount {
            mint: Pubkey::new_unique(),
            owner: Pubkey::new_unique(),
            traits: [0; 10],
            rarity_score: 1000,
            last_activity: 0,
            activity_count: 0,
            pending_rewards: 0,
            bump: 255,
        };

        let cooldown = 3600; // 1 hour
        let current_time = 7200; // 2 hours later

        assert!(beast.can_perform_activity(current_time, cooldown));
    }

    #[test]
    fn test_cannot_perform_activity_during_cooldown() {
        let mut beast = BeastAccount {
            mint: Pubkey::new_unique(),
            owner: Pubkey::new_unique(),
            traits: [0; 10],
            rarity_score: 1000,
            last_activity: 7200,
            activity_count: 0,
            pending_rewards: 0,
            bump: 255,
        };

        let cooldown = 3600; // 1 hour
        let current_time = 9000; // Only 30 minutes later

        assert!(!beast.can_perform_activity(current_time, cooldown));
    }

    #[test]
    fn test_update_activity_increments_count() {
        let mut beast = BeastAccount {
            mint: Pubkey::new_unique(),
            owner: Pubkey::new_unique(),
            traits: [0; 10],
            rarity_score: 1000,
            last_activity: 0,
            activity_count: 5,
            pending_rewards: 0,
            bump: 255,
        };

        let current_time = 10000;
        beast.update_activity(current_time);

        assert_eq!(beast.last_activity, current_time);
        assert_eq!(beast.activity_count, 6);
    }

    #[test]
    fn test_activity_count_overflow_protection() {
        let mut beast = BeastAccount {
            mint: Pubkey::new_unique(),
            owner: Pubkey::new_unique(),
            traits: [0; 10],
            rarity_score: 1000,
            last_activity: 0,
            activity_count: u32::MAX - 1,
            pending_rewards: 0,
            bump: 255,
        };

        beast.update_activity(1000);
        assert_eq!(beast.activity_count, u32::MAX);
    }
}
```

---

## 3. Integration Testing

### 3.1 Test Setup with Bankrun

**File: `tests/integration/setup.ts`**

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Zenbeasts } from "../../target/types/zenbeasts";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
} from "@solana/spl-token";

export class TestEnvironment {
  provider: anchor.AnchorProvider;
  program: Program<Zenbeasts>;
  authority: Keypair;
  zenMint: PublicKey;
  treasury: PublicKey;
  config: PublicKey;

  constructor(
    provider: anchor.AnchorProvider,
    program: Program<Zenbeasts>
  ) {
    this.provider = provider;
    this.program = program;
    this.authority = Keypair.generate();
  }

  async initialize(cooldown: number = 3600): Promise<void> {
    // Airdrop to authority
    await this.provider.connection.requestAirdrop(
      this.authority.publicKey,
      10 * LAMPORTS_PER_SOL
    );

    // Create ZEN token mint
    this.zenMint = await createMint(
      this.provider.connection,
      this.authority,
      this.authority.publicKey,
      null,
      9 // 9 decimals
    );

    // Create treasury account
    this.treasury = await createAccount(
      this.provider.connection,
      this.authority,
      this.zenMint,
      this.authority.publicKey
    );

    // Derive config PDA
    [this.config] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      this.program.programId
    );

    // Initialize program
    await this.program.methods
      .initialize(new BN(cooldown))
      .accounts({
        config: this.config,
        authority: this.authority.publicKey,
        zenMint: this.zenMint,
        treasury: this.treasury,
        systemProgram: SystemProgram.programId,
      })
      .signers([this.authority])
      .rpc();
  }

  async createUser(): Promise<TestUser> {
    const user = Keypair.generate();

    // Airdrop SOL
    await this.provider.connection.requestAirdrop(
      user.publicKey,
      5 * LAMPORTS_PER_SOL
    );

    // Create ZEN token account
    const zenTokenAccount = await createAccount(
      this.provider.connection,
      user,
      this.zenMint,
      user.publicKey
    );

    // Mint some ZEN tokens to user
    await mintTo(
      this.provider.connection,
      this.authority,
      this.zenMint,
      zenTokenAccount,
      this.authority,
      1_000_000_000_000 // 1000 ZEN (9 decimals)
    );

    return {
      keypair: user,
      zenTokenAccount,
    };
  }

  async mintBeast(
    user: TestUser,
    seed: number = Date.now()
  ): Promise<BeastMintResult> {
    const nftMint = Keypair.generate();

    const [beastAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("beast"), nftMint.publicKey.toBuffer()],
      this.program.programId
    );

    const [metadata] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nftMint.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const [masterEdition] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nftMint.publicKey.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const nftTokenAccount = await getAssociatedTokenAddress(
      nftMint.publicKey,
      user.keypair.publicKey
    );

    await this.program.methods
      .createBeast(
        new BN(seed),
        `ZenBeast #${seed}`,
        "https://arweave.net/example"
      )
      .accounts({
        beastAccount,
        config: this.config,
        nftMint: nftMint.publicKey,
        nftTokenAccount,
        metadata,
        masterEdition,
        payer: user.keypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      })
      .signers([user.keypair, nftMint])
      .rpc();

    return {
      mint: nftMint.publicKey,
      beastAccount,
      tokenAccount: nftTokenAccount,
    };
  }
}

export interface TestUser {
  keypair: Keypair;
  zenTokenAccount: PublicKey;
}

export interface BeastMintResult {
  mint: PublicKey;
  beastAccount: PublicKey;
  tokenAccount: PublicKey;
}

export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);
```

### 3.2 Integration Test Suite

**File: `tests/integration/zenbeasts.spec.ts`**

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Zenbeasts } from "../../target/types/zenbeasts";
import { expect } from "chai";
import { TestEnvironment, TestUser } from "./setup";

describe("ZenBeasts Integration Tests", () => {
  let env: TestEnvironment;
  let user: TestUser;

  before(async () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.Zenbeasts as Program<Zenbeasts>;
    env = new TestEnvironment(provider, program);

    await env.initialize(60); // 60 second cooldown for testing
    user = await env.createUser();
  });

  describe("Initialization", () => {
    it("should initialize program config", async () => {
      const configAccount = await env.program.account.programConfig.fetch(
        env.config
      );

      expect(configAccount.authority.toString()).to.equal(
        env.authority.publicKey.toString()
      );
      expect(configAccount.activityCooldown.toNumber()).to.equal(60);
      expect(configAccount.totalMinted.toNumber()).to.equal(0);
    });
  });

  describe("Beast Minting", () => {
    it("should mint a new beast with valid traits", async () => {
      const result = await env.mintBeast(user, 12345);

      const beastAccount = await env.program.account.beastAccount.fetch(
        result.beastAccount
      );

      expect(beastAccount.owner.toString()).to.equal(
        user.keypair.publicKey.toString()
      );
      expect(beastAccount.mint.toString()).to.equal(result.mint.toString());
      expect(beastAccount.traits.length).to.equal(10);
      expect(beastAccount.rarityScore.toNumber()).to.be.greaterThan(0);
      expect(beastAccount.activityCount).to.equal(0);
    });

    it("should increment total minted counter", async () => {
      const configBefore = await env.program.account.programConfig.fetch(
        env.config
      );
      const mintedBefore = configBefore.totalMinted.toNumber();

      await env.mintBeast(user, 54321);

      const configAfter = await env.program.account.programConfig.fetch(
        env.config
      );
      const mintedAfter = configAfter.totalMinted.toNumber();

      expect(mintedAfter).to.equal(mintedBefore + 1);
    });

    it("should generate different traits for different seeds", async () => {
      const beast1 = await env.mintBeast(user, 11111);
      const beast2 = await env.mintBeast(user, 22222);

      const account1 = await env.program.account.beastAccount.fetch(
        beast1.beastAccount
      );
      const account2 = await env.program.account.beastAccount.fetch(
        beast2.beastAccount
      );

      const traits1 = account1.traits;
      const traits2 = account2.traits;

      // At least one trait should be different
      const areDifferent = traits1.some((t, i) => t !== traits2[i]);
      expect(areDifferent).to.be.true;
    });

    it("should reject name longer than 32 characters", async () => {
      const longName = "A".repeat(33);
      
      try {
        await env.program.methods
          .createBeast(new BN(99999), longName, "https://example.com")
          .accounts({ /* ... */ })
          .rpc();
        
        expect.fail("Should have thrown error");
      } catch (err) {
        expect(err.error.errorCode.code).to.equal("NameTooLong");
      }
    });
  });

  describe("Activities", () => {
    let beastResult: any;

    beforeEach(async () => {
      beastResult = await env.mintBeast(user);
    });

    it("should perform activity successfully", async () => {
      await env.program.methods
        .performActivity(0) // Meditation
        .accounts({
          payer: user.keypair.publicKey,
          beastAccount: beastResult.beastAccount,
          programState: env.config,
        })
        .signers([user.keypair])
        .rpc();

      const beastAccount = await env.program.account.beastAccount.fetch(
        beastResult.beastAccount
      );

      expect(beastAccount.activityCount).to.equal(1);
      expect(beastAccount.lastActivity.toNumber()).to.be.greaterThan(0);
    });

    it("should reject activity during cooldown", async () => {
      // First activity
      await env.program.methods
        .performActivity(0)
        .accounts({
          payer: user.keypair.publicKey,
          beastAccount: beastResult.beastAccount,
          programState: env.config,
        })
        .signers([user.keypair])
        .rpc();

      // Immediate second activity (should fail)
      try {
        await env.program.methods
          .performActivity(1)
          .accounts({
            payer: user.keypair.publicKey,
            beastAccount: beastResult.beastAccount,
            programState: env.config,
          })
          .signers([user.keypair])
          .rpc();

        expect.fail("Should have thrown cooldown error");
      } catch (err) {
        expect(err.error.errorCode.code).to.equal("CooldownActive");
      }
    });

    it("should allow activity after cooldown expires", async () => {
      // First activity
      await env.program.methods
        .performActivity(0)
        .accounts({
          payer: user.keypair.publicKey,
          beastAccount: beastResult.beastAccount,
          programState: env.config,
        })
        .signers([user.keypair])
        .rpc();

      // Wait for cooldown (60 seconds in test config)
      await new Promise((resolve) => setTimeout(resolve, 61000));

      // Second activity (should succeed)
      await env.program.methods
        .performActivity(1)
        .accounts({
          payer: user.keypair.publicKey,
          beastAccount: beastResult.beastAccount,
          programState: env.config,
        })
        .signers([user.keypair])
        .rpc();

      const beastAccount = await env.program.account.beastAccount.fetch(
        beastResult.beastAccount
      );

      expect(beastAccount.activityCount).to.equal(2);
    });

    it("should reject invalid activity type", async () => {
      try {
        await env.program.methods
          .performActivity(99) // Invalid
          .accounts({
            payer: user.keypair.publicKey,
            beastAccount: beastResult.beastAccount,
            programState: env.config,
          })
          .signers([user.keypair])
          .rpc();

        expect.fail("Should have thrown error");
      } catch (err) {
        expect(err.error.errorCode.code).to.equal("InvalidActivityType");
      }
    });
  });

  describe("Trait Upgrades", () => {
    let beastResult: any;

    beforeEach(async () => {
      beastResult = await env.mintBeast(user);
    });

    it("should upgrade trait successfully", async () => {
      const beastBefore = await env.program.account.beastAccount.fetch(
        beastResult.beastAccount
      );
      const oldTrait = beastBefore.traits[0];
      const newTrait = (oldTrait + 1) % 5;

      await env.program.methods
        .upgradeTrait(0, newTrait, new BN(1_000_000_000))
        .accounts({
          user: user.keypair.publicKey,
          beastAccount: beastResult.beastAccount,
          userZenAta: user.zenTokenAccount,
          programZenVault: env.treasury,
          zenMint: env.zenMint,
          programZenVaultAuthority: env.authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user.keypair])
        .rpc();

      const beastAfter = await env.program.account.beastAccount.fetch(
        beastResult.beastAccount
      );

      expect(beastAfter.traits[0]).to.equal(newTrait);
      expect(beastAfter.rarityScore.toNumber()).to.not.equal(
        beastBefore.rarityScore.toNumber()
      );
    });

    it("should burn 50% of ZEN tokens", async () => {
      const amount = new BN(1_000_000_000); // 1 ZEN
      const userBalanceBefore = await getTokenBalance(
        env.provider.connection,
        user.zenTokenAccount
      );

      await env.program.methods
        .upgradeTrait(0, 2, amount)
        .accounts({
          user: user.keypair.publicKey,
          beastAccount: beastResult.beastAccount,
          userZenAta: user.zenTokenAccount,
          programZenVault: env.treasury,
          zenMint: env.zenMint,
          programZenVaultAuthority: env.authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user.keypair])
        .rpc();

      const userBalanceAfter = await getTokenBalance(
        env.provider.connection,
        user.zenTokenAccount
      );

      const burned = userBalanceBefore - userBalanceAfter;
      expect(burned).to.equal(amount.toNumber());
    });

    it("should reject upgrade with invalid trait index", async () => {
      try {
        await env.program.methods
          .upgradeTrait(15, 2, new BN(1_000_000_000)) // Index 15 is invalid
          .accounts({ /* ... */ })
          .signers([user.keypair])
          .rpc();

        expect.fail("Should have thrown error");
      } catch (err) {
        expect(err.error.errorCode.code).to.equal("InvalidTraitIndex");
      }
    });

    it("should reject upgrade by non-owner", async () => {
      const otherUser = await env.createUser();

      try {
        await env.program.methods
          .upgradeTrait(0, 2, new BN(1_000_000_000))
          .accounts({
            user: otherUser.keypair.publicKey,
            beastAccount: beastResult.beastAccount,
            userZenAta: otherUser.zenTokenAccount,
            programZenVault: env.treasury,
            zenMint: env.zenMint,
            programZenVaultAuthority: env.authority.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([otherUser.keypair])
          .rpc();

        expect.fail("Should have thrown error");
      } catch (err) {
        expect(err.error.errorCode.code).to.equal("NotOwner");
      }
    });

    it("should reject insufficient ZEN tokens", async () => {
      const hugeAmount = new BN("999999999999999999");

      try {
        await env.program.methods
          .upgradeTrait(0, 2, hugeAmount)
          .accounts({ /* ... */ })
          .signers([user.keypair])
          .rpc();

        expect.fail("Should have thrown error");
      } catch (err) {
        // SPL Token error for insufficient funds
        expect(err).to.exist;
      }
    });
  });
});

async function getTokenBalance(
  connection: anchor.web3.Connection,
  tokenAccount: PublicKey
): Promise<number> {
  const accountInfo = await connection.getTokenAccountBalance(tokenAccount);
  return Number(accountInfo.value.amount);
}
```

---

## 4. Security Testing

### 4.1 Access Control Tests

**File: `tests/security/access_control.spec.ts`**

```typescript
import { expect } from "chai";
import { TestEnvironment } from "../integration/setup";

describe("Security: Access Control", () => {
  let env: TestEnvironment;

  before(async () => {
    // Setup environment
  });

  it("should prevent unauthorized config updates", async () => {
    const attacker = await env.createUser();

    try {
      await env.program.methods
        .updateConfig(new BN(9999))
        .accounts({
          config: env.config,
          authority: attacker.keypair.publicKey,
        })
        .signers([attacker.keypair])
        .rpc();

      expect.fail("Should have rejected unauthorized update");
    } catch (err) {
      expect(err.error.errorCode.code).to.equal("UnauthorizedAuthority");
    }
  });

  it("should prevent trait modification by non-owner", async () => {
    const owner = await env.createUser();
    const attacker = await env.createUser();
    const beast = await env.mintBeast(owner);

    try {
      await env.program.methods
        .upgradeTrait(0, 3, new BN(1_000_000_000))
        .accounts({
          user: attacker.keypair.publicKey,
          beastAccount: beast.beastAccount,
          // ... other accounts
        })
        .signers([attacker.keypair])
        .rpc();

      expect.fail("Should have rejected non-owner upgrade");
    } catch (err) {
      expect(err.error.errorCode.code).to.equal("NotOwner");
    }
  });

  it("should validate PDA derivation", async () => {
    const fakeBeastAccount = Keypair.generate();

    try {
      await env.program.methods
        .performActivity(0)
        .accounts({
          payer: user.keypair.publicKey,
          beastAccount: fakeBeastAccount.publicKey, // Wrong PDA
          programState: env.config,
        })
        .signers([user.keypair])
        .rpc();

      expect.fail("Should have rejected invalid PDA");
    } catch (err) {
      // Anchor constraint error
      expect(err).to.exist;
    }
  });
});
```

### 4.2 Overflow Protection Tests

```typescript
describe("Security: Overflow Protection", () => {
  it("should prevent rarity score overflow", async () => {
    // Test with maximum trait values
    const traits = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
    
    // Should not panic or overflow
    const result = await calculateRarityOffChain(traits);
    expect(result).to.be.a('number');
    expect(result).to.be.lessThan(Number.MAX_SAFE_INTEGER);
  });

  it("should prevent activity count overflow", async () => {
    // Mock beast with max activity count
    const beast = {
      activityCount: 4294967295, // u32::MAX
    };

    // Next activity should handle overflow gracefully
    // Implementation should use checked_add
  });
});
```

---

## 5. Performance Testing

### 5.1 Load Testing Script

**File: `tests/performance/load_test.ts`**

```typescript
import * as anchor from "@coral-xyz/anchor";
import { TestEnvironment } from "../integration/setup";

async function loadTest() {
  const env = await setupEnvironment();
  
  console.log("Starting load test...");
  console.log("Target: 100 concurrent mints");

  const startTime = Date.now();
  const promises = [];

  for (let i = 0; i < 100; i++) {
    const user = await env.createUser();
    promises.push(
      env.mintBeast(user, i).catch((err) => {
        console.error(`Mint ${i} failed:`, err.message);
        return null;
      })
    );
  }

  const results = await Promise.all(promises);
  const endTime = Date.now();

  const successful = results.filter((r) => r !== null).length;
  const failed = results.length - successful;
  const duration = (endTime - startTime) / 1000;

  console.log("\n=== Load Test Results ===");
  console.log(`Total mints: ${results.length}`);
  console.