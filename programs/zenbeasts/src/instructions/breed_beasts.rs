use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Burn, Mint, MintTo, Token, TokenAccount, Transfer};
use mpl_token_metadata::instruction as mpl_instruction;

use crate::errors::ZenBeastsError;
use crate::state::{beast_account::BeastAccount, program_config::ProgramConfig};
use crate::utils::traits::{self, TRAIT_LAYERS};

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct BreedBeasts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Parent A Beast account (must be owned by payer)
    #[account(mut)]
    pub parent_a: Account<'info, BeastAccount>,

    /// Parent B Beast account (must be owned by payer and distinct from A)
    #[account(mut)]
    pub parent_b: Account<'info, BeastAccount>,

    /// Global config storing zen mint / treasury / costs
    #[account(
        mut,
        seeds = [ProgramConfig::SEED_PREFIX],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramConfig>,

    /// Newly created Beast account for the child
    #[account(
        init,
        payer = payer,
        space = 8 + BeastAccount::INIT_SPACE,
        seeds = [BeastAccount::SEED_PREFIX, child_mint.key().as_ref()],
        bump
    )]
    pub child_beast: Account<'info, BeastAccount>,

    /// New child NFT mint and token account
    #[account(
        init,
        payer = payer,
        mint::decimals = 0,
        mint::authority = payer,
        mint::freeze_authority = payer,
    )]
    pub child_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = payer,
        associated_token::mint = child_mint,
        associated_token::authority = payer,
    )]
    pub child_token_account: Account<'info, TokenAccount>,

    /// Payer's $ZEN token account used for breeding fee
    #[account(mut)]
    pub payer_zen_ata: Account<'info, TokenAccount>,

    /// Treasury token account that receives non-burnt portion
    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,

    pub zen_mint: Account<'info, Mint>,

    #[account(mut)]
    /// CHECK: Metaplex metadata PDA for child mint
    pub metadata: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Metaplex master edition PDA for child mint
    pub master_edition: UncheckedAccount<'info>,

    /// CHECK: Token metadata program
    #[account(address = mpl_token_metadata::ID)]
    pub token_metadata_program: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<BreedBeasts>,
    seed: u64,
    name: String,
    uri: String,
    zen_amount: u64,
) -> Result<()> {
    require!(name.len() <= 32, ZenBeastsError::NameTooLong);
    require!(uri.len() <= 200, ZenBeastsError::UriTooLong);

    let parent_a = &mut ctx.accounts.parent_a;
    let parent_b = &mut ctx.accounts.parent_b;
    let payer = &ctx.accounts.payer;

    // Both parents must be owned by the breeder
    require!(parent_a.owner == payer.key(), ZenBeastsError::NotOwner);
    require!(parent_b.owner == payer.key(), ZenBeastsError::NotOwner);
    // Parents must be distinct beasts
    require!(parent_a.mint != parent_b.mint, ZenBeastsError::InvalidParents);

    // Get current time for cooldown checks
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // Validate all breeding requirements (cooldowns and breeding counts)
    let cfg = &ctx.accounts.config;
    crate::utils::breeding::validate_breeding_requirements(
        parent_a,
        parent_b,
        current_time,
        cfg,
    )?;

    // Calculate generation-based breeding cost
    let required_cost = crate::utils::breeding::calculate_breeding_cost(
        parent_a,
        parent_b,
        cfg,
    )?;
    require!(zen_amount >= required_cost, ZenBeastsError::InsufficientFunds);

    require!(ctx.accounts.payer_zen_ata.mint == ctx.accounts.zen_mint.key(), ZenBeastsError::TokenAccountMismatch);

    let burn_pct = cfg.burn_percentage as u64;
    require!(burn_pct <= 100, ZenBeastsError::InvalidBurnPercentage);

    let burn_amount = zen_amount
        .checked_mul(burn_pct)
        .ok_or(ZenBeastsError::ArithmeticOverflow)?
        .checked_div(100)
        .ok_or(ZenBeastsError::ArithmeticOverflow)?;
    let transfer_amount = zen_amount
        .checked_sub(burn_amount)
        .ok_or(ZenBeastsError::ArithmeticOverflow)?;

    // Burn portion of the breeding fee
    let burn_cpi = Burn {
        mint: ctx.accounts.zen_mint.to_account_info(),
        from: ctx.accounts.payer_zen_ata.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };
    token::burn(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), burn_cpi),
        burn_amount,
    )?;

    // Send remaining fee to treasury
    let transfer_cpi = Transfer {
        from: ctx.accounts.payer_zen_ata.to_account_info(),
        to: ctx.accounts.treasury.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };
    token::transfer(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), transfer_cpi),
        transfer_amount,
    )?;

    // Derive child traits from parents
    let recent = Clock::get()?.unix_timestamp as u64;
    let seed_mix = seed ^ recent as u64;
    let (child_traits, rarity_score) = traits::breed_traits(seed_mix, &parent_a.traits, &parent_b.traits);

    // Update parent breeding state
    parent_a.update_breeding(current_time);
    parent_b.update_breeding(current_time);

    // Initialize child beast account
    let child = &mut ctx.accounts.child_beast;
    child.mint = ctx.accounts.child_mint.key();
    child.owner = payer.key();
    child.traits = child_traits;
    child.rarity_score = rarity_score;
    child.last_activity = 0;
    child.activity_count = 0;
    child.pending_rewards = 0;
    child.parents = [parent_a.mint, parent_b.mint];
    // Generation = max(parent generations) + 1
    let max_gen = core::cmp::max(parent_a.generation, parent_b.generation);
    child.generation = max_gen.saturating_add(1);
    child.last_breeding = 0;
    child.breeding_count = 0;
    child.metadata_uri = uri.clone();
    child.bump = ctx.bumps.child_beast;

    // Initialize ability arrays
    child.abilities = [0, 0, 0, 0];
    child.ability_levels = [0, 0, 0, 0];

    // Initialize combat_stats
    child.combat_stats.hp = (child.traits[3] as u16) * 10;
    child.combat_stats.energy = 100;
    child.combat_stats.wins = 0;
    child.combat_stats.losses = 0;
    child.combat_stats.last_combat = 0;
    child.combat_stats.in_combat = false;

    // Increment global minted counter
    let cfg_mut = &mut ctx.accounts.config;
    cfg_mut.total_minted = cfg_mut
        .total_minted
        .checked_add(1)
        .ok_or(ZenBeastsError::ArithmeticOverflow)?;

    // Mint the child NFT
    let cpi_accounts = MintTo {
        mint: ctx.accounts.child_mint.to_account_info(),
        to: ctx.accounts.child_token_account.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };
    token::mint_to(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
        1,
    )?;

    // Create metadata + master edition for child
    let creators = vec![mpl_token_metadata::state::Creator {
        address: payer.key(),
        verified: false,
        share: 100,
    }];

    let create_md = mpl_instruction::create_metadata_accounts_v3(
        ctx.accounts.token_metadata_program.key(),
        ctx.accounts.metadata.key(),
        ctx.accounts.child_mint.key(),
        payer.key(),
        payer.key(),
        payer.key(),
        name.clone(),
        "ZBST".to_string(),
        uri.clone(),
        Some(creators),
        500,
        true,
        true,
        None,
        None,
        None,
    );
    anchor_lang::solana_program::program::invoke(
        &create_md,
        &[
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.child_mint.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
    )?;

    let create_me = mpl_instruction::create_master_edition_v3(
        ctx.accounts.token_metadata_program.key(),
        ctx.accounts.master_edition.key(),
        ctx.accounts.child_mint.key(),
        payer.key(),
        payer.key(),
        ctx.accounts.metadata.key(),
        payer.key(),
        Some(0),
    );
    anchor_lang::solana_program::program::invoke(
        &create_me,
        &[
            ctx.accounts.master_edition.to_account_info(),
            ctx.accounts.child_mint.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
    )?;

    // Emit BeastMinted event for the offspring
    emit!(crate::BeastMinted {
        mint: ctx.accounts.child_mint.key(),
        owner: payer.key(),
        traits: [child_traits[0], child_traits[1], child_traits[2], child_traits[3]],
        rarity_score,
        generation: child.generation,
        timestamp: current_time,
    });

    // Emit BeastBred event with parent and offspring details
    emit!(crate::BeastBred {
        parent1: parent_a.mint,
        parent2: parent_b.mint,
        offspring: ctx.accounts.child_mint.key(),
        generation: child.generation,
        cost_paid: zen_amount,
    });

    Ok(())
}