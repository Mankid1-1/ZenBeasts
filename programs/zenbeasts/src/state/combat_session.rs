use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum CombatStatus {
    Active,
    ChallengerWon,
    OpponentWon,
    Draw,
}

#[account]
#[derive(InitSpace)]
pub struct CombatSession {
    pub session_id: u64,
    pub challenger: Pubkey,
    pub opponent: Pubkey,
    pub challenger_owner: Pubkey,
    pub opponent_owner: Pubkey,
    pub wager_amount: u64,
    pub turn_count: u8,
    pub challenger_hp: u16,
    pub opponent_hp: u16,
    pub last_turn_timestamp: i64,
    pub combat_seed: u64,
    pub status: CombatStatus,
    pub bump: u8,
}

impl CombatSession {
    pub const SEED_PREFIX: &'static [u8] = b"combat";
    pub const MAX_TURNS: u8 = 10;

    pub fn is_active(&self) -> bool {
        self.status == CombatStatus::Active
    }

    pub fn is_finished(&self) -> bool {
        !self.is_active()
    }

    pub fn get_winner(&self) -> Option<Pubkey> {
        match self.status {
            CombatStatus::ChallengerWon => Some(self.challenger),
            CombatStatus::OpponentWon => Some(self.opponent),
            _ => None,
        }
    }
}