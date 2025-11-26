use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ProgramConfig {
    /// Admin authority
    pub authority: Pubkey,
    /// ZEN token mint address
    pub zen_mint: Pubkey,
    /// Treasury for token operations
    pub treasury: Pubkey,
    /// Cooldown duration in seconds for activities
    pub activity_cooldown: i64,
    /// Breeding cooldown duration in seconds
    pub breeding_cooldown: i64,
    /// Maximum times a beast can breed
    pub max_breeding_count: u8,
    /// Base cost per trait upgrade
    pub upgrade_base_cost: u64,
    /// Scaling factor for upgrade costs
    pub upgrade_scaling_factor: u64,
    /// Base breeding cost
    pub breeding_base_cost: u64,
    /// Multiplier for generation-based costs
    pub generation_multiplier: u64,
    /// ZEN tokens per second of activity
    pub reward_rate: u64,
    /// Percentage of tokens to burn (0-100)
    pub burn_percentage: u8,
    /// Base cost to unlock an ability
    pub ability_unlock_cost: u64,
    /// Base cost per ability level upgrade
    pub ability_upgrade_cost: u64,
    /// Cooldown between combats in seconds
    pub combat_cooldown: i64,
    /// Minimum wager amount for combat
    pub min_combat_wager: u64,
    /// Maximum wager amount for combat
    pub max_combat_wager: u64,
    /// Seconds before a turn times out
    pub combat_turn_timeout: i64,
    /// Percentage of pot winner receives
    pub combat_winner_percentage: u8,
    /// Total beasts minted
    pub total_minted: u64,
    /// Thresholds for rarity tiers [Common, Uncommon, Rare, Epic, Legendary]
    pub rarity_thresholds: [u64; 5],
    /// PDA bump seed
    pub bump: u8,
}

impl ProgramConfig {
    pub const SEED_PREFIX: &'static [u8] = b"config";
}
