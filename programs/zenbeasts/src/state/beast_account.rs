use anchor_lang::prelude::*;

#[derive(InitSpace)]
pub struct CombatStats {
    /// Current hit points (max = Vitality trait × 10)
    pub hp: u16,
    /// Energy for abilities (max = 100, regenerates per turn)
    pub energy: u8,
    /// Total combat victories
    pub wins: u32,
    /// Total combat defeats
    pub losses: u32,
    /// Unix timestamp of last combat
    pub last_combat: i64,
    /// Flag indicating if beast is currently in combat session
    pub in_combat: bool,
}

#[account]
#[derive(InitSpace)]
pub struct BeastAccount {
    /// Mint address of the Beast NFT
    pub mint: Pubkey,
    /// Current owner wallet
    pub owner: Pubkey,
    /// 10 on-chain trait indices (layered artwork / stats)
    pub traits: [u8; 10],
    /// Aggregate rarity score derived from traits
    pub rarity_score: u64,
    /// Last activity timestamp (any activity type or brawl)
    pub last_activity: i64,
    /// Total number of activities performed
    pub activity_count: u32,
    /// Unclaimed on-chain rewards for this Beast
    pub pending_rewards: u64,
    /// Optional parent mints for breeding (zero pubkeys for Gen0)
    pub parents: [Pubkey; 2],
    /// Generation number (0 for original mints, +1 per breeding)
    pub generation: u8,
    /// Unix timestamp of last breeding
    pub last_breeding: i64,
    /// Total times this beast has bred
    pub breeding_count: u8,
    /// Array storing unlocked ability IDs for each trait slot (0=none, 1-255=ability ID)
    pub abilities: [u8; 4],
    /// Level of each ability (0-10), affects power/effectiveness
    pub ability_levels: [u8; 4],
    /// Embedded struct for combat state
    pub combat_stats: CombatStats,
    /// URI to off-chain JSON metadata
    #[max_len(200)]
    pub metadata_uri: String,
    /// PDA bump
    pub bump: u8,
}

impl BeastAccount {
    pub const SEED_PREFIX: &'static [u8] = b"beast";

    /// Check if beast can perform an activity (cooldown has elapsed)
    /// Delegates to utils::cooldown for consistent cooldown logic
    pub fn can_perform_activity(&self, current_time: i64, cooldown: i64) -> bool {
        crate::utils::cooldown::can_perform_activity(self, current_time, cooldown)
    }

    /// Update beast state after performing an activity
    pub fn update_activity(&mut self, current_time: i64) {
        self.last_activity = current_time;
        self.activity_count += 1;
    }

    /// Check if beast can breed (breeding cooldown has elapsed)
    pub fn can_breed(&self, current_time: i64, breeding_cooldown: i64) -> bool {
        crate::utils::cooldown::can_breed(self, current_time, breeding_cooldown)
    }

    /// Update beast state after breeding
    pub fn update_breeding(&mut self, current_time: i64) {
        self.last_breeding = current_time;
        self.breeding_count += 1;
    }

    /// Check if combat cooldown elapsed and not already in combat
    pub fn can_enter_combat(&self, current_time: i64, combat_cooldown: i64) -> bool {
        !self.combat_stats.in_combat && (current_time - self.combat_stats.last_combat >= combat_cooldown)
    }

    /// Reset HP to max (Vitality × 10) and energy to 100
    pub fn reset_combat_stats(&mut self) {
        self.combat_stats.hp = self.get_max_hp();
        self.combat_stats.energy = 100;
    }

    /// Check if ability slot has an ability (abilities[trait_index] > 0)
    pub fn has_ability_unlocked(&self, trait_index: u8) -> bool {
        self.abilities[trait_index as usize] > 0
    }

    /// Calculate max HP based on Vitality trait (traits[3] × 10)
    pub fn get_max_hp(&self) -> u16 {
        (self.traits[3] as u16) * 10
    }
}
