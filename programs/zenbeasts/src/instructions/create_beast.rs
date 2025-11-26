use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};
use mpl_token_metadata::instruction as mpl_instruction;
use anchor_spl::associated_token::AssociatedToken;
use crate::state::{beast_account::BeastAccount, program_config::ProgramConfig};
use crate::utils::traits;
use crate::errors::ZenBeastsError;

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct CreateBeast<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + BeastAccount::INIT_SPACE,
        seeds = [BeastAccount::SEED_PREFIX, nft_mint.key().as_ref()],
        bump
    )]
    pub beast_account: Account<'info, BeastAccount>,
    #[account(
        mut,
        seeds = [ProgramConfig::SEED_PREFIX],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramConfig>,
    #[account(
        init,
        payer = payer,
        mint::decimals = 0,
        mint::authority = payer,
        mint::freeze_authority = payer,
    )]
    pub nft_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = payer,
        associated_token::mint = nft_mint,
        associated_token::authority = payer,
    )]
    pub nft_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK:
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
    /// CHECK:
    #[account(address = mpl_token_metadata::ID)]
    pub token_metadata_program: UncheckedAccount<'info>,
}

pub fn handler(
    ctx: Context<CreateBeast>,
    seed: u64,
    name: String,
    uri: String,
) -> Result<()> {
    require!(name.len() <= 32, ZenBeastsError::NameTooLong);
    require!(uri.len() <= 200, ZenBeastsError::UriTooLong);

    let recent = Clock::get()?.unix_timestamp.to_le_bytes();
    let (traits_arr, rarity_score) = traits::generate_traits(
        seed,
        &ctx.accounts.payer.key(),
        &recent,
    );

    let beast = &mut ctx.accounts.beast_account;
    beast.mint = ctx.accounts.nft_mint.key();
    beast.owner = ctx.accounts.payer.key();
    beast.traits = traits_arr;
    beast.rarity_score = rarity_score;
    beast.last_activity = 0;
    beast.activity_count = 0;
    beast.pending_rewards = 0;
    beast.parents = [Pubkey::default(), Pubkey::default()];
    beast.generation = 0;
    beast.last_breeding = 0;
    beast.breeding_count = 0;
    beast.metadata_uri = uri.clone();
    beast.bump = ctx.bumps.beast_account;
    beast.abilities = [0, 0, 0, 0];
    beast.ability_levels = [0, 0, 0, 0];
    beast.combat_stats.hp = (beast.traits[3] as u16) * 10;
    beast.combat_stats.energy = 100;
    beast.combat_stats.wins = 0;
    beast.combat_stats.losses = 0;
    beast.combat_stats.last_combat = 0;
    beast.combat_stats.in_combat = false;

    let config = &mut ctx.accounts.config;
    config.total_minted = config.total_minted.checked_add(1).ok_or(ZenBeastsError::ArithmeticOverflow)?;

    let cpi_accounts = MintTo {
        mint: ctx.accounts.nft_mint.to_account_info(),
        to: ctx.accounts.nft_token_account.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };
    token::mint_to(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
        1,
    )?;

    let creators = vec![mpl_token_metadata::state::Creator { address: ctx.accounts.payer.key(), verified: false, share: 100 }];
    let create_md = mpl_instruction::create_metadata_accounts_v3(
        ctx.accounts.token_metadata_program.key(),
        ctx.accounts.metadata.key(),
        ctx.accounts.nft_mint.key(),
        ctx.accounts.payer.key(),
        ctx.accounts.payer.key(),
        ctx.accounts.payer.key(),
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
            ctx.accounts.nft_mint.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
    )?;

    let create_me = mpl_instruction::create_master_edition_v3(
        ctx.accounts.token_metadata_program.key(),
        ctx.accounts.master_edition.key(),
        ctx.accounts.nft_mint.key(),
        ctx.accounts.payer.key(),
        ctx.accounts.payer.key(),
        ctx.accounts.metadata.key(),
        ctx.accounts.payer.key(),
        Some(0),
    );
    anchor_lang::solana_program::program::invoke(
        &create_me,
        &[
            ctx.accounts.master_edition.to_account_info(),
            ctx.accounts.nft_mint.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
    )?;

    let clock = Clock::get()?;
    emit!(crate::BeastMinted {
        mint: ctx.accounts.nft_mint.key(),
        owner: ctx.accounts.payer.key(),
        traits: [traits_arr[0], traits_arr[1], traits_arr[2], traits_arr[3]],
        rarity_score,
        generation: 0,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
