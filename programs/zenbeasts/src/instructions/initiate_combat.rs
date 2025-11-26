use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Transfer, Token, TokenAccount};
use anchor_lang::solana_program::keccak;

use crate::errors::ZenBeastsError;
use crate::state::{BeastAccount, CombatSession, ProgramConfig};

#[derive(Accounts)]
#[instruction(session_id: u64)]
pub struct InitiateCombat<'info> {
    #[account(mut)]
    pub challenger_owner: Signer<'info>,

    #[account(mut)]
    pub challenger_beast: Account<'info, BeastAccount>,

    #[account(mut)]
    pub opponent_beast: Account<'info, BeastAccount>,

    #[account(
        init,
        payer = challenger_owner,
        space = 8 + CombatSession::INIT_SPACE,
        seeds = [CombatSession::SEED_PREFIX, session_id.to_le_bytes().as_ref()],
        bump
    )]
    pub combat_session: Account<'info, CombatSession>,

    #[account(
        seeds = [ProgramConfig::SEED_PREFIX],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramConfig>,

    #[account(mut)]
    pub challenger_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = challenger_owner,
        associated_token::mint = zen_mint,
        associated_token::authority = combat_session,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub zen_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitiateCombat>,
    session_id: u64,
    wager_amount: u64,
) -> Result<()> {
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // Validate challenger owns challenger_beast
    require!(
        ctx.accounts.challenger_beast.owner == ctx.accounts.challenger_owner.key(),
        ZenBeastsError::NotOwner
    );

    // Validate challenger and opponent are different beasts
    require!(
        ctx.accounts.challenger_beast.mint != ctx.accounts.opponent_beast.mint,
        ZenBeastsError::InvalidCombatSession
    );

    // Validate challenger and opponent owners are different wallets
    require!(
        ctx.accounts.challenger_owner.key() != ctx.accounts.opponent_beast.owner,
        ZenBeastsError::SelfCombatNotAllowed
    );

    // Validate wager is within min/max bounds
    require!(
        wager_amount >= ctx.accounts.config.min_combat_wager && wager_amount <= ctx.accounts.config.max_combat_wager,
        ZenBeastsError::InsufficientWager
    );

    // Validate both beasts can enter combat
    require!(
        ctx.accounts.challenger_beast.can_enter_combat(current_time, ctx.accounts.config.combat_cooldown),
        ZenBeastsError::CombatCooldownActive
    );
    require!(
        ctx.accounts.opponent_beast.can_enter_combat(current_time, ctx.accounts.config.combat_cooldown),
        ZenBeastsError::OpponentNotAvailable
    );

    // Validate challenger has sufficient ZEN for wager
    require!(
        ctx.accounts.challenger_token_account.amount >= wager_amount,
        ZenBeastsError::InsufficientFunds
    );

    // Transfer wager from challenger to escrow
    let transfer_cpi = Transfer {
        from: ctx.accounts.challenger_token_account.to_account_info(),
        to: ctx.accounts.escrow_token_account.to_account_info(),
        authority: ctx.accounts.challenger_owner.to_account_info(),
    };
    token::transfer(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), transfer_cpi),
        wager_amount,
    )?;

    // Generate combat seed using keccak hash of (session_id, challenger_mint, opponent_mint, current_time)
    let mut input = Vec::with_capacity(8 + 32 + 32 + 8);
    input.extend_from_slice(&session_id.to_le_bytes());
    input.extend_from_slice(&ctx.accounts.challenger_beast.mint.to_bytes());
    input.extend_from_slice(&ctx.accounts.opponent_beast.mint.to_bytes());
    input.extend_from_slice(&current_time.to_le_bytes());
    let hash = keccak::hash(&input);
    let combat_seed = u64::from_le_bytes(hash.0[0..8].try_into().unwrap());

    // Initialize combat_session with all fields
    let combat_session = &mut ctx.accounts.combat_session;
    combat_session.session_id = session_id;
    combat_session.challenger = ctx.accounts.challenger_beast.mint;
    combat_session.opponent = ctx.accounts.opponent_beast.mint;
    combat_session.challenger_owner = ctx.accounts.challenger_owner.key();
    combat_session.opponent_owner = ctx.accounts.opponent_beast.owner;
    combat_session.wager_amount = wager_amount;
    combat_session.turn_count = 0;
    combat_session.challenger_hp = ctx.accounts.challenger_beast.get_max_hp();
    combat_session.opponent_hp = ctx.accounts.opponent_beast.get_max_hp();
    combat_session.last_turn_timestamp = current_time;
    combat_session.combat_seed = combat_seed;
    combat_session.status = crate::state::CombatStatus::Active;
    combat_session.bump = ctx.bumps.combat_session;

    // Reset both beasts' combat stats
    ctx.accounts.challenger_beast.reset_combat_stats();
    ctx.accounts.opponent_beast.reset_combat_stats();

    // Set in_combat = true for both beasts
    ctx.accounts.challenger_beast.combat_stats.in_combat = true;
    ctx.accounts.opponent_beast.combat_stats.in_combat = true;

    // Update last_combat timestamp for both beasts
    ctx.accounts.challenger_beast.combat_stats.last_combat = current_time;
    ctx.accounts.opponent_beast.combat_stats.last_combat = current_time;

    // Emit CombatInitiated event
    emit!(crate::CombatInitiated {
        session_id,
        challenger: ctx.accounts.challenger_beast.mint,
        opponent: ctx.accounts.opponent_beast.mint,
        wager_amount,
        timestamp: current_time,
    });

    Ok(())
}