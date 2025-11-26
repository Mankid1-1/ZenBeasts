# ZenBeasts Operator Guide

This guide is for program authorities, administrators, and operators managing the ZenBeasts platform.

## Table of Contents

1. [Program Authority](#program-authority)
2. [Configuration Management](#configuration-management)
3. [Treasury Management](#treasury-management)
4. [Program Upgrades](#program-upgrades)
5. [Monitoring and Analytics](#monitoring-and-analytics)
6. [Emergency Procedures](#emergency-procedures)
7. [Security Best Practices](#security-best-practices)

---

## Program Authority

### Authority Responsibilities

The program authority has control over:
- **Configuration updates** (costs, rates, cooldowns)
- **Treasury management** (though automated)
- **Program upgrades** (deploying new versions)
- **Emergency actions** (if implemented)

### Authority Wallet Security

⚠️ **CRITICAL**: The authority wallet controls the entire program

**Security Requirements**:
- Use **hardware wallet** (Ledger, Trezor) for authority
- Store recovery phrase in **bank safe deposit box**
- Use **multi-signature** wallet if possible
- **Never** connect to untrusted websites
- Keep authority wallet **offline** when not in use

### Authority Transfer

To transfer authority to a new wallet:

1. **Prepare new authority wallet**
   - Generate new keypair
   - Secure recovery phrase
   - Fund with SOL for transactions

2. **Update program configuration**
   ```bash
   # Using Anchor CLI
   anchor run update-authority --new-authority <NEW_PUBKEY>
   ```

3. **Verify transfer**
   ```bash
   # Check program config
   solana program show <PROGRAM_ID>
   ```

4. **Test new authority**
   - Perform test configuration update
   - Verify old authority cannot make changes

---

## Configuration Management

### Program Configuration Parameters

The `ProgramConfig` account stores all economic and timing parameters:

```rust
pub struct ProgramConfig {
    pub authority: Pubkey,              // Program authority
    pub zen_mint: Pubkey,               // ZEN token mint
    pub treasury: Pubkey,               // Treasury token account
    pub activity_cooldown: i64,         // Activity cooldown (seconds)
    pub breeding_cooldown: i64,         // Breeding cooldown (seconds)
    pub max_breeding_count: u8,         // Max breeds per beast
    pub upgrade_base_cost: u64,         // Base upgrade cost (lamports)
    pub upgrade_scaling_factor: u64,    // Upgrade cost scaling
    pub breeding_base_cost: u64,        // Base breeding cost (lamports)
    pub generation_multiplier: u64,     // Generation cost multiplier
    pub reward_rate: u64,               // Reward rate (lamports/second)
    pub burn_percentage: u8,            // Token burn % (0-100)
    pub total_minted: u64,              // Total beasts minted
    pub rarity_thresholds: [u64; 5],    // Rarity tier thresholds
    pub bump: u8,                       // PDA bump seed
}
```

### Updating Configuration

#### Using TypeScript Script

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Zenbeasts } from "../target/types/zenbeasts";

async function updateConfig() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.Zenbeasts as Program<Zenbeasts>;
  
  // Get config PDA
  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );
  
  // Update configuration
  await program.methods
    .updateConfig({
      activityCooldown: new anchor.BN(3600),      // 1 hour
      breedingCooldown: new anchor.BN(86400),     // 24 hours
      maxBreedingCount: 5,
      upgradeBaseCost: new anchor.BN(1_000_000_000), // 1 ZEN
      upgradeScalingFactor: new anchor.BN(100),
      breedingBaseCost: new anchor.BN(5_000_000_000), // 5 ZEN
      generationMultiplier: new anchor.BN(150),   // 1.5x per gen
      rewardRate: new anchor.BN(2777),            // ~0.01 ZEN/hour
      burnPercentage: 10,                         // 10% burn
    })
    .accounts({
      config: configPda,
      authority: provider.wallet.publicKey,
    })
    .rpc();
    
  console.log("Configuration updated successfully");
}
```

#### Configuration Update Checklist

Before updating configuration:

- [ ] **Calculate economic impact** of changes
- [ ] **Test on devnet** first
- [ ] **Announce changes** to community (24-48 hours notice)
- [ ] **Document reason** for changes
- [ ] **Backup current config** values
- [ ] **Verify authority wallet** is correct
- [ ] **Check treasury balance** is sufficient
- [ ] **Monitor after deployment** for issues

### Economic Parameter Guidelines

#### Activity Cooldown

```
Recommended: 1-4 hours
Too short: Reward farming, treasury depletion
Too long: Poor user experience, low engagement
```

#### Reward Rate

```
Formula: reward_rate = desired_hourly_reward / 3600
Example: 0.01 ZEN/hour = 10_000_000 lamports / 3600 = 2,777 lamports/second

Consider:
- Treasury sustainability
- Token inflation rate
- User engagement incentives
```

#### Upgrade Costs

```
Base Cost: Starting cost for trait 0→1
Scaling Factor: How quickly costs increase

Example:
- Base: 1 ZEN
- Scaling: 100
- Trait 0→1: 1 ZEN
- Trait 100→101: 2 ZEN
- Trait 200→201: 3 ZEN
```

#### Breeding Costs

```
Base Cost: Cost for Gen 0 × Gen 0
Generation Multiplier: Cost increase per generation

Example:
- Base: 5 ZEN
- Multiplier: 1.5x
- Gen 0 × Gen 0: 5 ZEN
- Gen 1 × Gen 1: 7.5 ZEN
- Gen 2 × Gen 2: 11.25 ZEN
```

#### Burn Percentage

```
Recommended: 5-20%
Purpose: Deflationary pressure, token value support
Too high: Discourages upgrades/breeding
Too low: Excessive inflation
```

### Rarity Thresholds

Default thresholds:
```rust
[
    400,  // Common: 0-400
    600,  // Uncommon: 401-600
    800,  // Rare: 601-800
    950,  // Epic: 801-950
    1020, // Legendary: 951-1020
]
```

**Changing thresholds**:
- Affects rarity tier display only
- Does not change existing beast traits
- Update frontend to match new thresholds

---

## Treasury Management

### Treasury Overview

The treasury is a program-controlled token account that:
- **Receives** tokens from upgrades and breeding
- **Distributes** rewards to players
- **Burns** percentage of incoming tokens
- **Maintains** economic sustainability

### Treasury Token Flow

```
Upgrades/Breeding → Treasury (90%) + Burn (10%)
Treasury → Reward Claims → Players
```

### Monitoring Treasury Balance

#### Using Solana CLI

```bash
# Get treasury balance
solana balance <TREASURY_ADDRESS>

# Get detailed token account info
spl-token account-info <TREASURY_ADDRESS>
```

#### Using TypeScript

```typescript
async function getTreasuryBalance() {
  const connection = new Connection(clusterApiUrl("devnet"));
  const treasuryPubkey = new PublicKey("<TREASURY_ADDRESS>");
  
  const balance = await connection.getTokenAccountBalance(treasuryPubkey);
  console.log(`Treasury Balance: ${balance.value.uiAmount} ZEN`);
  
  return balance.value.uiAmount;
}
```

### Treasury Health Metrics

**Healthy Treasury**:
- Balance > 1000 ZEN
- Inflow > Outflow (over 7-day period)
- Sufficient for 30+ days of rewards at current rate

**Warning Signs**:
- Balance < 500 ZEN
- Outflow > Inflow consistently
- Rapid depletion rate

**Critical**:
- Balance < 100 ZEN
- Unable to fulfill reward claims
- Immediate action required

### Treasury Replenishment

If treasury is depleting:

1. **Reduce reward rate**
   ```typescript
   // Lower rewards to slow depletion
   rewardRate: new anchor.BN(1388), // Half of default
   ```

2. **Increase upgrade/breeding costs**
   ```typescript
   // More tokens flowing into treasury
   upgradeBaseCost: new anchor.BN(2_000_000_000), // 2 ZEN
   breedingBaseCost: new anchor.BN(10_000_000_000), // 10 ZEN
   ```

3. **Reduce burn percentage**
   ```typescript
   // Keep more tokens in treasury
   burnPercentage: 5, // Down from 10%
   ```

4. **Manual treasury funding** (if necessary)
   ```bash
   # Transfer ZEN to treasury
   spl-token transfer <ZEN_MINT> <AMOUNT> <TREASURY_ADDRESS>
   ```

### Treasury Withdrawal

⚠️ **WARNING**: Treasury withdrawals should be rare and transparent

**Valid reasons**:
- Emergency bug fix requiring token recovery
- Program migration to new version
- Community-approved treasury allocation

**Process**:
1. **Announce intention** to community (7+ days notice)
2. **Explain reason** and amount
3. **Implement withdrawal** instruction (requires program upgrade)
4. **Document transaction** publicly
5. **Report usage** of withdrawn funds

---

## Program Upgrades

### Upgrade Process

Solana programs are upgradeable if deployed with upgrade authority.

#### Pre-Upgrade Checklist

- [ ] **Test thoroughly** on devnet
- [ ] **Audit code changes** (security review)
- [ ] **Backup current program** binary
- [ ] **Document changes** in changelog
- [ ] **Announce upgrade** to community
- [ ] **Plan rollback** procedure
- [ ] **Schedule maintenance window**
- [ ] **Verify upgrade authority** wallet

#### Performing Upgrade

```bash
# Build new program version
anchor build

# Deploy upgrade to devnet first
anchor upgrade --provider.cluster devnet target/deploy/zenbeasts.so --program-id <PROGRAM_ID>

# Test on devnet
npm run test:devnet

# Deploy to mainnet
anchor upgrade --provider.cluster mainnet target/deploy/zenbeasts.so --program-id <PROGRAM_ID>

# Verify upgrade
solana program show <PROGRAM_ID>
```

#### Post-Upgrade Verification

1. **Test all instructions**
   - Mint beast
   - Perform activity
   - Claim rewards
   - Upgrade trait
   - Breed beasts

2. **Monitor for errors**
   - Check transaction success rate
   - Review error logs
   - Monitor user reports

3. **Verify state compatibility**
   - Existing beasts load correctly
   - Account data intact
   - No data corruption

#### Rollback Procedure

If upgrade causes issues:

```bash
# Rollback to previous version
anchor upgrade target/deploy/zenbeasts_backup.so --program-id <PROGRAM_ID>

# Verify rollback
solana program show <PROGRAM_ID>

# Announce rollback
# Investigate issues
# Fix and re-test before next upgrade attempt
```

### Account Migration

If account structure changes:

1. **Create migration instruction**
   ```rust
   pub fn migrate_account(ctx: Context<MigrateAccount>) -> Result<()> {
       // Copy old data to new structure
       // Add new fields with defaults
       // Preserve critical data
   }
   ```

2. **Batch migrate accounts**
   ```typescript
   // Migrate all beast accounts
   for (const beast of allBeasts) {
       await program.methods
           .migrateAccount()
           .accounts({ beastAccount: beast })
           .rpc();
   }
   ```

3. **Verify migration**
   - Check all accounts migrated
   - Verify data integrity
   - Test functionality

---

## Monitoring and Analytics

### Event Monitoring

The program emits events for all major actions:

```rust
#[event]
pub struct BeastMinted {
    pub mint: Pubkey,
    pub owner: Pubkey,
    pub traits: [u8; 4],
    pub rarity_score: u16,
    pub generation: u8,
}

#[event]
pub struct ActivityPerformed {
    pub beast: Pubkey,
    pub owner: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct RewardsClaimed {
    pub beast: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
}

#[event]
pub struct TraitUpgraded {
    pub beast: Pubkey,
    pub trait_index: u8,
    pub new_value: u8,
    pub cost: u64,
}

#[event]
pub struct BeastBred {
    pub parent1: Pubkey,
    pub parent2: Pubkey,
    pub offspring: Pubkey,
    pub generation: u8,
}
```

### Setting Up Event Indexing

#### Using Helius Webhooks

```typescript
// Configure webhook for program events
const webhook = {
  webhookURL: "https://your-server.com/webhook",
  accountAddresses: [PROGRAM_ID],
  webhookType: "enhanced",
  transactionTypes: ["Any"],
};

// Helius will POST events to your webhook
```

#### Using Solana RPC Logs

```typescript
connection.onLogs(
  PROGRAM_ID,
  (logs) => {
    // Parse and store events
    console.log("Program logs:", logs);
  },
  "confirmed"
);
```

### Key Metrics to Track

#### User Engagement
- Daily active users (unique wallets)
- Beasts minted per day
- Activities performed per day
- Average activities per user

#### Economic Metrics
- Treasury balance over time
- ZEN tokens minted (rewards)
- ZEN tokens burned
- Net token supply change
- Average upgrade cost paid
- Average breeding cost paid

#### Beast Statistics
- Total beasts minted
- Rarity distribution (Common, Rare, etc.)
- Average rarity score
- Generation distribution
- Most upgraded beasts

#### Performance Metrics
- Transaction success rate
- Average transaction time
- RPC endpoint health
- Error rate by type

### Monitoring Dashboard

Recommended tools:
- **Grafana**: Visualize metrics
- **Prometheus**: Collect metrics
- **Helius**: Transaction monitoring
- **Solana Beach**: On-chain explorer

Example Grafana queries:
```promql
# Daily active users
count(distinct(user_wallet)) by (day)

# Treasury balance
treasury_balance_zen

# Transaction success rate
sum(rate(transactions_success[5m])) / sum(rate(transactions_total[5m]))
```

### Alerting

Set up alerts for:

**Critical**:
- Treasury balance < 100 ZEN
- Transaction success rate < 90%
- Program upgrade detected
- Authority wallet activity

**Warning**:
- Treasury balance < 500 ZEN
- Transaction success rate < 95%
- Error rate > 5%
- Unusual activity patterns

**Info**:
- Daily summary statistics
- Weekly treasury report
- Monthly user growth

---

## Emergency Procedures

### Emergency Scenarios

#### 1. Treasury Depletion

**Symptoms**:
- Reward claims failing
- Treasury balance near zero

**Actions**:
1. **Immediately reduce reward rate** to 0 or minimal
2. **Announce issue** to community
3. **Fund treasury** manually if possible
4. **Investigate cause** (exploit? misconfiguration?)
5. **Implement fix** and restore normal operations

#### 2. Exploit Detected

**Symptoms**:
- Unusual transaction patterns
- Rapid treasury depletion
- Abnormal beast minting

**Actions**:
1. **DO NOT PANIC** - assess situation first
2. **Document exploit** (transactions, accounts involved)
3. **If possible, pause affected operations** (requires program upgrade)
4. **Announce to community** with transparency
5. **Deploy fix** after thorough testing
6. **Consider compensation** for affected users

#### 3. Program Bug

**Symptoms**:
- Transactions failing unexpectedly
- Data corruption
- Incorrect calculations

**Actions**:
1. **Identify affected functionality**
2. **Announce issue** and affected operations
3. **Deploy fix** or rollback
4. **Verify fix** on devnet first
5. **Compensate users** if necessary

#### 4. Authority Wallet Compromised

**Symptoms**:
- Unauthorized configuration changes
- Unexpected transactions from authority

**Actions**:
1. **IMMEDIATELY transfer authority** to secure wallet
2. **Revert unauthorized changes**
3. **Audit all recent transactions**
4. **Announce incident** with full transparency
5. **Implement additional security** (multi-sig)

### Emergency Contacts

Maintain list of:
- Core team members (phone, Signal, etc.)
- Security auditors
- Solana Foundation contacts
- Community moderators
- Legal counsel

### Incident Response Plan

1. **Detection** (monitoring alerts)
2. **Assessment** (severity, scope, impact)
3. **Containment** (stop the bleeding)
4. **Communication** (inform stakeholders)
5. **Resolution** (fix the issue)
6. **Recovery** (restore normal operations)
7. **Post-Mortem** (document and learn)

---

## Security Best Practices

### Operational Security

**Authority Wallet**:
- Use hardware wallet
- Store offline when not in use
- Use multi-signature if possible
- Regular security audits

**RPC Endpoints**:
- Use multiple providers for redundancy
- Monitor endpoint health
- Rotate API keys regularly
- Use rate limiting

**Monitoring**:
- 24/7 monitoring of critical metrics
- Automated alerting
- Regular security reviews
- Penetration testing

### Code Security

**Before Deployment**:
- Professional security audit
- Extensive testing (unit, integration, property-based)
- Peer code review
- Fuzzing tests

**After Deployment**:
- Bug bounty program
- Continuous monitoring
- Regular updates
- Community feedback

### Access Control

**Principle of Least Privilege**:
- Only authority can update config
- Only beast owner can perform actions
- Only program can control treasury
- Validate all PDAs

**Multi-Signature**:
- Consider multi-sig for authority
- Require multiple approvals for critical actions
- Use Squads or similar multi-sig solution

---

## Maintenance Schedule

### Daily
- Check treasury balance
- Review transaction success rate
- Monitor error logs
- Check alerting system

### Weekly
- Review user growth metrics
- Analyze economic metrics
- Check for unusual patterns
- Update community on status

### Monthly
- Full security review
- Economic sustainability analysis
- Performance optimization review
- Community feedback review

### Quarterly
- Comprehensive audit
- Strategic planning
- Feature roadmap review
- Governance proposals

---

## Appendix

### Useful Commands

```bash
# Check program info
solana program show <PROGRAM_ID>

# Get program data account
solana account <PROGRAM_ID> --output json

# Get config PDA
solana account <CONFIG_PDA> --output json

# Get treasury balance
spl-token balance --address <TREASURY_ADDRESS>

# View recent transactions
solana transaction-history <AUTHORITY_WALLET> --limit 10

# Check program upgrade authority
solana program show <PROGRAM_ID> | grep "Upgrade Authority"
```

### Configuration Templates

See `scripts/initialize.ts` for initialization template.

### Contact Information

- **Technical Support**: [email]
- **Security Issues**: [security email]
- **Community**: [Discord/Telegram]
- **Documentation**: [GitHub]

---

**Last Updated**: 2024
**Version**: 0.1.0