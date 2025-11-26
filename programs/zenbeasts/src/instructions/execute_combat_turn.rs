use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{BeastAccount, CombatSession, ProgramConfig, CombatStatus};
use crate::utils::combat;
use crate::errors::ZenBeastsError;

#[derive(Accounts)]
pub struct ExecuteCombatTurn<'info> {
    #[account(mut)]
    pub executor: Signer<'info>,

    #[account(
        mut,
        seeds = [CombatSession::SEED_PREFIX, combat_session.session_id.to_le_bytes().as_ref()],
        bump = combat_session.bump
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
        seeds = [ProgramConfig::SEED_PREFIX],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramConfig>,

    #[account(mut)]
    pub executor_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = config.zen_mint,
        associated_token::authority = combat_session,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ExecuteCombatTurn>, ability_index: u8) -> Result<()> {
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    let combat_session = &mut ctx.accounts.combat_session;
    let challenger_beast = &mut ctx.accounts.challenger_beast;
    let opponent_beast = &mut ctx.accounts.opponent_beast;
    let config = &ctx.accounts.config;

    // Validate combat session is active
    require!(combat_session.is_active(), ZenBeastsError::InvalidCombatSession);

    // Validate executor is a participant
    let is_challenger = ctx.accounts.executor.key() == combat_session.challenger_owner;
    let is_opponent = ctx.accounts.executor.key() == combat_session.opponent_owner;
    require!(is_challenger || is_opponent, ZenBeastsError::NotCombatParticipant);

    // Validate turn hasn't timed out
    let time_since_last_turn = current_time - combat_session.last_turn_timestamp;
    require!(
        time_since_last_turn < config.combat_turn_timeout,
        ZenBeastsError::CombatTurnTimeout
    );

    // Determine whose turn it is (even: challenger, odd: opponent)
    let is_challenger_turn = combat_session.turn_count % 2 == 0;
    require!(
        (is_challenger_turn && is_challenger) || (!is_challenger_turn && is_opponent),
        ZenBeastsError::InvalidCombatTurn
    );

    // If opponent's first turn (turn_count == 1), transfer wager to escrow
    if combat_session.turn_count == 1 && is_opponent {
        // Validate executor has sufficient ZEN for wager
        require!(
            ctx.accounts.executor_token_account.amount >= combat_session.wager_amount,
            ZenBeastsError::InsufficientFunds
        );

        // Transfer wager from opponent to escrow
        let transfer_cpi = Transfer {
            from: ctx.accounts.executor_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.executor.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), transfer_cpi),
            combat_session.wager_amount
        )?;
    }

    // Validate ability_index is valid (0-3)
    require!(ability_index < 4, ZenBeastsError::InvalidTraitIndex);

    // Get attacker and defender beasts
    let (attacker_beast, defender_beast) = if is_challenger {
        (&challenger_beast, &mut opponent_beast)
    } else {
        (&opponent_beast, &mut challenger_beast)
    };

    // Validate ability is unlocked
    require!(
        attacker_beast.has_ability_unlocked(ability_index),
        ZenBeastsError::AbilityNotUnlocked
    );

    // Get combat parameters
    let attacker_trait = attacker_beast.traits[ability_index as usize];
    let attacker_ability_level = attacker_beast.ability_levels[ability_index as usize];
    let ability_type = ability_index; // ability_index corresponds to ability type (0-3)

    // Calculate damage/healing
    let effect_amount = combat::calculate_turn_damage(
        combat_session.combat_seed,
        combat_session.turn_count,
        attacker_trait,
        attacker_ability_level,
        ability_type,
    )?;

    // Calculate energy cost
    let energy_cost = combat::calculate_ability_energy_cost(ability_type, attacker_ability_level);

    // Update attacker energy (deduct cost)
    let new_energy = attacker_beast.combat_stats.energy.saturating_sub(energy_cost);
    if is_challenger {
        challenger_beast.combat_stats.energy = new_energy;
    } else {
        opponent_beast.combat_stats.energy = new_energy;
    }

    // Apply effect
    let damage_dealt;
    if ability_type == combat::ABILITY_VITALITY {
        // Healing: apply to attacker
        let max_hp = attacker_beast.get_max_hp();
        let new_hp = (attacker_beast.combat_stats.hp as u32 + effect_amount as u32).min(max_hp as u32) as u16;
        if is_challenger {
            challenger_beast.combat_stats.hp = new_hp;
            combat_session.challenger_hp = new_hp;
        } else {
            opponent_beast.combat_stats.hp = new_hp;
            combat_session.opponent_hp = new_hp;
        }
        damage_dealt = effect_amount; // Positive for healing
    } else {
        // Damage: apply to defender
        let new_hp = defender_beast.combat_stats.hp.saturating_sub(effect_amount);
        defender_beast.combat_stats.hp = new_hp;
        if is_challenger {
            combat_session.opponent_hp = new_hp;
        } else {
            combat_session.challenger_hp = new_hp;
        }
        damage_dealt = effect_amount; // Positive for damage
    }

    // Increment turn count
    combat_session.turn_count += 1;
    combat_session.last_turn_timestamp = current_time;

    // Check win conditions
    if combat_session.opponent_hp == 0 {
        combat_session.status = if is_challenger {
            CombatStatus::ChallengerWon
        } else {
            CombatStatus::OpponentWon
        };
    } else if combat_session.challenger_hp == 0 {
        combat_session.status = if is_challenger {
            CombatStatus::OpponentWon
        } else {
            CombatStatus::ChallengerWon
        };
    } else if combat_session.turn_count >= CombatSession::MAX_TURNS {
        combat_session.status = CombatStatus::Draw;
    }

    // Emit event
    emit!(crate::CombatTurnExecuted {
        session_id: combat_session.session_id,
        turn_count: combat_session.turn_count,
        executor: ctx.accounts.executor.key(),
        ability_used: ability_index,
        damage_dealt,
        timestamp: current_time,
    });

    Ok(())
}