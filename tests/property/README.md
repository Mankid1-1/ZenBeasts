# Property-Based Tests for ZenBeasts

This directory will contain property-based tests using `fast-check` for frontend and `proptest` for Rust.

## Overview

Property-based testing validates that code satisfies general properties across a wide range of inputs, rather than testing specific examples. This approach is particularly valuable for:

- Validating invariants (e.g., rarity scores always within bounds)
- Testing edge cases automatically (e.g., trait value boundaries)
- Ensuring consistency across operations (e.g., token balance changes)

## Frontend Property Tests (TypeScript + fast-check)

**Status**: Not yet implemented

Will be located in `tests/property/frontend/`

Run with: `cd frontend && npm test -- property`

### Setup
```bash
cd frontend
npm install --save-dev fast-check @types/jest
```

## Rust Property Tests (proptest)

**Status**: Not yet implemented

Will be located in `tests/property/rust/` or inline with unit tests

Run with: `cargo test --test property_tests`

### Setup
Add to `programs/zenbeasts/Cargo.toml`:
```toml
[dev-dependencies]
proptest = "1.0"
```

## Test Coverage Plan

See `.kiro/specs/zenbeasts-gaming-network/tasks.md` for the complete list of 50+ property tests planned, organized by feature area:

- Trait generation and bounds validation
- Rarity calculation invariants
- Cooldown enforcement
- Token transfer correctness
- Breeding mechanics validation
- Security validations (PDA, arithmetic safety)
- UI state consistency

## Creating New Property Tests

### Frontend Example (fast-check)
```typescript
import fc from 'fast-check';

test('trait values always in range [0, 255]', () => {
  fc.assert(
    fc.property(fc.integer(), (seed) => {
      const traits = generateTraits(seed);
      return traits.every(t => t >= 0 && t <= 255);
    })
  );
});
```

### Rust Example (proptest)
```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn rarity_score_within_bounds(
        strength in 0u8..=255,
        agility in 0u8..=255,
        wisdom in 0u8..=255,
        vitality in 0u8..=255
    ) {
        let score = calculate_rarity(strength, agility, wisdom, vitality);
        prop_assert!(score <= 1020);
    }
}
```
