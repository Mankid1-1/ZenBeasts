# ZenBeasts Error Handling Module

This file documents all error codes and their meanings in the ZenBeasts program.

## Error Module Implementation

**File: `programs/zenbeasts/src/errors.rs`**

```rust
use anchor_lang::prelude::*;

#[error_code]
pub enum ZenBeastsError {
    #[msg("Cooldown period is still active. Please wait before performing another activity.")]
    CooldownActive,

    #[msg("You are not the owner of this beast.")]
    NotOwner,

    #[msg("Invalid trait index. Must be between 0 and 9.")]
    InvalidTraitIndex,

    #[msg("Invalid trait value for the specified layer.")]
    InvalidTraitValue,

    #[msg("Invalid trait. Trait value exceeds layer size.")]
    InvalidTrait,

    #[msg("Arithmetic overflow occurred during calculation.")]
    ArithmeticOverflow,

    #[msg("Name is too long. Maximum 32 characters.")]
    NameTooLong,

    #[msg("URI is too long. Maximum 200 characters.")]
    UriTooLong,

    #[msg("Insufficient ZEN tokens for this operation.")]
    InsufficientFunds,

    #[msg("Invalid activity type. Must be 0-2 (Meditation/Yoga/Brawl).")]
    InvalidActivityType,

    #[msg("Burn percentage must be between 0 and 100.")]
    InvalidBurnPercentage,

    #[msg("Upgrade cost must be greater than zero.")]
    InvalidUpgradeCost,

    #[msg("Authority mismatch. Only program authority can perform this action.")]
    UnauthorizedAuthority,

    #[msg("Invalid ZEN mint address.")]
    InvalidZenMint,

    #[msg("Token account mismatch. Provided account does not match expected mint.")]
    TokenAccountMismatch,

    #[msg("No rewards available to claim.")]
    NoRewardsToClaim,

    #[msg("Reward pool is empty or insufficient.")]
    InsufficientRewardPool,

    #[msg("Invalid seed value provided.")]
    InvalidSeed,

    #[msg("Metadata account derivation failed.")]
    MetadataDerivationFailed,

    #[msg("Master Edition account derivation failed.")]
    MasterEditionDerivationFailed,

    #[msg("Invalid treasury account.")]
    InvalidTreasury,

    #[msg("Transfer amount must be greater than zero.")]
    InvalidTransferAmount,

    #[msg("Burn amount exceeds available balance.")]
    InsufficientBurnAmount,

    #[msg("Trait cannot be upgraded to the same value.")]
    SameTraitValue,

    #[msg("Maximum trait value already reached for this layer.")]
    MaxTraitValueReached,

    #[msg("PDA derivation failed. Invalid seeds provided.")]
    InvalidPDADerivation,

    #[msg("Clock sysvar unavailable.")]
    ClockUnavailable,

    #[msg("Numerical overflow detected in reward calculation.")]
    RewardCalculationOverflow,

    #[msg("Staking period has not ended yet.")]
    StakingPeriodNotEnded,

    #[msg("Beast is already staked.")]
    AlreadyStaked,

    #[msg("Beast is not currently staked.")]
    NotStaked,

    #[msg("Invalid staking duration. Must be at least 1 day.")]
    InvalidStakingDuration,

    #[msg("Breeding cooldown is still active.")]
    BreedingCooldownActive,

    #[msg("Both beasts must be owned by the same address to breed.")]
    BreedingOwnershipMismatch,

    #[msg("Beast has reached maximum breeding count.")]
    MaxBreedingCountReached,

    #[msg("Invalid rarity tier for this operation.")]
    InvalidRarityTier,

    #[msg("Trait lock is active. Cannot modify traits during activities.")]
    TraitLockActive,

    #[msg("Emergency pause is active. All operations are suspended.")]
    EmergencyPauseActive,

    #[msg("Merkle proof verification failed.")]
    InvalidMerkleProof,

    #[msg("Address is not whitelisted for this operation.")]
    NotWhitelisted,

    #[msg("Batch operation limit exceeded.")]
    BatchLimitExceeded,

    #[msg("Session key has expired.")]
    SessionKeyExpired,

    #[msg("Invalid session key signature.")]
    InvalidSessionSignature,

    #[msg("Session key not authorized for this operation.")]
    SessionNotAuthorized,

    #[msg("Compressed NFT operation not available in this version.")]
    CompressedNFTNotSupported,

    #[msg("Oracle signature verification failed.")]
    InvalidOracleSignature,

    #[msg("Oracle data is stale or expired.")]
    StaleOracleData,

    #[msg("Achievement already claimed.")]
    AchievementAlreadyClaimed,

    #[msg("Achievement requirements not met.")]
    AchievementRequirementsNotMet,

    #[msg("Invalid achievement ID.")]
    InvalidAchievementId,
}
```

## Error Categories

### 1. Authentication & Authorization Errors (6000-6009)
- `NotOwner` (6001): User doesn't own the beast they're trying to interact with
- `UnauthorizedAuthority` (6012): Attempting admin operations without authority
- `SessionNotAuthorized` (6047): Session key lacks permission for operation

### 2. Validation Errors (6010-6029)
- `InvalidTraitIndex` (6002): Trait index out of bounds (0-9)
- `InvalidTraitValue` (6003): Trait value invalid for layer
- `InvalidTrait` (6004): Malformed trait data
- `NameTooLong` (6006): NFT name exceeds 32 characters
- `UriTooLong` (6007): Metadata URI exceeds 200 characters
- `InvalidActivityType` (6009): Activity type not in valid range (0-2)
- `InvalidBurnPercentage` (6010): Burn percentage outside 0-100 range
- `InvalidUpgradeCost` (6011): Upgrade cost is zero or negative
- `InvalidZenMint` (6013): Provided ZEN mint doesn't match config
- `TokenAccountMismatch` (6014): Token account mint mismatch

