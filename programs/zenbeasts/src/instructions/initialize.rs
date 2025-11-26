use anchor_lang::prelude::*;
use crate::state::program_config::ProgramConfig;
use crate::errors::ZenBeastsError;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ProgramConfig::INIT_SPACE,
        seeds = [ProgramConfig::SEED_PREFIX],
        bump
    )]
    pub config: Account<'info, ProgramConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: ZEN token mint address
    pub zen_mint: UncheckedAccount<'info>,
    /// CHECK: Treasury token account
    pub treasury: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<Initialize>,
    activity_cooldown: i64,
    breeding_cooldown: i64,
    max_breeding_count: u8,
    upgrade_base_cost: u64,
    upgrade_scaling_factor: u64,
    breeding_base_cost: u64,
    generation_multiplier: u64,
    reward_rate: u64,
    burn_percentage: u8,
    ability_unlock_cost: u64,
    ability_upgrade_cost: u64,
    combat_cooldown: i64,
    min_combat_wager: u64,
    max_combat_wager: u64,
    combat_turn_timeout: i64,
    combat_winner_percentage: u8,
) -> Result<()> {
    // Validate configuration parameters
    require!(
        burn_percentage <= 100,
        ZenBeastsError::InvalidBurnPercentage
    );
    require!(
        combat_winner_percentage <= 100,
        ZenBeastsError::InvalidConfiguration
    );
    require!(
        activity_cooldown > 0 && breeding_cooldown > 0,
        ZenBeastsError::InvalidConfiguration
    );
    require!(
        upgrade_base_cost > 0 && breeding_base_cost > 0,
        ZenBeastsError::InvalidConfiguration
    );
    require!(
        reward_rate > 0 && upgrade_scaling_factor > 0,
        ZenBeastsError::InvalidConfiguration
    );

    let config = &mut ctx.accounts.config;
    config.authority = ctx.accounts.authority.key();
    config.zen_mint = ctx.accounts.zen_mint.key();
    config.treasury = ctx.accounts.treasury.key();
    config.activity_cooldown = activity_cooldown;
    config.breeding_cooldown = breeding_cooldown;
    config.max_breeding_count = max_breeding_count;
    config.upgrade_base_cost = upgrade_base_cost;
    config.upgrade_scaling_factor = upgrade_scaling_factor;
    config.breeding_base_cost = breeding_base_cost;
    config.generation_multiplier = generation_multiplier;
    config.reward_rate = reward_rate;
    config.burn_percentage = burn_percentage;
    config.ability_unlock_cost = ability_unlock_cost;
    config.ability_upgrade_cost = ability_upgrade_cost;
    config.combat_cooldown = combat_cooldown;
    config.min_combat_wager = min_combat_wager;
    config.max_combat_wager = max_combat_wager;
    config.combat_turn_timeout = combat_turn_timeout;
    config.combat_winner_percentage = combat_winner_percentage;
    config.total_minted = 0;
    
    // Set default rarity thresholds
    // Common: 0-400, Uncommon: 401-600, Rare: 601-800, Epic: 801-950, Legendary: 951-1020
    config.rarity_thresholds = [400, 600, 800, 950, 1020];
    
    config.bump = ctx.bumps.config;
    
    Ok(())
}
