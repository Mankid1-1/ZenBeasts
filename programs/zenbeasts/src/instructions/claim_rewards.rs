use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{beast_account::BeastAccount, program_config::ProgramConfig};
use crate::errors::ZenBeastsError;

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
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
    
    /// Treasury token account (source of reward tokens)
    /// Must be owned by the treasury_authority PDA
    #[account(
        mut,
        constraint = treasury.mint == config.zen_mint @ ZenBeastsError::TokenAccountMismatch,
        constraint = treasury.key() == config.treasury @ ZenBeastsError::TokenAccountMismatch,
    )]
    pub treasury: Account<'info, TokenAccount>,
    
    /// User's ZEN token account (destination for rewards)
    #[account(
        mut,
        constraint = user_token_account.mint == config.zen_mint @ ZenBeastsError::TokenAccountMismatch,
        constraint = user_token_account.owner == user.key() @ ZenBeastsError::TokenAccountMismatch,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    /// Treasury authority PDA (signs the transfer from treasury)
    /// CHECK: This PDA is the owner of the treasury token account
    #[account(
        seeds = [b"treasury_authority"],
        bump,
    )]
    pub treasury_authority: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClaimRewards>) -> Result<()> {
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;
    let beast = &mut ctx.accounts.beast_account;
    let config = &ctx.accounts.config;
    
    // Requirement 3.1: Verify beast ownership
    require!(
        beast.owner == ctx.accounts.user.key(),
        ZenBeastsError::NotOwner
    );
    
    // Requirement 3.1: Calculate total pending rewards
    // If the beast has been active, calculate rewards since last activity
    let total_rewards = if beast.last_activity > 0 {
        let time_elapsed = current_time
            .checked_sub(beast.last_activity)
            .ok_or(ZenBeastsError::ArithmeticUnderflow)?;
        
        // Calculate rewards: time_elapsed * reward_rate
        let calculated_rewards = (time_elapsed as u64)
            .checked_mul(config.reward_rate)
            .ok_or(ZenBeastsError::ArithmeticOverflow)?;
        
        // Add to existing pending rewards
        beast.pending_rewards
            .checked_add(calculated_rewards)
            .ok_or(ZenBeastsError::ArithmeticOverflow)?
    } else {
        // No activity yet, just use pending rewards
        beast.pending_rewards
    };
    
    // Requirement 3.5: Validate rewards are greater than zero
    require!(
        total_rewards > 0,
        ZenBeastsError::NoRewardsToClaim
    );
    
    // Requirement 11.4: Validate treasury has sufficient balance
    require!(
        ctx.accounts.treasury.amount >= total_rewards,
        ZenBeastsError::InsufficientTreasuryBalance
    );
    
    // Requirement 3.2: Transfer ZEN tokens from treasury to user
    let treasury_authority_bump = ctx.bumps.treasury_authority;
    let treasury_authority_seeds = &[
        b"treasury_authority".as_ref(),
        &[treasury_authority_bump],
    ];
    let signer_seeds = &[&treasury_authority_seeds[..]];
    
    let cpi_accounts = Transfer {
        from: ctx.accounts.treasury.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.treasury_authority.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
    
    token::transfer(cpi_ctx, total_rewards)?;
    
    // Requirement 3.3: Reset pending_rewards to zero
    beast.pending_rewards = 0;
    
    // Requirement 3.4: Update last claim timestamp (using last_activity field)
    beast.last_activity = current_time;
    
    // Requirement 19.3: Emit RewardsClaimed event
    emit!(crate::RewardsClaimed {
        beast: beast.mint,
        recipient: ctx.accounts.user.key(),
        amount: total_rewards,
        timestamp: current_time,
    });
    
    Ok(())
}
