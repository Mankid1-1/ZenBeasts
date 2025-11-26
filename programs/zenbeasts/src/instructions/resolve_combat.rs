use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Burn, Transfer};
use crate::state::{CombatSession, BeastAccount, ProgramConfig};
use crate::errors::ZenBeastsError;

#[derive(Accounts)]
pub struct ResolveCombat<'info> {
    #[account(mut)]
    pub resolver: Signer<'info>,

    #[account(
        mut,
        seeds = [CombatSession::SEED_PREFIX, combat_session.session_id.to_le_bytes().as_ref()],
        bump = combat_session.bump,
        close = resolver
    )]
    pub combat_session: Account<'info, CombatSession>,

    #[account(
        mut,
        seeds = [BeastAccount::SEED_PREFIX, challenger_beast.mint.as_ref()],
        bump = challenger_beast.bump
    )]
    pub challenger_beast: Account<'info, BeastAccount>,

    #[account(
        mut,
        seeds = [BeastAccount::SEED_PREFIX, opponent_beast.mint.as_ref()],
        bump = opponent_beast.bump
    )]
    pub opponent_beast: Account<'info, BeastAccount>,

    #[account(
        mut,
        constraint = challenger_token_account.mint == config.zen_mint @ ZenBeastsError::TokenAccountMismatch,
        constraint = challenger_token_account.owner == combat_session.challenger_owner @ ZenBeastsError::TokenAccountMismatch,
    )]
    pub challenger_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = opponent_token_account.mint == config.zen_mint @ ZenBeastsError::TokenAccountMismatch,
        constraint = opponent_token_account.owner == combat_session.opponent_owner @ ZenBeastsError::TokenAccountMismatch,
    )]
    pub opponent_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = zen_mint,
        associated_token::authority = combat_session,
        close = resolver
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub zen_mint: Account<'info, Mint>,

    pub config: Account<'info, ProgramConfig>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ResolveCombat>) -> Result<()> {
    let session = &ctx.accounts.combat_session;
    let config = &ctx.accounts.config;

    // Validate combat is finished
    require!(session.is_finished(), ZenBeastsError::InvalidCombatSession);

    // Validate resolver is a participant
    require!(
        ctx.accounts.resolver.key() == session.challenger_owner || ctx.accounts.resolver.key() == session.opponent_owner,
        ZenBeastsError::NotCombatParticipant
    );

    // Calculate total pot
    let total_pot = session.wager_amount
        .checked_mul(2)
        .ok_or(ZenBeastsError::ArithmeticOverflow)?;

    let clock = Clock::get()?;
    let timestamp = clock.unix_timestamp;

    // Prepare signer seeds for PDA
    let session_id_bytes = session.session_id.to_le_bytes();
    let bump = &[session.bump];
    let signer_seeds: &[&[&[u8]]] = &[&[CombatSession::SEED_PREFIX, &session_id_bytes, bump]];

    match session.status {
        crate::state::CombatStatus::ChallengerWon => {
            let winner_beast = &mut ctx.accounts.challenger_beast;
            let loser_beast = &mut ctx.accounts.opponent_beast;
            let winner_account = &ctx.accounts.challenger_token_account;

            let winner_percentage = config.combat_winner_percentage as u64;
            let winner_amount = total_pot
                .checked_mul(winner_percentage)
                .ok_or(ZenBeastsError::ArithmeticOverflow)?
                .checked_div(100)
                .ok_or(ZenBeastsError::ArithmeticOverflow)?;
            let burn_amount = total_pot
                .checked_sub(winner_amount)
                .ok_or(ZenBeastsError::ArithmeticUnderflow)?;

            // Transfer to winner
            let transfer_cpi = Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: winner_account.to_account_info(),
                authority: ctx.accounts.combat_session.to_account_info(),
            };
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    transfer_cpi,
                    signer_seeds,
                ),
                winner_amount,
            )?;

            // Burn remaining
            if burn_amount > 0 {
                let burn_cpi = Burn {
                    mint: ctx.accounts.zen_mint.to_account_info(),
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    authority: ctx.accounts.combat_session.to_account_info(),
                };
                token::burn(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        burn_cpi,
                        signer_seeds,
                    ),
                    burn_amount,
                )?;
            }

            // Update stats
            winner_beast.combat_stats.wins = winner_beast
                .combat_stats
                .wins
                .checked_add(1)
                .ok_or(ZenBeastsError::ArithmeticOverflow)?;
            loser_beast.combat_stats.losses = loser_beast
                .combat_stats
                .losses
                .checked_add(1)
                .ok_or(ZenBeastsError::ArithmeticOverflow)?;

            // Emit event
            emit!(crate::CombatResolved {
                session_id: session.session_id,
                winner: Some(session.challenger),
                total_pot,
                winner_payout: winner_amount,
                burned_amount: burn_amount,
                timestamp,
            });
        }
        crate::state::CombatStatus::OpponentWon => {
            let winner_beast = &mut ctx.accounts.opponent_beast;
            let loser_beast = &mut ctx.accounts.challenger_beast;
            let winner_account = &ctx.accounts.opponent_token_account;

            let winner_percentage = config.combat_winner_percentage as u64;
            let winner_amount = total_pot
                .checked_mul(winner_percentage)
                .ok_or(ZenBeastsError::ArithmeticOverflow)?
                .checked_div(100)
                .ok_or(ZenBeastsError::ArithmeticOverflow)?;
            let burn_amount = total_pot
                .checked_sub(winner_amount)
                .ok_or(ZenBeastsError::ArithmeticUnderflow)?;

            // Transfer to winner
            let transfer_cpi = Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: winner_account.to_account_info(),
                authority: ctx.accounts.combat_session.to_account_info(),
            };
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    transfer_cpi,
                    signer_seeds,
                ),
                winner_amount,
            )?;

            // Burn remaining
            if burn_amount > 0 {
                let burn_cpi = Burn {
                    mint: ctx.accounts.zen_mint.to_account_info(),
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    authority: ctx.accounts.combat_session.to_account_info(),
                };
                token::burn(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        burn_cpi,
                        signer_seeds,
                    ),
                    burn_amount,
                )?;
            }

            // Update stats
            winner_beast.combat_stats.wins = winner_beast
                .combat_stats
                .wins
                .checked_add(1)
                .ok_or(ZenBeastsError::ArithmeticOverflow)?;
            loser_beast.combat_stats.losses = loser_beast
                .combat_stats
                .losses
                .checked_add(1)
                .ok_or(ZenBeastsError::ArithmeticOverflow)?;

            // Emit event
            emit!(crate::CombatResolved {
                session_id: session.session_id,
                winner: Some(session.opponent),
                total_pot,
                winner_payout: winner_amount,
                burned_amount: burn_amount,
                timestamp,
            });
        }
        crate::state::CombatStatus::Draw => {
            let refund_amount = session.wager_amount;

            // Refund to challenger
            let transfer_cpi = Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.challenger_token_account.to_account_info(),
                authority: ctx.accounts.combat_session.to_account_info(),
            };
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    transfer_cpi,
                    signer_seeds,
                ),
                refund_amount,
            )?;

            // Refund to opponent
            let transfer_cpi2 = Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.opponent_token_account.to_account_info(),
                authority: ctx.accounts.combat_session.to_account_info(),
            };
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    transfer_cpi2,
                    signer_seeds,
                ),
                refund_amount,
            )?;

            // Emit event
            emit!(crate::CombatResolved {
                session_id: session.session_id,
                winner: None,
                total_pot,
                winner_payout: 0,
                burned_amount: 0,
                timestamp,
            });
        }
        _ => {} // Active should not reach here
    }

    // Set in_combat to false for both beasts
    ctx.accounts.challenger_beast.combat_stats.in_combat = false;
    ctx.accounts.opponent_beast.combat_stats.in_combat = false;

    Ok(())
}