### 3. State & Timing Errors (6030-6039)
- `CooldownActive` (6000): Activity cooldown period hasn't elapsed
- `NoRewardsToClaim` (6015): No pending rewards in account
- `StakingPeriodNotEnded` (6028): Cannot unstake before period ends
- `AlreadyStaked` (6029): Beast is already in staking vault
- `NotStaked` (6030): Beast not currently staked
- `BreedingCooldownActive` (6033): Breeding cooldown hasn't passed
- `TraitLockActive` (6039): Traits locked during activity

### 4. Economic Errors (6040-6049)
- `InsufficientFunds` (6008): Not enough ZEN tokens for operation
- `InsufficientRewardPool` (6016): Reward vault depleted
- `InvalidTransferAmount` (6020): Transfer amount is zero
- `InsufficientBurnAmount` (6021): Attempting to burn more than balance
- `RewardCalculationOverflow` (6027): Reward math overflow

### 5. Logic Errors (6050-6059)
- `SameTraitValue` (6022): Upgrading to current value
- `MaxTraitValueReached` (6023): Trait already at maximum
- `MaxBreedingCountReached` (6035): Breeding limit reached
- `AchievementAlreadyClaimed` (6050): Achievement previously claimed
- `AchievementRequirementsNotMet` (6051): Conditions not satisfied

### 6. System Errors (6060-6069)
- `ArithmeticOverflow` (6005): Numerical overflow in calculation
- `InvalidPDADerivation` (6024): PDA seeds invalid
- `ClockUnavailable` (6025): Cannot read Clock sysvar
- `MetadataDerivationFailed` (6018): Metadata PDA derivation error
- `MasterEditionDerivationFailed` (6019): Master edition PDA error

### 7. Advanced Feature Errors (6070-6079)
- `EmergencyPauseActive` (6040): Program in emergency pause state
- `InvalidMerkleProof` (6041): Whitelist merkle proof invalid
- `NotWhitelisted` (6042): Address not in whitelist
- `BatchLimitExceeded` (6043): Batch operation too large
- `SessionKeyExpired` (6044): Session key past expiration
- `InvalidSessionSignature` (6045): Session key signature invalid
- `CompressedNFTNotSupported` (6046): cNFT feature not enabled
- `InvalidOracleSignature` (6048): Oracle data signature invalid
- `StaleOracleData` (6049): Oracle data too old

## Usage Examples

### In Instruction Handlers

```rust
// Check ownership
require!(
    beast.owner == ctx.accounts.user.key(),
    ZenBeastsError::NotOwner
);

// Validate cooldown
require!(
    beast.can_perform_activity(current_time, config.activity_cooldown),
    ZenBeastsError::CooldownActive
);

// Validate trait index
require!(
    trait_index < 10,
    ZenBeastsError::InvalidTraitIndex
);

// Check sufficient funds
require!(
    user_balance >= required_amount,
    ZenBeastsError::InsufficientFunds
);
```

### Error Handling in Client

```typescript
try {
  await program.methods
    .performActivity(activityType)
    .accounts({ /* ... */ })
    .rpc();
} catch (err) {
  if (err.error.errorCode.code === 'CooldownActive') {
    console.log('Please wait before performing another activity');
  } else if (err.error.errorCode.code === 'NotOwner') {
    console.log('You do not own this beast');
  } else {
    console.error('Unexpected error:', err);
  }
}
```

## Best Practices

1. **Always use specific error codes** instead of generic ones
2. **Include helpful error messages** that guide users toward resolution
3. **Log errors with context** for debugging (mint address, owner, etc.)
4. **Handle overflows explicitly** using checked arithmetic
5. **Validate all inputs early** before performing expensive operations
6. **Document error conditions** in function docstrings

## Future Error Codes

Reserved ranges for upcoming features:

- **6080-6089**: Governance & DAO operations
- **6090-6099**: Cross-program invocation errors
- **6100-6109**: Advanced indexing errors
- **6110-6119**: Mobile & session key advanced errors
- **6120-6129**: Reserved for future use

## Error Code Conventions

- **6000-6099**: User-facing errors (can be recovered from)
- **6100-6199**: System errors (require admin intervention)
- **6200-6299**: Integration errors (external programs/oracles)
- **6300-6399**: Reserved for extensions

## Testing Error Handling

```rust
#[cfg(test)]
mod error_tests {
    use super::*;
    
    #[test]
    fn test_cooldown_active_error() {
        // Test that cooldown error is properly returned
        let err = perform_activity_during_cooldown();
        assert_eq!(err, ZenBeastsError::CooldownActive);
    }
    
    #[test]
    fn test_ownership_validation() {
        // Test that non-owners cannot perform operations
        let err = upgrade_trait_as_non_owner();
        assert_eq!(err, ZenBeastsError::NotOwner);
    }
}
```

## Error Monitoring

For production deployment, monitor error frequencies:

```javascript
// Backend error tracking
const errorCounts = {
  'CooldownActive': 0,
  'InsufficientFunds': 0,
  'NotOwner': 0,
  // ... other errors
};

// Track error patterns
function trackError(errorCode) {
  errorCounts[errorCode] = (errorCounts[errorCode] || 0) + 1;
  
  // Alert if error spike detected
  if (errorCounts[errorCode] > THRESHOLD) {
    alertOps(`Error spike detected: ${errorCode}`);
  }
}
```

## References

- [Anchor Error Handling Guide](https://www.anchor-lang.com/docs/errors)
- [Solana Program Error Codes](https://docs.solana.com/developing/programming-model/transactions#error-codes)
- [Rust Error Handling Best Practices](https://doc.rust-lang.org/book/ch09-00-error-handling.html)