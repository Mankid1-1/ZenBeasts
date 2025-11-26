use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Burn, Transfer};
use crate::state::{beast_account::BeastAccount, program_config::ProgramConfig};
use crate::utils::traits;
use crate::errors::ZenBeastsError;

#[derive(Accounts)]
pub struct UpgradeTrait<'info> {
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
    
    /// User's ZEN token account (source of payment)
    #[account(
        mut,
        constraint = user_token_account.mint == config.zen_mint @ ZenBeastsError::TokenAccountMismatch,
        constraint = user_token_account.owner == user.key() @ ZenBeastsError::TokenAccountMismatch,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    /// Treasury token account (receives non-burned tokens)
    #[account(
        mut,
        constraint = treasury.mint == config.zen_mint @ ZenBeastsError::TokenAccountMismatch,
        constraint = treasury.key() == config.treasury @ ZenBeastsError::TokenAccountMismatch,
    )]
    pub treasury: Account<'info, TokenAccount>,
    
    /// ZEN token mint (for burning)
    #[account(
        mut,
        constraint = zen_mint.key() == config.zen_mint @ ZenBeastsError::TokenAccountMismatch,
    )]
    pub zen_mint: Account<'info, Mint>,
    
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<UpgradeTrait>, trait_index: u8) -> Result<()> {
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;
    let beast = &mut ctx.accounts.beast_account;
    let config = &ctx.accounts.config;
    
    // Requirement 4.1: Verify beast ownership
    require!(
        beast.owner == ctx.accounts.user.key(),
        ZenBeastsError::NotOwner
    );
    
    // Validate trait index is valid (only core traits 0-3 can be upgraded)
    require!(
        trait_index < 4,
        ZenBeastsError::InvalidTraitIndex
    );
    
    let old_value = beast.traits[trait_index as usize];
    
    // Requirement 17.1: Validate trait value < 255 (max value enforcement)
    require!(
        old_value < 255,
        ZenBeastsError::TraitMaxReached
    );
    
    // Requirement 17.2: Calculate scaled upgrade cost
    // cost = upgrade_base_cost × (1 + trait_value / upgrade_scaling_factor)
    let scaling_factor = config.upgrade_scaling_factor;
    let base_cost = config.upgrade_base_cost;
    
    // Calculate: base_cost * (scaling_factor + trait_value) / scaling_factor
    let numerator = base_cost
        .checked_mul(scaling_factor.checked_add(old_value as u64).ok_or(ZenBeastsError::ArithmeticOverflow)?)
        .ok_or(ZenBeastsError::ArithmeticOverflow)?;
    let upgrade_cost = numerator
        .checked_div(scaling_factor)
        .ok_or(ZenBeastsError::ArithmeticOverflow)?;
    
    // Requirement 4.1: Validate user has sufficient ZEN tokens
    require!(
        ctx.accounts.user_token_account.amount >= upgrade_cost,
        ZenBeastsError::InsufficientFunds
    );
    
    // Calculate burn amount and treasury amount
    let burn_percentage = config.burn_percentage as u64;
    require!(
        burn_percentage <= 100,
        ZenBeastsError::InvalidBurnPercentage
    );
    
    let burn_amount = upgrade_cost
        .checked_mul(burn_percentage)
        .ok_or(ZenBeastsError::ArithmeticOverflow)?
        .checked_div(100)
        .ok_or(ZenBeastsError::ArithmeticOverflow)?;
    
    let treasury_amount = upgrade_cost
        .checked_sub(burn_amount)
        .ok_or(ZenBeastsError::ArithmeticUnderflow)?;
    
    // Requirement 11.3: Burn configured percentage of tokens
    if burn_amount > 0 {
        let burn_cpi = Burn {
            mint: ctx.accounts.zen_mint.to_account_info(),
            from: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        token::burn(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), burn_cpi),
            burn_amount
        )?;
    }
    
    // Requirement 11.2: Transfer tokens to treasury
    if treasury_amount > 0 {
        let transfer_cpi = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.treasury.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), transfer_cpi),
            treasury_amount
        )?;
    }
    
    // Requirement 4.3: Increment specified trait value by 1
    let new_value = old_value
        .checked_add(1)
        .ok_or(ZenBeastsError::ArithmeticOverflow)?;
    beast.traits[trait_index as usize] = new_value;
    
    // Requirement 4.4: Recalculate and update rarity score
    let new_rarity = traits::calculate_rarity(&beast.traits);
    beast.rarity_score = new_rarity;
    
    // Requirement 19.5: Emit TraitUpgraded event
    emit!(crate::TraitUpgraded {
        beast: beast.mint,
        trait_index,
        old_value,
        new_value,
        cost_paid: upgrade_cost,
        new_rarity,
    });
    
    Ok(())
}