use anchor_lang::prelude::*;
use crate::errors::ZenBeastsError;

/// Calculate the burn amount and treasury transfer amount from a total cost
/// 
/// # Arguments
/// * `cost` - Total cost in tokens
/// * `burn_percentage` - Percentage to burn (0-100)
/// 
/// # Returns
/// A tuple of (burn_amount, treasury_amount) where:
/// - burn_amount: tokens to be burned
/// - treasury_amount: tokens to be transferred to treasury
/// 
/// # Example
/// ```
/// let (burn, treasury) = calculate_burn_and_transfer(1000, 10)?;
/// // burn = 100 (10% of 1000)
/// // treasury = 900 (90% of 1000)
/// ```
pub fn calculate_burn_and_transfer(cost: u64, burn_percentage: u8) -> Result<(u64, u64)> {
    // Validate burn percentage is within valid range
    require!(
        burn_percentage <= 100,
        ZenBeastsError::InvalidBurnPercentage
    );
    
    // Calculate burn amount: cost × burn_percentage / 100
    let burn_amount = cost
        .checked_mul(burn_percentage as u64)
        .ok_or(ZenBeastsError::ArithmeticOverflow)?
        .checked_div(100)
        .ok_or(ZenBeastsError::ArithmeticOverflow)?;
    
    // Calculate treasury amount: cost - burn_amount
    let treasury_amount = cost
        .checked_sub(burn_amount)
        .ok_or(ZenBeastsError::ArithmeticUnderflow)?;
    
    Ok((burn_amount, treasury_amount))
}

/// Validate that the treasury has sufficient balance for a reward claim
/// 
/// # Arguments
/// * `treasury_balance` - Current treasury token balance
/// * `claim_amount` - Amount user wants to claim
/// 
/// # Returns
/// Ok(()) if treasury has sufficient balance, error otherwise
pub fn validate_treasury_balance(treasury_balance: u64, claim_amount: u64) -> Result<()> {
    require!(
        treasury_balance >= claim_amount,
        ZenBeastsError::InsufficientTreasuryBalance
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_burn_and_transfer_10_percent() {
        let (burn, treasury) = calculate_burn_and_transfer(1000, 10).unwrap();
        assert_eq!(burn, 100); // 10% of 1000
        assert_eq!(treasury, 900); // 90% of 1000
    }

    #[test]
    fn test_calculate_burn_and_transfer_0_percent() {
        let (burn, treasury) = calculate_burn_and_transfer(1000, 0).unwrap();
        assert_eq!(burn, 0); // 0% of 1000
        assert_eq!(treasury, 1000); // 100% of 1000
    }

    #[test]
    fn test_calculate_burn_and_transfer_100_percent() {
        let (burn, treasury) = calculate_burn_and_transfer(1000, 100).unwrap();
        assert_eq!(burn, 1000); // 100% of 1000
        assert_eq!(treasury, 0); // 0% of 1000
    }

    #[test]
    fn test_calculate_burn_and_transfer_50_percent() {
        let (burn, treasury) = calculate_burn_and_transfer(2000, 50).unwrap();
        assert_eq!(burn, 1000); // 50% of 2000
        assert_eq!(treasury, 1000); // 50% of 2000
    }

    #[test]
    fn test_calculate_burn_and_transfer_25_percent() {
        let (burn, treasury) = calculate_burn_and_transfer(1000, 25).unwrap();
        assert_eq!(burn, 250); // 25% of 1000
        assert_eq!(treasury, 750); // 75% of 1000
    }

    #[test]
    fn test_calculate_burn_and_transfer_invalid_percentage() {
        let result = calculate_burn_and_transfer(1000, 101);
        assert!(result.is_err());
    }

    #[test]
    fn test_calculate_burn_and_transfer_with_rounding() {
        // Test that integer division rounds down correctly
        let (burn, treasury) = calculate_burn_and_transfer(1000, 33).unwrap();
        assert_eq!(burn, 330); // 33% of 1000 = 330
        assert_eq!(treasury, 670); // 67% of 1000 = 670
        assert_eq!(burn + treasury, 1000); // Should sum to original
    }

    #[test]
    fn test_validate_treasury_balance_sufficient() {
        let result = validate_treasury_balance(1000, 500);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_treasury_balance_exact() {
        let result = validate_treasury_balance(1000, 1000);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_treasury_balance_insufficient() {
        let result = validate_treasury_balance(500, 1000);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_treasury_balance_zero_claim() {
        let result = validate_treasury_balance(1000, 0);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_treasury_balance_zero_treasury() {
        let result = validate_treasury_balance(0, 100);
        assert!(result.is_err());
    }
}
