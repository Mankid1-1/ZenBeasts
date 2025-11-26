use anchor_lang::prelude::*;
use crate::state::{BeastAccount, ProgramConfig};
use crate::errors::ZenBeastsError;

/// Check if a beast has reached the maximum breeding count
/// Returns true if the beast can still breed (count < max)
/// Returns false if the beast has reached the limit
pub fn can_breed_count(beast: &BeastAccount, max_breeding_count: u8) -> bool {
    beast.breeding_count < max_breeding_count
}

/// Validate that a beast has not reached the maximum breeding count
pub fn require_breeding_count_available(
    beast: &BeastAccount,
    max_breeding_count: u8,
) -> Result<()> {
    require!(
        can_breed_count(beast, max_breeding_count),
        ZenBeastsError::MaxBreedingReached
    );
    Ok(())
}

/// Calculate the generation-based breeding cost
/// Formula: breeding_base_cost × generation_multiplier^max(parent_generations)
/// 
/// # Arguments
/// * `parent_a` - First parent beast
/// * `parent_b` - Second parent beast
/// * `config` - Program configuration containing base cost and multiplier
/// 
/// # Returns
/// The calculated breeding cost, or an error if overflow occurs
pub fn calculate_breeding_cost(
    parent_a: &BeastAccount,
    parent_b: &BeastAccount,
    config: &ProgramConfig,
) -> Result<u64> {
    let max_generation = core::cmp::max(parent_a.generation, parent_b.generation);
    
    // Calculate generation_multiplier^max_generation
    // For generation 0, multiplier^0 = 1
    // For generation 1, multiplier^1 = multiplier
    // etc.
    let multiplier_power = if max_generation == 0 {
        1u64
    } else {
        // Calculate multiplier^generation using checked operations
        let mut result = config.generation_multiplier;
        for _ in 1..max_generation {
            result = result
                .checked_mul(config.generation_multiplier)
                .ok_or(ZenBeastsError::ArithmeticOverflow)?;
        }
        result
    };
    
    // Calculate final cost: base_cost × multiplier_power
    let breeding_cost = config.breeding_base_cost
        .checked_mul(multiplier_power)
        .ok_or(ZenBeastsError::ArithmeticOverflow)?;
    
    Ok(breeding_cost)
}

