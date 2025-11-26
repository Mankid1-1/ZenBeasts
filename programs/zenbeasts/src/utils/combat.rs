use anchor_lang::prelude::*;
use anchor_lang::solana_program::keccak;
use crate::errors::ZenBeastsError;
use crate::state::{BeastAccount, ProgramConfig};

pub const ABILITY_STRENGTH: u8 = 0; // Physical damage abilities
pub const ABILITY_AGILITY: u8 = 1; // Speed/dodge abilities
pub const ABILITY_WISDOM: u8 = 2; // Buff/debuff abilities
pub const ABILITY_VITALITY: u8 = 3; // Healing/shield abilities

/// Calculate the damage or healing for a combat turn
/// Returns the absolute amount of damage/healing
pub fn calculate_turn_damage(
    combat_seed: u64,
    turn_count: u8,
    attacker_trait: u8,
    attacker_ability_level: u8,
    ability_type: u8,
) -> Result<u16> {
    // Create deterministic random factor using keccak hash
    let mut input = Vec::with_capacity(8 + 1 + 1);
    input.extend_from_slice(&combat_seed.to_le_bytes());
    input.extend_from_slice(&turn_count.to_le_bytes());
    input.extend_from_slice(&ability_type.to_le_bytes());
    let hash = keccak::hash(&input);
    let random_factor = (hash.0[0] % 41) + 80; // 80-120 (0.8x to 1.2x)

    // Calculate base damage based on ability type
    let base_damage = match ability_type {
        ABILITY_STRENGTH => {
            (attacker_trait as u32)
                .checked_mul(attacker_ability_level as u32)
                .and_then(|x| x.checked_mul(2))
                .ok_or(ZenBeastsError::ArithmeticOverflow)?
        }
        ABILITY_AGILITY => {
            (attacker_trait as u32)
                .checked_mul(attacker_ability_level as u32)
                .and_then(|x| x.checked_mul(3))
                .and_then(|x| x.checked_div(2))
                .ok_or(ZenBeastsError::ArithmeticOverflow)?
        }
        ABILITY_WISDOM => {
            (attacker_trait as u32)
                .checked_mul(attacker_ability_level as u32)
                .ok_or(ZenBeastsError::ArithmeticOverflow)?
        }
        ABILITY_VITALITY => {
            // Healing amount (positive, caller handles as healing)
            (attacker_trait as u32)
                .checked_mul(attacker_ability_level as u32)
                .and_then(|x| x.checked_mul(3))
                .and_then(|x| x.checked_div(2))
                .ok_or(ZenBeastsError::ArithmeticOverflow)?
        }
        _ => return err!(ZenBeastsError::InvalidAbilityId),
    };

    // Apply random factor: (base_damage * random_factor) / 100
    let final_damage = base_damage
        .checked_mul(random_factor as u32)
        .and_then(|x| x.checked_div(100))
        .ok_or(ZenBeastsError::ArithmeticOverflow)?;

    // Clamp to u16 range
    Ok(final_damage.min(u16::MAX as u32) as u16)
}

/// Validate that a beast can enter combat
pub fn validate_combat_requirements(
    beast: &BeastAccount,
    current_time: i64,
    config: &ProgramConfig,
) -> Result<()> {
    require!(
        !beast.combat_stats.in_combat,
        ZenBeastsError::BeastInCombat
    );
    require!(
        current_time - beast.combat_stats.last_combat >= config.combat_cooldown,
        ZenBeastsError::CombatCooldownActive
    );
    require!(
        beast.abilities.iter().any(|&a| a > 0),
        ZenBeastsError::AbilityNotUnlocked
    );
    Ok(())
}

