use anchor_lang::prelude::*;
use crate::state::{beast_account::BeastAccount, program_config::ProgramConfig};
use crate::errors::ZenBeastsError;

#[derive(Accounts)]
pub struct PerformActivity<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [BeastAccount::SEED_PREFIX, beast_account.mint.as_ref()],
        bump = beast_account.bump
    )]
    pub beast_account: Account<'info, BeastAccount>,
    #[account(
        seeds = [ProgramConfig::SEED_PREFIX],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramConfig>,
}

pub fn handler(ctx: Context<PerformActivity>, activity_type: u8) -> Result<()> {
    // Validate activity type (0-2 for now, can be expanded later)
    require!(activity_type <= 2, ZenBeastsError::InvalidActivityType);

    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;
    let beast = &mut ctx.accounts.beast_account;
    let config = &ctx.accounts.config;

    // Requirement 2.1: Verify beast ownership
    require!(
        beast.owner == ctx.accounts.payer.key(),
        ZenBeastsError::NotOwner
    );

    // Requirement 2.1, 2.4: Validate beast is not in cooldown
    require!(
        beast.can_perform_activity(current_time, config.activity_cooldown),
        ZenBeastsError::CooldownActive
    );

    // Requirement 2.5: Calculate and add pending rewards based on elapsed time
    // Only calculate rewards if this is not the first activity (last_activity > 0)
    let rewards_earned = if beast.last_activity > 0 {
        let time_elapsed = current_time
            .checked_sub(beast.last_activity)
            .ok_or(ZenBeastsError::ArithmeticUnderflow)?;
        
        // Calculate rewards: time_elapsed * reward_rate
        let calculated_rewards = (time_elapsed as u64)
            .checked_mul(config.reward_rate)
            .ok_or(ZenBeastsError::ArithmeticOverflow)?;
        
        // Add to pending rewards
        beast.pending_rewards = beast.pending_rewards
            .checked_add(calculated_rewards)
            .ok_or(ZenBeastsError::ArithmeticOverflow)?;
        
        calculated_rewards
    } else {
        0 // First activity, no rewards to accumulate
    };

    // Requirement 2.2: Update last_activity timestamp
    // Requirement 2.3: Increment activity_count
    beast.update_activity(current_time);

    // Emit event for analytics and monitoring (Requirement 19.2)
    emit!(crate::ActivityPerformed {
        beast: beast.mint,
        activity_type,
        timestamp: current_time,
        rewards_earned,
    });

    Ok(())
}