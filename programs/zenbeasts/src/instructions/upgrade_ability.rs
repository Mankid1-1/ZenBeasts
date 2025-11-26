use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Burn, Transfer};
use crate::state::{beast_account::BeastAccount, program_config::ProgramConfig};
use crate::errors::ZenBeastsError;

#[derive(Accounts)]
pub struct UpgradeAbility<'info> {
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

pub fn handler(ctx: Context<UpgradeAbility>, trait_index: u8) -> Result<()> {
    let beast = &mut ctx.accounts.beast_account;
    let config = &ctx.accounts.config;
    
    // Validate ownership
    require!(
        beast.owner == ctx.accounts.user.key(),
        ZenBeastsError::NotOwner
    );
    
    // Validate trait_index is 0-3
    require!(
        trait_index < 4,
        ZenBeastsError::InvalidTraitIndex
    );
    
    // Check ability is unlocked
    require!(
        beast.abilities[trait_index as usize] > 0,
        ZenBeastsError::AbilityNotUnlocked
    );
    
    // Get current level
    let current_level = beast.ability_levels[trait_index as usize];
    
    // Validate level < 10
    require!(
        current_level < 10,
        ZenBeastsError::AbilityMaxLevel
    );
    
    // Calculate scaled cost: ability_upgrade_cost × current_level
    let upgrade_cost = config.ability_upgrade_cost
        .checked_mul(current_level as u64)
        .ok_or(ZenBeastsError::ArithmeticOverflow)?;
    
    // Validate user has sufficient ZEN
    require!(
        ctx.accounts.user_token_account.amount >= upgrade_cost,
        ZenBeastsError::InsufficientFunds
    );
    
    // Calculate burn (50%) and treasury (50%) amounts
    let burn_amount = upgrade_cost
        .checked_div(2)
        .ok_or(ZenBeastsError::ArithmeticOverflow)?;
    
    let treasury_amount = upgrade_cost
        .checked_sub(burn_amount)
        .ok_or(ZenBeastsError::ArithmeticUnderflow)?;
    
    // Execute token burn CPI
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
    
    // Execute treasury transfer CPI
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
    
    // Increment ability level
    let new_level = current_level
        .checked_add(1)
        .ok_or(ZenBeastsError::ArithmeticOverflow)?;
    beast.ability_levels[trait_index as usize] = new_level;
    
    // Emit AbilityUpgraded event
    emit!(crate::AbilityUpgraded {
        beast: beast.mint,
        trait_index,
        old_level: current_level,
        new_level,
        cost_paid: upgrade_cost,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}