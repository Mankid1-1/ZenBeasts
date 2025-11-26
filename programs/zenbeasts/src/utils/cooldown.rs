use anchor_lang::prelude::*;
use crate::state::BeastAccount;
use crate::errors::ZenBeastsError;

/// Check if a beast is currently in cooldown period
/// Returns true if the beast can perform an activity (cooldown has elapsed)
/// Returns false if the beast is still in cooldown
pub fn can_perform_activity(beast: &BeastAccount, current_time: i64, cooldown_duration: i64) -> bool {
    let time_since_last_activity = current_time
        .checked_sub(beast.last_activity)
        .unwrap_or(0);
    
    time_since_last_activity >= cooldown_duration
}

/// Calculate the remaining cooldown time in seconds
/// Returns 0 if cooldown has elapsed
/// Returns the number of seconds remaining if still in cooldown
pub fn get_remaining_cooldown(beast: &BeastAccount, current_time: i64, cooldown_duration: i64) -> i64 {
    let cooldown_end_time = beast.last_activity
        .checked_add(cooldown_duration)
        .unwrap_or(i64::MAX);
    
    let remaining = cooldown_end_time
        .checked_sub(current_time)
        .unwrap_or(0);
    
    remaining.max(0)
}

/// Get the timestamp when the cooldown will end
pub fn get_cooldown_end_time(beast: &BeastAccount, cooldown_duration: i64) -> i64 {
    beast.last_activity
        .checked_add(cooldown_duration)
        .unwrap_or(i64::MAX)
}

/// Validate that a beast is not in cooldown, returning an error if it is
pub fn require_not_in_cooldown(
    beast: &BeastAccount,
    current_time: i64,
    cooldown_duration: i64,
) -> Result<()> {
    require!(
        can_perform_activity(beast, current_time, cooldown_duration),
        ZenBeastsError::CooldownActive
    );
    Ok(())
}

/// Check if a beast is in breeding cooldown
pub fn can_breed(beast: &BeastAccount, current_time: i64, breeding_cooldown: i64) -> bool {
    let time_since_last_breeding = current_time
        .checked_sub(beast.last_breeding)
        .unwrap_or(i64::MAX);
    
    time_since_last_breeding >= breeding_cooldown
}

/// Calculate the remaining breeding cooldown time in seconds
pub fn get_remaining_breeding_cooldown(
    beast: &BeastAccount,
    current_time: i64,
    breeding_cooldown: i64,
) -> i64 {
    let cooldown_end_time = beast.last_breeding
        .checked_add(breeding_cooldown)
        .unwrap_or(i64::MAX);
    
    let remaining = cooldown_end_time
        .checked_sub(current_time)
        .unwrap_or(0);
    
    remaining.max(0)
}

/// Validate that a beast is not in breeding cooldown
pub fn require_not_in_breeding_cooldown(
    beast: &BeastAccount,
    current_time: i64,
    breeding_cooldown: i64,
) -> Result<()> {
    require!(
        can_breed(beast, current_time, breeding_cooldown),
        ZenBeastsError::BreedingCooldownActive
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::prelude::Pubkey;

    fn create_test_beast(last_activity: i64, last_breeding: i64) -> BeastAccount {
        BeastAccount {
            mint: Pubkey::new_unique(),
            owner: Pubkey::new_unique(),
            traits: [100, 150, 200, 50, 0, 0, 0, 0, 0, 0],
            rarity_score: 500,
            last_activity,
            activity_count: 0,
            pending_rewards: 0,
            parents: [Pubkey::default(), Pubkey::default()],
            generation: 0,
            last_breeding,
            breeding_count: 0,
            metadata_uri: String::from("https://example.com"),
            bump: 255,
        }
    }

    #[test]
    fn test_can_perform_activity_when_cooldown_elapsed() {
        let beast = create_test_beast(1000, 0);
        let current_time = 4600; // 3600 seconds (1 hour) after last activity
        let cooldown = 3600;
        
        assert!(can_perform_activity(&beast, current_time, cooldown));
    }

    #[test]
    fn test_cannot_perform_activity_during_cooldown() {
        let beast = create_test_beast(1000, 0);
        let current_time = 2000; // Only 1000 seconds after last activity
        let cooldown = 3600;
        
        assert!(!can_perform_activity(&beast, current_time, cooldown));
    }

    #[test]
    fn test_can_perform_activity_exactly_at_cooldown_end() {
        let beast = create_test_beast(1000, 0);
        let current_time = 4600; // Exactly 3600 seconds after
        let cooldown = 3600;
        
        assert!(can_perform_activity(&beast, current_time, cooldown));
    }

    #[test]
    fn test_get_remaining_cooldown_returns_zero_when_elapsed() {
        let beast = create_test_beast(1000, 0);
        let current_time = 5000; // Well past cooldown
        let cooldown = 3600;
        
        let remaining = get_remaining_cooldown(&beast, current_time, cooldown);
        assert_eq!(remaining, 0);
    }

    #[test]
    fn test_get_remaining_cooldown_calculates_correctly() {
        let beast = create_test_beast(1000, 0);
        let current_time = 2000; // 1000 seconds after last activity
        let cooldown = 3600; // 1 hour cooldown
        
        let remaining = get_remaining_cooldown(&beast, current_time, cooldown);
        assert_eq!(remaining, 2600); // 3600 - 1000 = 2600 seconds remaining
    }

    #[test]
    fn test_get_cooldown_end_time() {
        let beast = create_test_beast(1000, 0);
        let cooldown = 3600;
        
        let end_time = get_cooldown_end_time(&beast, cooldown);
        assert_eq!(end_time, 4600); // 1000 + 3600
    }

    #[test]
    fn test_can_breed_when_cooldown_elapsed() {
        let beast = create_test_beast(0, 1000);
        let current_time = 8600; // 7200 seconds (2 hours) after last breeding
        let breeding_cooldown = 7200;
        
        assert!(can_breed(&beast, current_time, breeding_cooldown));
    }

    #[test]
    fn test_cannot_breed_during_cooldown() {
        let beast = create_test_beast(0, 1000);
        let current_time = 5000; // Only 4000 seconds after last breeding
        let breeding_cooldown = 7200;
        
        assert!(!can_breed(&beast, current_time, breeding_cooldown));
    }

    #[test]
    fn test_get_remaining_breeding_cooldown() {
        let beast = create_test_beast(0, 1000);
        let current_time = 5000; // 4000 seconds after last breeding
        let breeding_cooldown = 7200; // 2 hour cooldown
        
        let remaining = get_remaining_breeding_cooldown(&beast, current_time, breeding_cooldown);
        assert_eq!(remaining, 3200); // 7200 - 4000 = 3200 seconds remaining
    }

    #[test]
    fn test_first_activity_no_cooldown() {
        // Beast with last_activity = 0 (never performed activity)
        let beast = create_test_beast(0, 0);
        let current_time = 1000;
        let cooldown = 3600;
        
        // Should be able to perform activity immediately
        assert!(can_perform_activity(&beast, current_time, cooldown));
        assert_eq!(get_remaining_cooldown(&beast, current_time, cooldown), 0);
    }

    #[test]
    fn test_first_breeding_no_cooldown() {
        // Beast with last_breeding = 0 (never bred)
        let beast = create_test_beast(0, 0);
        let current_time = 1000;
        let breeding_cooldown = 7200;
        
        // Should be able to breed immediately
        assert!(can_breed(&beast, current_time, breeding_cooldown));
        assert_eq!(get_remaining_breeding_cooldown(&beast, current_time, breeding_cooldown), 0);
    }
}
