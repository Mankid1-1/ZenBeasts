# ZenBeasts User Guide

Welcome to ZenBeasts! This guide will help you get started with minting, managing, and playing with your beast NFTs on Solana.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Wallet Setup](#wallet-setup)
3. [Game Mechanics](#game-mechanics)
4. [Troubleshooting](#troubleshooting)
5. [Wallet Recovery](#wallet-recovery)
6. [Mobile Wallet Setup](#mobile-wallet-setup)

---

## Getting Started

### What is ZenBeasts?

ZenBeasts is a Solana-based NFT game where you:
- **Mint** unique beast NFTs with randomized traits
- **Perform activities** to earn ZEN tokens (with cooldown periods)
- **Upgrade traits** using ZEN tokens to increase rarity
- **Breed beasts** to create offspring with inherited traits
- **Trade beasts** on Solana NFT marketplaces

### Quick Start

1. **Connect your Solana wallet** (Phantom, Solflare, etc.)
2. **Mint your first beast** - Each beast has unique traits
3. **Perform activities** - Earn ZEN tokens (1 hour cooldown)
4. **Claim rewards** - Transfer earned ZEN to your wallet
5. **Upgrade or breed** - Use ZEN to improve your beasts

---

## Wallet Setup

### Desktop Wallet Setup

#### Phantom Wallet (Recommended)

1. **Install Phantom**
   - Visit [phantom.app](https://phantom.app)
   - Click "Download" and install the browser extension
   - Available for Chrome, Firefox, Brave, and Edge

2. **Create a New Wallet**
   - Click "Create New Wallet"
   - **CRITICAL**: Write down your 12-word recovery phrase
   - Store it in a safe place (never share it!)
   - Confirm your recovery phrase

3. **Fund Your Wallet**
   - Copy your wallet address (click to copy)
   - For devnet testing: Use [Solana Faucet](https://faucet.solana.com)
   - For mainnet: Transfer SOL from an exchange

4. **Connect to ZenBeasts**
   - Visit the ZenBeasts app
   - Click "Connect Wallet"
   - Select "Phantom" from the list
   - Approve the connection

#### Solflare Wallet

1. **Install Solflare**
   - Visit [solflare.com](https://solflare.com)
   - Download browser extension or mobile app

2. **Create Wallet**
   - Follow the same recovery phrase process as Phantom
   - **Save your recovery phrase securely**

3. **Connect to ZenBeasts**
   - Click "Connect Wallet" in the app
   - Select "Solflare"
   - Approve connection

### Important Wallet Security Tips

⚠️ **NEVER share your recovery phrase with anyone**
⚠️ **NEVER enter your recovery phrase on any website**
⚠️ **Always verify the website URL before connecting**
⚠️ **Keep your recovery phrase offline and secure**

---

## Game Mechanics

### Beast Traits

Each beast has **four core traits** (values 0-255):
- **💪 Strength** - Physical power
- **⚡ Agility** - Speed and reflexes
- **🧠 Wisdom** - Intelligence and strategy
- **❤️ Vitality** - Health and endurance

**Rarity Score** = Sum of all trait values (0-1020)

### Rarity Tiers

| Tier | Rarity Score | Description |
|------|--------------|-------------|
| **Common** | 0-400 | Standard beasts |
| **Uncommon** | 401-600 | Above average |
| **Rare** | 601-800 | Exceptional |
| **Epic** | 801-950 | Very rare |
| **Legendary** | 951-1020 | Extremely rare |

### Minting Beasts

1. **Click "Mint Beast"** in the app
2. **Review transaction fee** (displayed in SOL)
3. **Approve transaction** in your wallet
4. **Wait for confirmation** (usually 5-10 seconds)
5. **View your new beast** in "My Beasts"

**Cost**: Transaction fees only (no minting cost)
**Traits**: Randomly generated on-chain
**Generation**: Gen 0 (minted beasts)

### Activities & Rewards

#### How Activities Work

1. **Select a beast** from your collection
2. **Click "Perform Activity"**
3. **Wait for cooldown** (1 hour default)
4. **Rewards accumulate** based on time elapsed
5. **Claim rewards** to receive ZEN tokens

#### Cooldown System

- **Duration**: 1 hour (configurable by program authority)
- **Enforcement**: On-chain (cannot be bypassed)
- **Display**: Shows remaining time in beast card
- **Status**: "Ready" when cooldown complete

#### Reward Calculation

```
Rewards = Time Elapsed (seconds) × Reward Rate
Default Rate: 2,777 lamports per second ≈ 0.01 ZEN/hour
```

**Example**: 1 hour activity = ~0.01 ZEN tokens

### Claiming Rewards

1. **View accumulated rewards** on beast card
2. **Click "Claim Rewards"**
3. **Approve transaction** (includes small SOL fee)
4. **ZEN tokens** transferred to your wallet
5. **Pending rewards** reset to zero

**Batch Claiming**: Claim from multiple beasts in one transaction (coming soon)

### Upgrading Traits

#### How Upgrades Work

1. **Select a beast** to upgrade
2. **Choose a trait** (Strength, Agility, Wisdom, Vitality)
3. **Review cost** (scales with current trait value)
4. **Approve transaction**
5. **Trait increases by +1**, rarity recalculated

#### Upgrade Costs

```
Cost = Base Cost × (1 + Current Trait Value / Scaling Factor)
```

- **Base Cost**: Configurable (default: 1 ZEN)
- **Scaling**: Higher traits cost more to upgrade
- **Max Value**: 255 per trait
- **Token Burn**: Percentage of cost is burned (deflationary)

**Example Costs**:
- Trait 0 → 1: ~1 ZEN
- Trait 100 → 101: ~2 ZEN
- Trait 200 → 201: ~3 ZEN

### Breeding Beasts

#### Breeding Requirements

✅ **Own both parent beasts**
✅ **Parents not in breeding cooldown**
✅ **Parents haven't reached max breeding count**
✅ **Sufficient ZEN tokens for breeding cost**

#### How Breeding Works

1. **Select two parent beasts** you own
2. **Review breeding cost** (scales with generation)
3. **Preview offspring traits** (inherited with variation)
4. **Approve transaction**
5. **New beast minted** with inherited traits

#### Trait Inheritance

```
Offspring Trait = Average(Parent1, Parent2) + Random(-20, +20)
Clamped to [0, 255]
```

**Example**:
- Parent 1 Strength: 150
- Parent 2 Strength: 180
- Average: 165
- Random variation: -10
- **Offspring Strength: 155**

#### Generation System

```
Offspring Generation = Max(Parent1 Gen, Parent2 Gen) + 1
```

- **Gen 0**: Minted beasts
- **Gen 1**: Offspring of Gen 0 parents
- **Gen 2**: Offspring with at least one Gen 1 parent
- **Higher generations**: Cost more to breed

#### Breeding Costs

```
Cost = Base Cost × Generation Multiplier ^ Max Parent Generation
```

- **Base Cost**: Configurable (default: 5 ZEN)
- **Generation Multiplier**: 1.5x per generation
- **Cooldown**: 24 hours (configurable)
- **Max Breeding Count**: 5 per beast (configurable)

**Example Costs**:
- Gen 0 × Gen 0: 5 ZEN
- Gen 1 × Gen 1: 7.5 ZEN
- Gen 2 × Gen 2: 11.25 ZEN

### Trading Beasts

#### Marketplace Integration

ZenBeasts NFTs are **standard Metaplex NFTs** and can be traded on:
- Magic Eden
- Tensor
- Solanart
- Any Solana NFT marketplace

#### How to List Your Beast

1. **Visit a marketplace** (e.g., Magic Eden)
2. **Connect your wallet**
3. **Find your beast** in "My NFTs"
4. **Set a price** in SOL
5. **List for sale**

#### After Transfer

- **New owner** can immediately use the beast
- **Pending rewards** transfer with the beast
- **Activity history** preserved
- **Traits unchanged**

---

## Troubleshooting

### Common Issues

#### "Insufficient SOL for transaction"

**Problem**: Not enough SOL to pay transaction fees

**Solution**:
1. Check your SOL balance (top right of app)
2. Need at least 0.01 SOL for transactions
3. For devnet: Use [Solana Faucet](https://faucet.solana.com)
4. For mainnet: Transfer SOL from exchange

#### "Beast is in cooldown"

**Problem**: Trying to perform activity during cooldown period

**Solution**:
1. Check remaining cooldown time on beast card
2. Wait for cooldown to complete
3. "Ready" status means you can perform activity
4. Cooldown is enforced on-chain (cannot be bypassed)

#### "Insufficient ZEN tokens"

**Problem**: Not enough ZEN for upgrade or breeding

**Solution**:
1. Perform activities to earn ZEN
2. Claim accumulated rewards
3. Check ZEN balance in wallet
4. Wait for more rewards to accumulate

#### "Transaction failed"

**Problem**: Transaction rejected by blockchain

**Common Causes**:
- Network congestion
- Insufficient SOL for fees
- Invalid operation (e.g., cooldown active)
- RPC endpoint issues

**Solution**:
1. Check error message for specific reason
2. Ensure sufficient SOL balance
3. Try again after a few seconds
4. If persists, try different RPC endpoint

#### "Wallet won't connect"

**Problem**: Cannot connect wallet to app

**Solution**:
1. Refresh the page
2. Ensure wallet extension is installed and unlocked
3. Try different browser
4. Clear browser cache
5. Check wallet is on correct network (devnet/mainnet)

#### "Beast not showing up"

**Problem**: Minted beast doesn't appear in collection

**Solution**:
1. Wait 10-30 seconds for blockchain confirmation
2. Refresh the page
3. Check transaction on Solana Explorer
4. Verify wallet address is correct
5. Check network (devnet vs mainnet)

### Network Issues

#### Slow Transactions

- **Cause**: Network congestion
- **Solution**: Add priority fee (coming soon) or wait for lower traffic

#### RPC Errors

- **Cause**: RPC endpoint overloaded
- **Solution**: App automatically retries with backup endpoints

### Error Messages Explained

| Error | Meaning | Solution |
|-------|---------|----------|
| `InsufficientFunds` | Not enough ZEN tokens | Earn more ZEN through activities |
| `BeastInCooldown` | Cooldown period active | Wait for cooldown to complete |
| `TraitMaxReached` | Trait already at 255 | Cannot upgrade further |
| `BreedingCooldownActive` | Parent in breeding cooldown | Wait 24 hours since last breed |
| `MaxBreedingReached` | Parent bred 5 times | Cannot breed this beast anymore |
| `Unauthorized` | Not the beast owner | Only owner can perform action |

---

## Wallet Recovery

### If You Lose Access to Your Wallet

#### Recovery Phrase Method (Recommended)

1. **Locate your recovery phrase**
   - 12 or 24 words you wrote down during wallet creation
   - **This is the ONLY way to recover your wallet**

2. **Install wallet software**
   - Download Phantom, Solflare, or your preferred wallet
   - Choose "Import Wallet" or "Restore Wallet"

3. **Enter recovery phrase**
   - Type each word in correct order
   - Double-check spelling
   - Click "Import"

4. **Verify recovery**
   - Check your wallet address matches
   - Verify your beasts and tokens are visible
   - Test a small transaction

#### What If I Lost My Recovery Phrase?

⚠️ **CRITICAL**: Without your recovery phrase, your wallet **CANNOT be recovered**

- No one can help you recover it (not even Solana or wallet providers)
- Your beasts and tokens are **permanently inaccessible**
- This is why securing your recovery phrase is essential

**Prevention**:
- Write recovery phrase on paper (not digital)
- Store in multiple secure locations
- Consider metal backup plates for fire/water resistance
- Never take photos or store in cloud services

### Wallet Security Best Practices

✅ **DO**:
- Write recovery phrase on paper
- Store in fireproof/waterproof safe
- Keep multiple copies in secure locations
- Use hardware wallet for large amounts
- Verify website URLs before connecting

❌ **DON'T**:
- Share recovery phrase with anyone
- Store recovery phrase digitally
- Enter recovery phrase on websites
- Use same password across multiple sites
- Connect to unknown/suspicious websites

### Compromised Wallet

If you suspect your wallet is compromised:

1. **Create new wallet immediately**
2. **Transfer all assets** to new wallet
3. **Never use compromised wallet again**
4. **Review recent transactions** for unauthorized activity
5. **Report to marketplace** if NFTs were stolen

---

## Mobile Wallet Setup

### Mobile Wallet Options

#### Phantom Mobile

1. **Download Phantom app**
   - iOS: App Store
   - Android: Google Play Store

2. **Create or Import Wallet**
   - New wallet: Save recovery phrase securely
   - Existing wallet: Import using recovery phrase

3. **Connect to ZenBeasts**
   - Open ZenBeasts in mobile browser
   - Tap "Connect Wallet"
   - Select "Phantom"
   - App will open automatically
   - Approve connection

#### Solflare Mobile

1. **Download Solflare app**
   - Available on iOS and Android

2. **Setup Wallet**
   - Follow in-app instructions
   - **Save recovery phrase securely**

3. **Connect to ZenBeasts**
   - Use in-app browser or external browser
   - Tap "Connect Wallet"
   - Select "Solflare"
   - Approve connection

### Mobile-Specific Features

- **Touch-friendly buttons**: Larger tap targets for mobile
- **Responsive layout**: Single-column view on mobile
- **Deep linking**: Seamless wallet app integration
- **Mobile-optimized**: Fast loading and smooth scrolling

### Mobile Tips

- **Use WiFi** for transactions (more reliable than cellular)
- **Keep app updated** for latest features and security
- **Enable biometric auth** in wallet app for security
- **Test with small amounts** first

---

## Getting Help

### Support Resources

- **Discord**: [Join our community](#) (coming soon)
- **Twitter**: [@ZenBeasts](#) (coming soon)
- **GitHub**: [Report issues](https://github.com/zenbeasts/zenbeasts)
- **Documentation**: [Technical docs](./TECHNICAL_GUIDE.md)

### Frequently Asked Questions

**Q: How much does it cost to mint a beast?**
A: Only Solana transaction fees (~0.001-0.01 SOL). No minting cost.

**Q: Can I play on mobile?**
A: Yes! ZenBeasts is fully mobile-responsive with mobile wallet support.

**Q: How long is the activity cooldown?**
A: Default is 1 hour, but configurable by program authority.

**Q: What happens to my beast if I sell it?**
A: New owner gets full control, including any pending rewards.

**Q: Can I breed beasts I don't own?**
A: No, you must own both parent beasts to breed them.

**Q: Is there a max trait value?**
A: Yes, each trait maxes out at 255.

**Q: How many times can a beast breed?**
A: Default maximum is 5 times per beast (configurable).

**Q: Where do ZEN tokens come from?**
A: Earned through activities, distributed from program treasury.

**Q: What is token burning?**
A: A percentage of upgrade/breeding costs are permanently removed from supply (deflationary).

---

## Glossary

- **Beast**: Your NFT creature with unique traits
- **Trait**: Individual attribute (Strength, Agility, Wisdom, Vitality)
- **Rarity Score**: Sum of all trait values (0-1020)
- **Activity**: Time-gated action to earn rewards
- **Cooldown**: Waiting period between activities
- **ZEN**: In-game token for upgrades and breeding
- **Generation**: Lineage depth (Gen 0 = minted, Gen 1+ = bred)
- **PDA**: Program Derived Address (on-chain account)
- **Lamports**: Smallest unit of SOL (1 SOL = 1 billion lamports)

---

## Version History

- **v0.1.0** (2024): Initial release
  - Beast minting with random traits
  - Activity system with cooldowns
  - Reward claiming
  - Trait upgrades
  - Beast breeding
  - Mobile support

---

**Happy Beast Collecting! 🐉**