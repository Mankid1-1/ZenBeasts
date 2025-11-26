use anchor_lang::prelude::*;
use anchor_lang::solana_program::keccak;
use crate::errors::ZenBeastsError;

pub const TRAIT_LAYERS: usize = 10;
pub const CORE_TRAITS: usize = 4; // First 4 traits: strength, agility, wisdom, vitality

/// Generate random traits for a new beast
/// Returns: (traits array, rarity score)
/// Rarity score is the sum of the first 4 core traits
pub fn generate_traits(seed: u64, owner: &Pubkey, clock_bytes: &[u8]) -> ([u8; TRAIT_LAYERS], u64) {
    let mut input = Vec::with_capacity(32 + 8 + 8);
    input.extend_from_slice(&owner.to_bytes());
    input.extend_from_slice(&seed.to_le_bytes());
    input.extend_from_slice(clock_bytes);
    let hash = keccak::hash(&input);
    let bytes = hash.0;

    let mut traits = [0u8; TRAIT_LAYERS];
    
    // Generate first 4 core traits (strength, agility, wisdom, vitality)
    for i in 0..CORE_TRAITS {
        traits[i] = bytes[i];
    }
    
    // Remaining 6 traits are reserved for future use, set to 0
    for i in CORE_TRAITS..TRAIT_LAYERS {
        traits[i] = 0;
    }

    // Calculate rarity as sum of core traits
    let rarity_score = calculate_rarity(&traits);

    (traits, rarity_score)
}

/// Combine two parent trait arrays into offspring with inheritance and variation
/// Offspring traits = average of parents ± random variation (-20 to +20), clamped to [0, 255]
pub fn breed_traits(seed: u64, parent_a: &[u8; TRAIT_LAYERS], parent_b: &[u8; TRAIT_LAYERS]) -> ([u8; TRAIT_LAYERS], u64) {
    let mut input = Vec::with_capacity(8 + TRAIT_LAYERS * 2);
    input.extend_from_slice(&seed.to_le_bytes());
    input.extend_from_slice(parent_a);
    input.extend_from_slice(parent_b);
    let hash = keccak::hash(&input);
    let bytes = hash.0;

    let mut child = [0u8; TRAIT_LAYERS];
    
    // Only breed the first 4 core traits
    for i in 0..CORE_TRAITS {
        let avg = ((parent_a[i] as u16 + parent_b[i] as u16) / 2) as i16;
        
        // Generate variation between -20 and +20
        let variation_byte = bytes[i];
        let variation = (variation_byte % 41) as i16 - 20; // 0-40 shifted to -20 to +20
        
        // Apply variation and clamp to [0, 255]
        let result = (avg + variation).max(0).min(255);
        child[i] = result as u8;
    }
    
    // Remaining traits stay at 0 (reserved for future)
    for i in CORE_TRAITS..TRAIT_LAYERS {
        child[i] = 0;
    }

    let rarity = calculate_rarity(&child);
    (child, rarity)
}

/// Calculate rarity score as the sum of the first 4 core traits
pub fn calculate_rarity(traits: &[u8; TRAIT_LAYERS]) -> u64 {
    let mut score: u64 = 0;
    for i in 0..CORE_TRAITS {
        score = score.saturating_add(traits[i] as u64);
    }
    score
}

/// Get rarity tier based on rarity score and configured thresholds
pub fn get_rarity_tier(rarity_score: u64, thresholds: &[u64; 5]) -> &'static str {
    if rarity_score >= thresholds[4] {
        "Legendary"
    } else if rarity_score >= thresholds[3] {
        "Epic"
    } else if rarity_score >= thresholds[2] {
        "Rare"
    } else if rarity_score >= thresholds[1] {
        "Uncommon"
    } else {
        "Common"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_generate_traits_in_range() {
        let owner = Pubkey::new_unique();
        let clock_bytes = [1u8; 8];
        let (traits, score) = generate_traits(12345, &owner, &clock_bytes);
        
        // First 4 traits should be set
        // Remaining 6 should be 0
        for i in CORE_TRAITS..TRAIT_LAYERS {
            assert_eq!(traits[i], 0);
        }
        
        // Rarity should equal sum of first 4 traits
        let expected_rarity: u64 = traits[0] as u64 + traits[1] as u64 + traits[2] as u64 + traits[3] as u64;
        assert_eq!(score, expected_rarity);
    }
    
    #[test]
    fn test_calculate_rarity_matches_sum() {
        let traits = [100, 150, 200, 50, 0, 0, 0, 0, 0, 0];
        let score = calculate_rarity(&traits);
        let expected: u64 = 100 + 150 + 200 + 50;
        assert_eq!(score, expected);
    }
    
    #[test]
    fn test_breed_traits_within_bounds() {
        let parent_a = [100, 150, 200, 50, 0, 0, 0, 0, 0, 0];
        let parent_b = [120, 130, 180, 70, 0, 0, 0, 0, 0, 0];
        let (child, rarity) = breed_traits(12345, &parent_a, &parent_b);
        
        // Check all traits are within valid range
        for i in 0..CORE_TRAITS {
            assert!(child[i] <= 255);
            
            // Check offspring is roughly near parent average ± 20
            let avg = ((parent_a[i] as u16 + parent_b[i] as u16) / 2) as i16;
            let diff = (child[i] as i16 - avg).abs();
            assert!(diff <= 20, "Trait {} difference {} exceeds 20", i, diff);
        }
        
        // Remaining traits should be 0
        for i in CORE_TRAITS..TRAIT_LAYERS {
            assert_eq!(child[i], 0);
        }
        
        // Rarity should equal sum of first 4 traits
        let expected_rarity: u64 = child[0] as u64 + child[1] as u64 + child[2] as u64 + child[3] as u64;
        assert_eq!(rarity, expected_rarity);
    }
    
    #[test]
    fn test_get_rarity_tier() {
        let thresholds = [400, 600, 800, 950, 1020];
        
        assert_eq!(get_rarity_tier(300, &thresholds), "Common");
        assert_eq!(get_rarity_tier(500, &thresholds), "Uncommon");
        assert_eq!(get_rarity_tier(700, &thresholds), "Rare");
        assert_eq!(get_rarity_tier(900, &thresholds), "Epic");
        assert_eq!(get_rarity_tier(1000, &thresholds), "Legendary");
    }
}
/// Gener
ate a unique metadata URI for a beast
/// Format: "https://arweave.net/{mint_address}"
pub fn generate_metadata_uri(mint: &Pubkey, total_minted: u64) -> String {
    format!("https://arweave.net/zenbeasts/{}/{}", total_minted, mint.to_string())
}