/// Calculate the energy cost for using an ability
pub fn calculate_ability_energy_cost(ability_type: u8, ability_level: u8) -> u8 {
    let base_cost = 20u8;
    let scaling = (ability_level as u16).checked_mul(2).unwrap_or(u16::MAX);
    let total_cost = base_cost as u16 + scaling;
    total_cost.min(100) as u8
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::prelude::Pubkey;

    fn create_test_beast(
        abilities: [u8; 4],
        ability_levels: [u8; 4],
        in_combat: bool,
        last_combat: i64,
    ) -> BeastAccount {
        BeastAccount {
            mint: Pubkey::new_unique(),
            owner: Pubkey::new_unique(),
            traits: [100, 150, 200, 50, 0, 0, 0, 0, 0, 0],
            rarity_score: 500,
            last_activity: 0,
            activity_count: 0,
            pending_rewards: 0,
            parents: [Pubkey::default(), Pubkey::default()],
            generation: 0,
            last_breeding: 0,
            breeding_count: 0,
            metadata_uri: String::from("https://example.com"),
            abilities,
            ability_levels,
            combat_stats: crate::state::CombatStats {
                hp: 500,
                energy: 100,
                wins: 0,
                losses: 0,
                last_combat,
                in_combat,
            },
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
            ability_unlock_cost: 100_000_000_000,
            ability_upgrade_cost: 50_000_000_000,
            combat_cooldown: 3600,
            min_combat_wager: 10_000_000_000,
            max_combat_wager: 1_000_000_000_000,
            combat_turn_timeout: 300,
            combat_winner_percentage: 90,
            total_minted: 0,
            rarity_thresholds: [400, 600, 800, 950, 1020],
            bump: 255,
        }
    }

    #[test]
    fn test_calculate_turn_damage_strength() {
        let damage = calculate_turn_damage(12345, 1, 100, 5, ABILITY_STRENGTH).unwrap();
        // Base: 100 * 5 * 2 = 1000, then * random_factor / 100
        assert!(damage >= 800 && damage <= 1200);
    }

    #[test]
    fn test_calculate_turn_damage_agility() {
        let damage = calculate_turn_damage(12345, 1, 100, 5, ABILITY_AGILITY).unwrap();
        // Base: 100 * 5 * 1.5 = 750, then * random_factor / 100
        assert!(damage >= 600 && damage <= 900);
    }

    #[test]
    fn test_calculate_turn_damage_wisdom() {
        let damage = calculate_turn_damage(12345, 1, 100, 5, ABILITY_WISDOM).unwrap();
        // Base: 100 * 5 * 1 = 500, then * random_factor / 100
        assert!(damage >= 400 && damage <= 600);
    }

    #[test]
    fn test_calculate_turn_damage_vitality() {
        let healing = calculate_turn_damage(12345, 1, 100, 5, ABILITY_VITALITY).unwrap();
        // Base: 100 * 5 * 1.5 = 750, then * random_factor / 100
        assert!(healing >= 600 && healing <= 900);
    }

    #[test]
    fn test_calculate_turn_damage_deterministic() {
        let damage1 = calculate_turn_damage(12345, 1, 100, 5, ABILITY_STRENGTH).unwrap();
        let damage2 = calculate_turn_damage(12345, 1, 100, 5, ABILITY_STRENGTH).unwrap();
        assert_eq!(damage1, damage2);
    }

    #[test]
    fn test_calculate_turn_damage_invalid_ability() {
        let result = calculate_turn_damage(12345, 1, 100, 5, 99);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_combat_requirements_success() {
        let beast = create_test_beast([1, 0, 0, 0], [1, 0, 0, 0], false, 1000);
        let config = create_test_config();
        let current_time = 5000; // Past cooldown

        let result = validate_combat_requirements(&beast, current_time, &config);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_combat_requirements_in_combat() {
        let beast = create_test_beast([1, 0, 0, 0], [1, 0, 0, 0], true, 1000);
        let config = create_test_config();
        let current_time = 5000;

        let result = validate_combat_requirements(&beast, current_time, &config);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_combat_requirements_cooldown() {
        let beast = create_test_beast([1, 0, 0, 0], [1, 0, 0, 0], false, 4000);
        let config = create_test_config();
        let current_time = 5000; // Only 1000 seconds passed, need 3600

        let result = validate_combat_requirements(&beast, current_time, &config);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_combat_requirements_no_abilities() {
        let beast = create_test_beast([0, 0, 0, 0], [0, 0, 0, 0], false, 1000);
        let config = create_test_config();
        let current_time = 5000;

        let result = validate_combat_requirements(&beast, current_time, &config);
        assert!(result.is_err());
    }

    #[test]
    fn test_calculate_ability_energy_cost_level_1() {
        let cost = calculate_ability_energy_cost(ABILITY_STRENGTH, 1);
        assert_eq!(cost, 22); // 20 + (1 * 2)
    }

    #[test]
    fn test_calculate_ability_energy_cost_level_5() {
        let cost = calculate_ability_energy_cost(ABILITY_STRENGTH, 5);
        assert_eq!(cost, 30); // 20 + (5 * 2)
    }

    #[test]
    fn test_calculate_ability_energy_cost_capped() {
        let cost = calculate_ability_energy_cost(ABILITY_STRENGTH, 50);
        assert_eq!(cost, 100); // Capped at 100
    }
}