/// Validate all breeding requirements for both parents
/// This is a comprehensive check that validates:
/// - Both parents are not in breeding cooldown
/// - Both parents have not reached max breeding count
/// 
/// # Arguments
/// * `parent_a` - First parent beast
/// * `parent_b` - Second parent beast
/// * `current_time` - Current blockchain timestamp
/// * `config` - Program configuration
pub fn validate_breeding_requirements(
    parent_a: &BeastAccount,
    parent_b: &BeastAccount,
    current_time: i64,
    config: &ProgramConfig,
) -> Result<()> {
    // Check breeding cooldown for parent A
    crate::utils::cooldown::require_not_in_breeding_cooldown(
        parent_a,
        current_time,
        config.breeding_cooldown,
    )?;
    
    // Check breeding cooldown for parent B
    crate::utils::cooldown::require_not_in_breeding_cooldown(
        parent_b,
        current_time,
        config.breeding_cooldown,
    )?;
    
    // Check breeding count limit for parent A
    require_breeding_count_available(parent_a, config.max_breeding_count)?;
    
    // Check breeding count limit for parent B
    require_breeding_count_available(parent_b, config.max_breeding_count)?;
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::prelude::Pubkey;

    fn create_test_beast(generation: u8, breeding_count: u8, last_breeding: i64) -> BeastAccount {
        BeastAccount {
            mint: Pubkey::new_unique(),
            owner: Pubkey::new_unique(),
            traits: [100, 150, 200, 50, 0, 0, 0, 0, 0, 0],
            rarity_score: 500,
            last_activity: 0,
            activity_count: 0,
            pending_rewards: 0,
            parents: [Pubkey::default(), Pubkey::default()],
            generation,
            last_breeding,
            breeding_count,
            metadata_uri: String::from("https://example.com"),
            bump: 255,
        }
    }

    fn create_test_config() -> ProgramConfig {
        ProgramConfig {
            authority: Pubkey::new_unique(),
            zen_mint: Pubkey::new_unique(),
            treasury: Pubkey::new_unique(),
            activity_cooldown: 3600,
            breeding_cooldown: 7200,
            max_breeding_count: 5,
            upgrade_base_cost: 100,
            upgrade_scaling_factor: 10,
            breeding_base_cost: 1000,
            generation_multiplier: 2,
            reward_rate: 10,
            burn_percentage: 10,
            total_minted: 0,
            rarity_thresholds: [400, 600, 800, 950, 1020],
            bump: 255,
        }
    }

    #[test]
    fn test_can_breed_count_when_under_limit() {
        let beast = create_test_beast(0, 3, 0);
        let max_count = 5;
        
        assert!(can_breed_count(&beast, max_count));
    }

    #[test]
    fn test_cannot_breed_count_when_at_limit() {
        let beast = create_test_beast(0, 5, 0);
        let max_count = 5;
        
        assert!(!can_breed_count(&beast, max_count));
    }

    #[test]
    fn test_can_breed_count_when_at_zero() {
        let beast = create_test_beast(0, 0, 0);
        let max_count = 5;
        
        assert!(can_breed_count(&beast, max_count));
    }

    #[test]
    fn test_calculate_breeding_cost_generation_0() {
        let parent_a = create_test_beast(0, 0, 0);
        let parent_b = create_test_beast(0, 0, 0);
        let config = create_test_config();
        
        let cost = calculate_breeding_cost(&parent_a, &parent_b, &config).unwrap();
        // Generation 0: base_cost × multiplier^0 = 1000 × 1 = 1000
        assert_eq!(cost, 1000);
    }

    #[test]
    fn test_calculate_breeding_cost_generation_1() {
        let parent_a = create_test_beast(1, 0, 0);
        let parent_b = create_test_beast(0, 0, 0);
        let config = create_test_config();
        
        let cost = calculate_breeding_cost(&parent_a, &parent_b, &config).unwrap();
        // Max generation 1: base_cost × multiplier^1 = 1000 × 2 = 2000
        assert_eq!(cost, 2000);
    }

    #[test]
    fn test_calculate_breeding_cost_generation_2() {
        let parent_a = create_test_beast(2, 0, 0);
        let parent_b = create_test_beast(1, 0, 0);
        let config = create_test_config();
        
        let cost = calculate_breeding_cost(&parent_a, &parent_b, &config).unwrap();
        // Max generation 2: base_cost × multiplier^2 = 1000 × 4 = 4000
        assert_eq!(cost, 4000);
    }

    #[test]
    fn test_calculate_breeding_cost_generation_3() {
        let parent_a = create_test_beast(3, 0, 0);
        let parent_b = create_test_beast(2, 0, 0);
        let config = create_test_config();
        
        let cost = calculate_breeding_cost(&parent_a, &parent_b, &config).unwrap();
        // Max generation 3: base_cost × multiplier^3 = 1000 × 8 = 8000
        assert_eq!(cost, 8000);
    }

    #[test]
    fn test_calculate_breeding_cost_uses_max_generation() {
        let parent_a = create_test_beast(5, 0, 0);
        let parent_b = create_test_beast(2, 0, 0);
        let config = create_test_config();
        
        let cost = calculate_breeding_cost(&parent_a, &parent_b, &config).unwrap();
        // Max generation 5: base_cost × multiplier^5 = 1000 × 32 = 32000
        assert_eq!(cost, 32000);
    }

    #[test]
    fn test_validate_breeding_requirements_success() {
        let parent_a = create_test_beast(0, 2, 1000);
        let parent_b = create_test_beast(1, 3, 2000);
        let config = create_test_config();
        let current_time = 10000; // Well past breeding cooldown for both
        
        let result = validate_breeding_requirements(&parent_a, &parent_b, current_time, &config);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_breeding_requirements_fails_on_parent_a_cooldown() {
        let parent_a = create_test_beast(0, 2, 9000); // Recently bred
        let parent_b = create_test_beast(1, 3, 1000);
        let config = create_test_config();
        let current_time = 10000; // Only 1000 seconds after parent_a bred (need 7200)
        
        let result = validate_breeding_requirements(&parent_a, &parent_b, current_time, &config);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_breeding_requirements_fails_on_parent_b_cooldown() {
        let parent_a = create_test_beast(0, 2, 1000);
        let parent_b = create_test_beast(1, 3, 9000); // Recently bred
        let config = create_test_config();
        let current_time = 10000; // Only 1000 seconds after parent_b bred
        
        let result = validate_breeding_requirements(&parent_a, &parent_b, current_time, &config);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_breeding_requirements_fails_on_parent_a_count() {
        let parent_a = create_test_beast(0, 5, 1000); // At max breeding count
        let parent_b = create_test_beast(1, 3, 1000);
        let config = create_test_config();
        let current_time = 10000;
        
        let result = validate_breeding_requirements(&parent_a, &parent_b, current_time, &config);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_breeding_requirements_fails_on_parent_b_count() {
        let parent_a = create_test_beast(0, 2, 1000);
        let parent_b = create_test_beast(1, 5, 1000); // At max breeding count
        let config = create_test_config();
        let current_time = 10000;
        
        let result = validate_breeding_requirements(&parent_a, &parent_b, current_time, &config);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_breeding_requirements_first_breeding() {
        // Both parents have never bred (last_breeding = 0, breeding_count = 0)
        let parent_a = create_test_beast(0, 0, 0);
        let parent_b = create_test_beast(0, 0, 0);
        let config = create_test_config();
        let current_time = 1000;
        
        let result = validate_breeding_requirements(&parent_a, &parent_b, current_time, &config);
        assert!(result.is_ok());
    }
}
