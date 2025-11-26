use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Burn, Transfer};
use crate::state::{beast_account::BeastAccount, program_config::ProgramConfig};
use crate::errors::ZenBeastsError;

#[derive(Accounts)]
pub struct UnlockAbility<'info> {
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

pub fn handler(ctx: Context<UnlockAbility>, trait_index: u8, ability_id: u8) -> Result<()> {
    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;
    let beast = &mut ctx.accounts.beast_account;
    let config = &ctx.accounts.config;
    
    // Validate ownership
    require!(
        beast.owner == ctx.accounts.user.key(),
        ZenBeastsError::NotOwner
    );
    
    // Validate trait_index is 0-3 (core traits only)
    require!(
        trait_index < 4,
        ZenBeastsError::InvalidTraitIndex
    );
    
    // Validate ability_id is 1-255
    require!(
        ability_id > 0 && ability_id <= 255,
        ZenBeastsError::InvalidAbilityId
    );
    
    // Check ability not already unlocked
    require!(
        beast.abilities[trait_index as usize] == 0,
        ZenBeastsError::AbilityAlreadyUnlocked
    );
    
    // Validate user has sufficient ZEN
    require!(
        ctx.accounts.user_token_account.amount >= config.ability_unlock_cost,
        ZenBeastsError::InsufficientFunds
    );
    
    // Calculate burn (50%) and treasury (50%) amounts using checked arithmetic
    let cost = config.ability_unlock_cost;
    let burn_amount = cost
        .checked_div(2)
        .ok_or(ZenBeastsError::ArithmeticOverflow)?;
    let treasury_amount = cost
        .checked_sub(burn_amount)
        .ok_or(ZenBeastsError::ArithmeticUnderflow)?;
    
    // Execute token burn CPI (same pattern as upgrade_trait.rs lines 114-124)
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
    
    // Execute treasury transfer CPI (same pattern as upgrade_trait.rs lines 127-137)
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
    
    // Update beast state
    beast.abilities[trait_index as usize] = ability_id;
    beast.ability_levels[trait_index as usize] = 1;
    
    // Emit AbilityUnlocked event
    emit!(crate::AbilityUnlocked {
        beast: beast.mint,
        trait_index,
        ability_id,
        cost_paid: cost,
        timestamp,
    });
    
    Ok(())
}