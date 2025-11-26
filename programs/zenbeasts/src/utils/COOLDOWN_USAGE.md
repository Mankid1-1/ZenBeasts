# Cooldown Validation Utilities

This module provides comprehensive cooldown validation logic for the ZenBeasts program.

## Functions

### Activity Cooldown

#### `can_perform_activity(beast: &BeastAccount, current_time: i64, cooldown_duration: i64) -> bool`
Checks if a beast can perform an activity (cooldown has elapsed).

**Example:**
```rust
use crate::utils::cooldown;

let clock = Clock::get()?;
let config = &ctx.accounts.program_config;
let beast = &ctx.accounts.beast_account;

if cooldown::can_perform_activity(beast, clock.unix_timestamp, config.activity_cooldown) {
    // Beast can perform activity
}
```

#### `get_remaining_cooldown(beast: &BeastAccount, current_time: i64, cooldown_duration: i64) -> i64`
Returns the remaining cooldown time in seconds (0 if cooldown has elapsed).

**Example:**
```rust
let remaining = cooldown::get_remaining_cooldown(
    beast,
    clock.unix_timestamp,
    config.activity_cooldown
);
msg!("Cooldown remaining: {} seconds", remaining);
```

#### `require_not_in_cooldown(beast: &BeastAccount, current_time: i64, cooldown_duration: i64) -> Result<()>`
Validates that a beast is not in cooldown, returning `CooldownActive` error if it is.

**Example:**
```rust
// This will return an error if the beast is still in cooldown
cooldown::require_not_in_cooldown(
    beast,
    clock.unix_timestamp,
    config.activity_cooldown
)?;

// If we reach here, the beast can perform an activity
beast.update_activity(clock.unix_timestamp);
```

### Breeding Cooldown

#### `can_breed(beast: &BeastAccount, current_time: i64, breeding_cooldown: i64) -> bool`
Checks if a beast can breed (breeding cooldown has elapsed).

#### `get_remaining_breeding_cooldown(beast: &BeastAccount, current_time: i64, breeding_cooldown: i64) -> i64`
Returns the remaining breeding cooldown time in seconds.

#### `require_not_in_breeding_cooldown(beast: &BeastAccount, current_time: i64, breeding_cooldown: i64) -> Result<()>`
Validates that a beast is not in breeding cooldown, returning `BreedingCooldownActive` error if it is.

**Example:**
```rust
// Validate both parents are not in breeding cooldown
cooldown::require_not_in_breeding_cooldown(
    parent1,
    clock.unix_timestamp,
    config.breeding_cooldown
)?;

cooldown::require_not_in_breeding_cooldown(
    parent2,
    clock.unix_timestamp,
    config.breeding_cooldown
)?;

// Proceed with breeding
```

## Design Rationale

### Checked Arithmetic
All time calculations use `checked_sub` and `checked_add` to prevent overflow/underflow, returning safe defaults (0 or i64::MAX) if overflow would occur.

### Zero Timestamp Handling
Beasts with `last_activity = 0` or `last_breeding = 0` (never performed activity/breeding) are treated as having no cooldown, allowing immediate action.

### Separation of Concerns
The cooldown logic is separated from the BeastAccount struct to:
- Keep state structs focused on data storage
- Make cooldown logic reusable across instructions
- Simplify testing of cooldown calculations
- Allow easy updates to cooldown logic without modifying state structures

## Requirements Validation

This implementation satisfies:
- **Requirement 2.1**: Validates beast is not in cooldown before activity
- **Requirement 2.4**: Enforces cooldown period between activities
- **Requirement 16.2**: Enforces breeding cooldown period
