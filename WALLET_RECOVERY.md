# ZenBeasts Wallet Recovery Guide

**Requirement 23.1: Document wallet recovery procedures**

This guide provides step-by-step instructions for recovering access to your ZenBeasts wallets in case of loss or compromise.

## Table of Contents

1. [Understanding Wallet Types](#understanding-wallet-types)
2. [Backup Best Practices](#backup-best-practices)
3. [Recovery Procedures](#recovery-procedures)
4. [Emergency Scenarios](#emergency-scenarios)
5. [Security Recommendations](#security-recommendations)

## Understanding Wallet Types

### User Wallets

User wallets hold:
- SOL for transaction fees
- ZEN tokens for gameplay
- Beast NFTs

**Recovery Method**: Seed phrase (12 or 24 words)

### Program Authority Wallets

Authority wallets control:
- Program upgrades
- Configuration updates
- Treasury management

**Recovery Method**: Keypair file + seed phrase backup

### Treasury Wallets

Treasury wallets hold:
- ZEN tokens for reward distribution
- Tokens from economic operations

**Recovery Method**: Program-derived address (PDA) - controlled by program

## Backup Best Practices

### What to Backup

1. **Seed Phrase** (Most Important)
   - 12 or 24 words generated when creating wallet
   - Write down on paper (never digital)
   - Store in multiple secure locations

2. **Keypair File**
   - JSON file containing private key
   - Encrypted backup recommended
   - Store separately from seed phrase

3. **Public Key/Address**
   - Safe to store digitally
   - Useful for verification

### Where to Store Backups

#### Recommended Storage Locations

1. **Physical Storage** (Highest Security)
   - Fireproof safe
   - Bank safety deposit box
   - Multiple secure locations

2. **Encrypted Digital Storage** (Moderate Security)
   - Password-protected USB drive
   - Encrypted cloud storage (e.g., 1Password, LastPass)
   - Hardware security module (HSM)

3. **Never Store Here** (Insecure)
   - ❌ Plain text files on computer
   - ❌ Email or messaging apps
   - ❌ Screenshots or photos
   - ❌ Unencrypted cloud storage
   - ❌ Browser password managers

### Backup Checklist

- [ ] Seed phrase written on paper
- [ ] Seed phrase stored in 2+ secure locations
- [ ] Keypair file backed up (encrypted)
- [ ] Public key recorded for verification
- [ ] Recovery procedure tested
- [ ] Backup locations documented (securely)
- [ ] Trusted person knows backup locations (optional)

## Recovery Procedures

### Scenario 1: Lost Keypair File (Have Seed Phrase)

**Time Required**: 5 minutes  
**Difficulty**: Easy

#### Steps

1. **Prepare Recovery Environment**
   ```bash
   # Ensure Solana CLI is installed
   solana --version
   
   # If not installed:
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

2. **Recover Wallet from Seed Phrase**
   ```bash
   # Start recovery process
   solana-keygen recover --outfile ~/.config/solana/recovered-wallet.json
   
   # You will be prompted to enter your seed phrase
   # Enter each word carefully, separated by spaces
   ```

3. **Verify Recovery**
   ```bash
   # Check the public key
   solana-keygen pubkey ~/.config/solana/recovered-wallet.json
   
   # Compare with your recorded public key
   # They should match exactly
   ```

4. **Test Wallet Access**
   ```bash
   # Set as default wallet
   solana config set --keypair ~/.config/solana/recovered-wallet.json
   
   # Check balance
   solana balance
   
   # If balance matches expectations, recovery successful!
   ```

5. **Create New Backup**
   ```bash
   # Create encrypted backup
   cp ~/.config/solana/recovered-wallet.json ~/backups/wallet-backup-$(date +%Y%m%d).json
   
   # Encrypt the backup (example using gpg)
   gpg --symmetric --cipher-algo AES256 ~/backups/wallet-backup-$(date +%Y%m%d).json
   ```

### Scenario 2: Lost Seed Phrase (Have Keypair File)

**Time Required**: 2 minutes  
**Difficulty**: Easy

#### Steps

1. **Locate Keypair File**
   ```bash
   # Common locations:
   # ~/.config/solana/id.json
   # ~/.config/solana/zenbeasts-deploy.json
   # ~/backups/wallet-backup.json
   ```

2. **Extract Public Key**
   ```bash
   # Get public key from keypair
   solana-keygen pubkey /path/to/keypair.json
   ```

3. **Verify Wallet Access**
   ```bash
   # Set as default wallet
   solana config set --keypair /path/to/keypair.json
   
   # Check balance
   solana balance
   ```

4. **Generate New Seed Phrase** (Recommended)
   
   For better security, transfer funds to a new wallet with a known seed phrase:
   
   ```bash
   # Create new wallet with seed phrase
   solana-keygen new --outfile ~/.config/solana/new-wallet.json
   
   # IMPORTANT: Write down the seed phrase displayed!
   
   # Transfer all assets to new wallet
   NEW_ADDRESS=$(solana-keygen pubkey ~/.config/solana/new-wallet.json)
   
   # Transfer SOL
   solana transfer $NEW_ADDRESS ALL --allow-unfunded-recipient
   
   # Transfer ZEN tokens (use SPL token transfer)
   spl-token transfer <ZEN_MINT> ALL $NEW_ADDRESS
   
   # Transfer NFTs (use Metaplex or wallet UI)
   ```

### Scenario 3: Compromised Wallet

**Time Required**: 15-30 minutes  
**Difficulty**: Moderate  
**Urgency**: IMMEDIATE ACTION REQUIRED

#### Immediate Steps

1. **Create New Secure Wallet**
   ```bash
   # Create new wallet immediately
   solana-keygen new --outfile ~/.config/solana/emergency-wallet.json
   
   # WRITE DOWN THE SEED PHRASE IMMEDIATELY
   ```

2. **Transfer Assets Quickly**
   
   Transfer in this order (fastest to slowest):
   
   a. **SOL** (Fastest)
   ```bash
   NEW_ADDRESS=$(solana-keygen pubkey ~/.config/solana/emergency-wallet.json)
   solana transfer $NEW_ADDRESS ALL --allow-unfunded-recipient
   ```
   
   b. **ZEN Tokens**
   ```bash
   spl-token transfer <ZEN_MINT> ALL $NEW_ADDRESS
   ```
   
   c. **Beast NFTs**
   ```bash
   # Use wallet UI or Metaplex CLI to transfer each NFT
   # Or use a batch transfer script if available
   ```

3. **Revoke Permissions**
   
   If you granted any token approvals:
   ```bash
   # Revoke all token approvals
   spl-token revoke <TOKEN_ACCOUNT>
   ```

4. **Monitor Old Wallet**
   ```bash
   # Watch for unauthorized transactions
   solana transaction-history <OLD_WALLET_ADDRESS>
   ```

5. **Update All Services**
   - Update wallet address in all connected apps
   - Update any recurring payments or subscriptions
   - Notify any services using the old address

### Scenario 4: Program Authority Recovery

**Time Required**: 30-60 minutes  
**Difficulty**: Advanced  
**Urgency**: HIGH (if program needs updates)

#### Prerequisites

- Access to authority wallet seed phrase or keypair
- Knowledge of current program ID
- Backup of program configuration

#### Steps

1. **Recover Authority Wallet**
   ```bash
   # Recover from seed phrase
   solana-keygen recover --outfile ~/.config/solana/authority-recovered.json
   ```

2. **Verify Authority**
   ```bash
   # Check program authority
   solana program show <PROGRAM_ID>
   
   # Verify the authority matches your recovered wallet
   RECOVERED_PUBKEY=$(solana-keygen pubkey ~/.config/solana/authority-recovered.json)
   echo "Recovered pubkey: $RECOVERED_PUBKEY"
   ```

3. **Test Authority Access**
   ```bash
   # Try a non-critical operation (e.g., query config)
   solana config set --keypair ~/.config/solana/authority-recovered.json
   
   # Fetch program config
   anchor account ProgramConfig <CONFIG_PDA>
   ```

4. **Secure New Authority** (Recommended)
   
   For production, transfer authority to a more secure setup:
   
   ```bash
   # Create multi-sig or hardware wallet
   # Transfer program authority
   solana program set-upgrade-authority <PROGRAM_ID> \
     --new-upgrade-authority <NEW_SECURE_ADDRESS>
   ```

## Emergency Scenarios

### Scenario A: Wallet Drained by Attacker

**What Happened**: Unauthorized transactions emptied your wallet

**Immediate Actions**:

1. **Do NOT use the compromised wallet**
2. **Create new wallet** (see Scenario 3)
3. **Document the incident**:
   - Transaction signatures
   - Timestamps
   - Amounts stolen
   - Attacker addresses

4. **Report to authorities** (if significant loss)
5. **Analyze how compromise occurred**:
   - Phishing attack?
   - Malware?
   - Seed phrase exposure?

**Prevention**:
- Never enter seed phrase on websites
- Use hardware wallets for large amounts
- Enable transaction signing notifications
- Regular security audits

### Scenario B: Lost All Backups

**What Happened**: No seed phrase, no keypair file

**Reality Check**: **Wallet is unrecoverable**

Solana wallets are non-custodial. Without the seed phrase or keypair:
- No one can recover your wallet
- Not Solana, not ZenBeasts, not anyone
- Assets are permanently inaccessible

**Lessons Learned**:
- Always maintain multiple backups
- Test recovery procedures regularly
- Consider using a hardware wallet
- Document backup locations securely

### Scenario C: Forgot Wallet Password

**What Happened**: Wallet is password-protected, forgot password

**Solution**: Depends on wallet type

1. **Solana CLI Wallet**:
   - CLI wallets are not password-protected by default
   - If you encrypted the file, you need the encryption password
   - If using BIP39 passphrase, you need that passphrase

2. **Browser Extension Wallet** (Phantom, Solflare):
   - Use seed phrase to restore in new browser/device
   - Password only protects local access

3. **Hardware Wallet**:
   - Use PIN recovery procedures specific to device
   - May require seed phrase if PIN attempts exhausted

### Scenario D: Wallet on Lost/Stolen Device

**What Happened**: Device with wallet access was lost or stolen

**Immediate Actions**:

1. **Assess Risk**:
   - Was wallet password-protected?
   - Was device encrypted?
   - How much time before device could be accessed?

2. **If High Risk** (unencrypted, no password):
   - Follow "Compromised Wallet" procedure immediately
   - Transfer all assets to new wallet ASAP

3. **If Low Risk** (encrypted, strong password):
   - Create new wallet as precaution
   - Monitor old wallet for unauthorized activity
   - Transfer assets when convenient

4. **Remote Wipe** (if possible):
   - Use Find My Device (iOS/Android)
   - Wipe device remotely if feature enabled

## Security Recommendations

### For Users

1. **Use Hardware Wallets** for significant holdings
   - Ledger
   - Trezor
   - Solana-compatible hardware wallets

2. **Enable Security Features**
   - Transaction signing notifications
   - Biometric authentication
   - Multi-factor authentication (where available)

3. **Practice Good Hygiene**
   - Never share seed phrases
   - Verify website URLs carefully
   - Don't click suspicious links
   - Keep software updated

4. **Regular Audits**
   - Review connected apps monthly
   - Check transaction history
   - Verify backup integrity
   - Test recovery procedures annually

### For Program Authorities

1. **Use Multi-Signature Wallets**
   - Require multiple approvals for critical operations
   - Distribute keys among trusted parties

2. **Implement Time Locks**
   - Delay for critical parameter changes
   - Allow community review period

3. **Hardware Security Modules**
   - Use HSMs for production keys
   - Never store keys on internet-connected devices

4. **Regular Key Rotation**
   - Rotate non-critical keys quarterly
   - Document rotation procedures

5. **Incident Response Plan**
   - Document emergency procedures
   - Maintain emergency contact list
   - Practice incident response drills

## Testing Your Recovery

### Monthly Test

1. **Verify Backup Accessibility**
   - Can you access all backup locations?
   - Are backups still readable?

2. **Verify Seed Phrase**
   - Check that seed phrase is complete
   - Verify it's stored securely

### Quarterly Test

1. **Practice Recovery**
   - Recover wallet in test environment
   - Verify public key matches
   - Test transaction signing

2. **Update Documentation**
   - Update this guide with lessons learned
   - Document any changes to procedures

### Annual Test

1. **Full Recovery Drill**
   - Simulate complete loss scenario
   - Recover all wallets
   - Verify all assets accessible

2. **Security Audit**
   - Review all backup locations
   - Update security measures
   - Rotate keys if necessary

## Support and Resources

### Getting Help

- **ZenBeasts Discord**: [Link]
- **Solana Support**: https://solana.com/community
- **Wallet-Specific Support**:
  - Phantom: https://phantom.app/help
  - Solflare: https://solflare.com/support

### Additional Resources

- [Solana Wallet Guide](https://docs.solana.com/wallet-guide)
- [Seed Phrase Security](https://www.ledger.com/academy/crypto/what-is-a-recovery-phrase)
- [Hardware Wallet Comparison](https://www.ledger.com/academy/hardware-wallets-and-cold-wallets-whats-the-difference)

## Legal Disclaimer

This guide is provided for informational purposes only. ZenBeasts and its developers:

- Cannot recover lost wallets or seed phrases
- Are not responsible for lost or stolen assets
- Recommend consulting security professionals for high-value holdings
- Advise users to understand risks before participating

**Remember**: You are solely responsible for the security of your wallet and assets. Always maintain secure backups and practice good security hygiene.

---

**Last Updated**: 2024-01-XX  
**Version**: 1.0
