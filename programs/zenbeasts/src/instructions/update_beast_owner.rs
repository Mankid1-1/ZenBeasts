use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;
use crate::state::beast_account::BeastAccount;
use crate::errors::ZenBeastsError;

#[derive(Accounts)]
pub struct UpdateBeastOwner<'info> {
    /// The new owner of the beast (must be signer to prove they control the NFT)
    /// This ensures only the current NFT holder can update the beast account,
    /// preventing the old owner from updating after transferring the NFT
    #[account(mut)]
    pub new_owner: Signer<'info>,
    
    /// Beast account to update
    #[account(
        mut,
        seeds = [BeastAccount::SEED_PREFIX, beast_account.mint.as_ref()],
        bump = beast_account.bump
    )]
    pub beast_account: Account<'info, BeastAccount>,
    
    /// NFT token account - must be owned by new_owner and hold the beast NFT
    /// Constraints are ordered by validation priority: ownership, mint match, amount
    #[account(
        constraint = nft_token_account.owner == new_owner.key() @ ZenBeastsError::NotOwner,
        constraint = nft_token_account.mint == beast_account.mint @ ZenBeastsError::TokenAccountMismatch,
        constraint = nft_token_account.amount == 1 @ ZenBeastsError::InvalidNFTOwnership,
    )]
    pub nft_token_account: Account<'info, TokenAccount>,
    // Note: No system_program or rent required - only updating existing account data
}

pub fn handler(ctx: Context<UpdateBeastOwner>) -> Result<()> {
    let beast = &mut ctx.accounts.beast_account;
    let old_owner = beast.owner;
    let new_owner = ctx.accounts.new_owner.key();
    
    // Requirement 14.1: Validate NFT ownership has changed
    // The constraint on nft_token_account already validates that new_owner holds the NFT
    // We just need to ensure the owner is actually different
    require!(
        old_owner != new_owner,
        ZenBeastsError::OwnerUnchanged
    );
    
    // Requirement 14.1: Update beast account owner field to match new NFT holder
    beast.owner = new_owner;
    
    // Requirement 14.3: All trait values, activity history, and pending rewards are preserved
    // (No modifications to these fields - they remain unchanged)
    // Note: Transfers are allowed during cooldown - new owner inherits all state
    
    // Requirement 14.5: Emit BeastTransferred event with current timestamp
    let clock = Clock::get()?;
    emit!(crate::BeastTransferred {
        beast: beast.mint,
        from: old_owner,
        to: new_owner,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
