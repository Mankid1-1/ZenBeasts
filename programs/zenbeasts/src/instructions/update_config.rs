use anchor_lang::prelude::*;
use crate::state::program_config::ProgramConfig;
use crate::errors::ZenBeastsError;

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        mut,
        seeds = [ProgramConfig::SEED_PREFIX],
        bump = config.bump,
        has_one = authority @ ZenBeastsError::Unauthorized
    )]
    pub config: Account<'info, ProgramConfig>,
    pub authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<UpdateConfig>,
    activity_cooldown: Option<i64>,
    breeding_cooldown: Option<i64>,
    max_breeding_count: Option<u8>,
    upgrade_base_cost: Option<u64>,
    upgrade_scaling_factor: Option<u64>,
    breeding_base_cost: Option<u64>,
    generation_multiplier: Option<u64>,
    reward_rate: Option<u64>,
    burn_percentage: Option<u8>,
    ability_unlock_cost: Option<u64>,
    ability_upgrade_cost: Option<u64>,
    combat_cooldown: Option<i64>,
    min_combat_wager: Option<u64>,
    max_combat_wager: Option<u64>,
    combat_turn_timeout: Option<i64>,
    combat_winner_percentage: Option<u8>,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let clock = Clock::get()?;

    // Update activity_cooldown if provided
    if let Some(new_cooldown) = activity_cooldown {
        require!(new_cooldown > 0, ZenBeastsError::InvalidConfiguration);
        let old_value = config.activity_cooldown as u64;
        config.activity_cooldown = new_cooldown;
        
        emit!(crate::ConfigurationUpdated {
            parameter: "activity_cooldown".to_string(),
            old_value,
            new_value: new_cooldown as u64,
            updated_by: ctx.accounts.authority.key(),
        });
    }

    // Update breeding_cooldown if provided
    if let Some(new_cooldown) = breeding_cooldown {
        require!(new_cooldown > 0, ZenBeastsError::InvalidConfiguration);
        let old_value = config.breeding_cooldown as u64;
        config.breeding_cooldown = new_cooldown;
        
        emit!(crate::ConfigurationUpdated {
            parameter: "breeding_cooldown".to_string(),
            old_value,
            new_value: new_cooldown as u64,
            updated_by: ctx.accounts.authority.key(),
        });
    }

    // Update max_breeding_count if provided
    if let Some(new_count) = max_breeding_count {
        let old_value = config.max_breeding_count as u64;
        config.max_breeding_count = new_count;
        
        emit!(crate::ConfigurationUpdated {
            parameter: "max_breeding_count".to_string(),
            old_value,
            new_value: new_count as u64,
            updated_by: ctx.accounts.authority.key(),
        });
    }

    // Update upgrade_base_cost if provided
    if let Some(new_cost) = upgrade_base_cost {
        require!(new_cost > 0, ZenBeastsError::InvalidConfiguration);
        let old_value = config.upgrade_base_cost;
        config.upgrade_base_cost = new_cost;
        
        emit!(crate::ConfigurationUpdated {
            parameter: "upgrade_base_cost".to_string(),
            old_value,
            new_value: new_cost,
            updated_by: ctx.accounts.authority.key(),
        });
    }

    // Update upgrade_scaling_factor if provided
    if let Some(new_factor) = upgrade_scaling_factor {
        require!(new_factor > 0, ZenBeastsError::InvalidConfiguration);
        let old_value = config.upgrade_scaling_factor;
        config.upgrade_scaling_factor = new_factor;
        
        emit!(crate::ConfigurationUpdated {
            parameter: "upgrade_scaling_factor".to_string(),
            old_value,
            new_value: new_factor,
            updated_by: ctx.accounts.authority.key(),
        });
    }

    // Update breeding_base_cost if provided
    if let Some(new_cost) = breeding_base_cost {
        require!(new_cost > 0, ZenBeastsError::InvalidConfiguration);
        let old_value = config.breeding_base_cost;
        config.breeding_base_cost = new_cost;
        
        emit!(crate::ConfigurationUpdated {
            parameter: "breeding_base_cost".to_string(),
            old_value,
            new_value: new_cost,
            updated_by: ctx.accounts.authority.key(),
        });
    }

    // Update generation_multiplier if provided
    if let Some(new_multiplier) = generation_multiplier {
        let old_value = config.generation_multiplier;
        config.generation_multiplier = new_multiplier;
        
        emit!(crate::ConfigurationUpdated {
            parameter: "generation_multiplier".to_string(),
            old_value,
            new_value: new_multiplier,
            updated_by: ctx.accounts.authority.key(),
        });
    }

    // Update reward_rate if provided
    if let Some(new_rate) = reward_rate {
        require!(new_rate > 0, ZenBeastsError::InvalidConfiguration);
        let old_value = config.reward_rate;
        config.reward_rate = new_rate;
        
        emit!(crate::ConfigurationUpdated {
            parameter: "reward_rate".to_string(),
            old_value,
            new_value: new_rate,
            updated_by: ctx.accounts.authority.key(),
        });
    }

    // Update burn_percentage if provided
    if let Some(new_percentage) = burn_percentage {
        require!(
            new_percentage <= 100,
            ZenBeastsError::InvalidBurnPercentage
        );
        let old_value = config.burn_percentage as u64;
        config.burn_percentage = new_percentage;
        
        emit!(crate::ConfigurationUpdated {
            parameter: "burn_percentage".to_string(),
            old_value,
            new_value: new_percentage as u64,
            updated_by: ctx.accounts.authority.key(),
        });
    }

    // Update ability_unlock_cost if provided
    if let Some(new_cost) = ability_unlock_cost {
        let old_value = config.ability_unlock_cost;
        config.ability_unlock_cost = new_cost;
        
        emit!(crate::ConfigurationUpdated {
            parameter: "ability_unlock_cost".to_string(),
            old_value,
            new_value: new_cost,
            updated_by: ctx.accounts.authority.key(),
        });
    }

    // Update ability_upgrade_cost if provided
    if let Some(new_cost) = ability_upgrade_cost {
        let old_value = config.ability_upgrade_cost;
        config.ability_upgrade_cost = new_cost;
        
        emit!(crate::ConfigurationUpdated {
            parameter: "ability_upgrade_cost".to_string(),
            old_value,
            new_value: new_cost,
            updated_by: ctx.accounts.authority.key(),
        });
    }

    // Update combat_cooldown if provided
    if let Some(new_cooldown) = combat_cooldown {
        let old_value = config.combat_cooldown as u64;
        config.combat_cooldown = new_cooldown;
        
        emit!(crate::ConfigurationUpdated {
            parameter: "combat_cooldown".to_string(),
            old_value,
            new_value: new_cooldown as u64,
            updated_by: ctx.accounts.authority.key(),
        });
    }

    // Update min_combat_wager if provided
    if let Some(new_wager) = min_combat_wager {
        let old_value = config.min_combat_wager;
        config.min_combat_wager = new_wager;
        
        emit!(crate::ConfigurationUpdated {
            parameter: "min_combat_wager".to_string(),
            old_value,
            new_value: new_wager,
            updated_by: ctx.accounts.authority.key(),
        });
    }

    // Update max_combat_wager if provided
    if let Some(new_wager) = max_combat_wager {
        let old_value = config.max_combat_wager;
        config.max_combat_wager = new_wager;
        
        emit!(crate::ConfigurationUpdated {
            parameter: "max_combat_wager".to_string(),
            old_value,
            new_value: new_wager,
            updated_by: ctx.accounts.authority.key(),
        });
    }

    // Update combat_turn_timeout if provided
    if let Some(new_timeout) = combat_turn_timeout {
        let old_value = config.combat_turn_timeout as u64;
        config.combat_turn_timeout = new_timeout;
        
        emit!(crate::ConfigurationUpdated {
            parameter: "combat_turn_timeout".to_string(),
            old_value,
            new_value: new_timeout as u64,
            updated_by: ctx.accounts.authority.key(),
        });
    }

    // Update combat_winner_percentage if provided
    if let Some(new_percentage) = combat_winner_percentage {
        require!(new_percentage <= 100, ZenBeastsError::InvalidConfiguration);
        let old_value = config.combat_winner_percentage as u64;
        config.combat_winner_percentage = new_percentage;
        
        emit!(crate::ConfigurationUpdated {
            parameter: "combat_winner_percentage".to_string(),
            old_value,
            new_value: new_percentage as u64,
            updated_by: ctx.accounts.authority.key(),
        });
    }

    Ok(())
}