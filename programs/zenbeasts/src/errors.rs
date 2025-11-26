use anchor_lang::prelude::*;

#[error_code]
pub enum ZenBeastsError {
    #[msg("Name is too long")]
    NameTooLong,
    #[msg("URI is too long")]
    UriTooLong,
    #[msg("Invalid trait value")]
    InvalidTrait,
    #[msg("Arithmetic overflow occurred")]
    ArithmeticOverflow,
    #[msg("Arithmetic underflow occurred")]
    ArithmeticUnderflow,
    #[msg("Beast is in cooldown period")]
    CooldownActive,
    #[msg("Not the owner of this beast")]
    NotOwner,
    #[msg("Insufficient funds for this operation")]
    InsufficientFunds,
    #[msg("Invalid activity type")]
    InvalidActivityType,
    #[msg("Invalid trait index")]
    InvalidTraitIndex,
    #[msg("Trait value is already at this level")]
    SameTraitValue,
    #[msg("Invalid burn percentage (must be 0-100)")]
    InvalidBurnPercentage,
    #[msg("Token account mismatch")]
    TokenAccountMismatch,
    #[msg("No rewards to claim")]
    NoRewardsToClaim,
    #[msg("Invalid parent beasts")]
    InvalidParents,
    #[msg("Trait has reached maximum value (255)")]
    TraitMaxReached,
    #[msg("Invalid PDA derivation")]
    InvalidPDA,
    #[msg("Beast is in breeding cooldown")]
    BreedingCooldownActive,
    #[msg("Beast has reached maximum breeding count")]
    MaxBreedingReached,
    #[msg("Insufficient treasury balance")]
    InsufficientTreasuryBalance,
    #[msg("Unauthorized - caller is not the program authority")]
    Unauthorized,
    #[msg("Program is already initialized")]
    AlreadyInitialized,
    #[msg("Invalid configuration parameters")]
    InvalidConfiguration,
    #[msg("Invalid generation calculation")]
    InvalidGeneration,
    #[msg("Owner is unchanged - new owner is the same as current owner")]
    OwnerUnchanged,
    #[msg("Invalid NFT ownership - token account does not hold the NFT")]
    InvalidNFTOwnership,
    #[msg("Ability has not been unlocked for this trait slot")]
    AbilityNotUnlocked,
    #[msg("Ability is already unlocked for this trait slot")]
    AbilityAlreadyUnlocked,
    #[msg("Ability has reached maximum level (10)")]
    AbilityMaxLevel,
    #[msg("Invalid ability ID (must be 1-255)")]
    InvalidAbilityId,
    #[msg("Ability does not match the trait slot")]
    InvalidTraitForAbility,
    #[msg("Beast is currently in an active combat session")]
    BeastInCombat,
    #[msg("Beast is in combat cooldown period")]
    CombatCooldownActive,
    #[msg("Combat session is invalid or expired")]
    InvalidCombatSession,
    #[msg("Combat session has already finished")]
    CombatAlreadyFinished,
    #[msg("Caller is not a participant in this combat")]
    NotCombatParticipant,
    #[msg("Wager amount is below minimum required")]
    InsufficientWager,
    #[msg("Combat turn has timed out")]
    CombatTurnTimeout,
    #[msg("Invalid turn order or turn already executed")]
    InvalidCombatTurn,
    #[msg("Cannot initiate combat with your own beast")]
    SelfCombatNotAllowed,
    #[msg("Opponent beast is not available for combat")]
    OpponentNotAvailable,
}
