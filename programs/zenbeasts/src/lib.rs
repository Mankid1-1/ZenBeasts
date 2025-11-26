use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[event]
pub struct BeastMinted {
    pub mint: Pubkey,
    pub owner: Pubkey,
    pub traits: [u8; 4],
    pub rarity_score: u64,
    pub generation: u8,
    pub timestamp: i64,
}

#[event]
pub struct ActivityPerformed {
    pub beast: Pubkey,
    pub activity_type: u8,
    pub timestamp: i64,
    pub rewards_earned: u64,
}

#[event]
pub struct RewardsClaimed {
    pub beast: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct TraitUpgraded {
    pub beast: Pubkey,
    pub trait_index: u8,
    pub old_value: u8,
    pub new_value: u8,
    pub cost_paid: u64,
    pub new_rarity: u64,
}

#[event]
pub struct BeastBred {
    pub parent1: Pubkey,
    pub parent2: Pubkey,
    pub offspring: Pubkey,
    pub generation: u8,
    pub cost_paid: u64,
}

#[event]
pub struct BeastTransferred {
    pub beast: Pubkey,
    pub from: Pubkey,
    pub to: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ConfigurationUpdated {
    pub parameter: String,
    pub old_value: u64,
    pub new_value: u64,
    pub updated_by: Pubkey,
}

#[event]
pub struct AbilityUnlocked {
    pub beast: Pubkey,
    pub trait_index: u8,
    pub ability_id: u8,
    pub cost_paid: u64,
    pub timestamp: i64,
}

#[event]
pub struct AbilityUpgraded {
    pub beast: Pubkey,
    pub trait_index: u8,
    pub old_level: u8,
    pub new_level: u8,
    pub cost_paid: u64,
    pub timestamp: i64,
}

#[event]
pub struct CombatInitiated {
    pub session_id: u64,
    pub challenger: Pubkey,
    pub opponent: Pubkey,
    pub wager_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct CombatTurnExecuted {
    pub session_id: u64,
    pub turn_count: u8,
    pub executor: Pubkey,
    pub ability_used: u8,
    pub damage_dealt: u16,
    pub timestamp: i64,
}

#[event]
pub struct CombatResolved {
    pub session_id: u64,
    pub winner: Option<Pubkey>,
    pub total_pot: u64,
    pub winner_payout: u64,
    pub burned_amount: u64,
    pub timestamp: i64,
}

#[program]
pub mod zenbeasts {
    use super::*;

    pub fn initialize(
        ctx: Context<initialize::Initialize>,
        activity_cooldown: i64,
        breeding_cooldown: i64,
        max_breeding_count: u8,
        upgrade_base_cost: u64,
        upgrade_scaling_factor: u64,
        breeding_base_cost: u64,
        generation_multiplier: u64,
        reward_rate: u64,
        burn_percentage: u8,
    ) -> Result<()> {
        initialize::handler(
            ctx,
            activity_cooldown,
            breeding_cooldown,
            max_breeding_count,
            upgrade_base_cost,
            upgrade_scaling_factor,
            breeding_base_cost,
            generation_multiplier,
            reward_rate,
            burn_percentage,
        )
    }

    pub fn create_beast(
        ctx: Context<create_beast::CreateBeast>,
        seed: u64,
        name: String,
        uri: String,
    ) -> Result<()> {
        create_beast::handler(ctx, seed, name, uri)
    }

    pub fn perform_activity(
        ctx: Context<perform_activity::PerformActivity>,
        activity_type: u8,
    ) -> Result<()> {
        perform_activity::handler(ctx, activity_type)
    }

    pub fn upgrade_trait(
        ctx: Context<upgrade_trait::UpgradeTrait>,
        trait_index: u8,
    ) -> Result<()> {
        upgrade_trait::handler(ctx, trait_index)
    }

    pub fn claim_rewards(ctx: Context<claim_rewards::ClaimRewards>) -> Result<()> {
        claim_rewards::handler(ctx)
    }

    pub fn breed_beasts(
        ctx: Context<breed_beasts::BreedBeasts>,
        seed: u64,
        name: String,
        uri: String,
        zen_amount: u64,
    ) -> Result<()> {
        breed_beasts::handler(ctx, seed, name, uri, zen_amount)
    }

    pub fn update_config(
        ctx: Context<update_config::UpdateConfig>,
        activity_cooldown: Option<i64>,
        breeding_cooldown: Option<i64>,
        max_breeding_count: Option<u8>,
        upgrade_base_cost: Option<u64>,
        upgrade_scaling_factor: Option<u64>,
        breeding_base_cost: Option<u64>,
        generation_multiplier: Option<u64>,
        reward_rate: Option<u64>,
        burn_percentage: Option<u8>,
    ) -> Result<()> {
        update_config::handler(
            ctx,
            activity_cooldown,
            breeding_cooldown,
            max_breeding_count,
            upgrade_base_cost,
            upgrade_scaling_factor,
            breeding_base_cost,
            generation_multiplier,
            reward_rate,
            burn_percentage,
        )
    }

    pub fn update_beast_owner(
        ctx: Context<update_beast_owner::UpdateBeastOwner>,
    ) -> Result<()> {
        update_beast_owner::handler(ctx)
    }

    pub fn unlock_ability(ctx: Context<unlock_ability::UnlockAbility>, trait_index: u8, ability_id: u8) -> Result<()> {
        unlock_ability::handler(ctx, trait_index, ability_id)
    }

    pub fn upgrade_ability(ctx: Context<upgrade_ability::UpgradeAbility>, trait_index: u8) -> Result<()> {
        upgrade_ability::handler(ctx, trait_index)
    }

    pub fn initiate_combat(ctx: Context<initiate_combat::InitiateCombat>, session_id: u64, wager_amount: u64) -> Result<()> {
        initiate_combat::handler(ctx, session_id, wager_amount)
    }

    pub fn execute_combat_turn(ctx: Context<execute_combat_turn::ExecuteCombatTurn>, ability_index: u8) -> Result<()> {
        execute_combat_turn::handler(ctx, ability_index)
    }

    pub fn resolve_combat(ctx: Context<resolve_combat::ResolveCombat>) -> Result<()> {
        resolve_combat::handler(ctx)
    }
}
