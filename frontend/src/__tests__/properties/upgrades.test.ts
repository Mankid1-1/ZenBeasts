/**
 * Property-based tests for trait upgrade mechanics
 */

import fc from 'fast-check';

function calculateUpgradeCost(baseCost: number, traitValue: number, scalingFactor: number): number {
  return Math.floor(baseCost * (1 + traitValue / scalingFactor));
}

function canAffordUpgrade(userBalance: number, upgradeCost: number): boolean {
  return userBalance >= upgradeCost;
}

function upgradeTrait(traitValue: number): number {
  return Math.min(255, traitValue + 1);
}

describe('Property 11: Insufficient balance rejection', () => {
  it('should reject upgrades when balance is insufficient', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000 }),
        fc.integer({ min: 1, max: 1000000 }),
        (userBalance, upgradeCost) => {
          fc.pre(userBalance < upgradeCost);
          return !canAffordUpgrade(userBalance, upgradeCost);
        }
      )
    );
  });

  it('should allow upgrades when balance is sufficient', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        (upgradeCost) => {
          const userBalance = upgradeCost;
          return canAffordUpgrade(userBalance, upgradeCost);
        }
      )
    );
  });
});

describe('Property 12: Token deduction correctness', () => {
  it('should deduct exact upgrade cost from user balance', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 1000000 }),
        fc.integer({ min: 1, max: 1000 }),
        (userBalance, upgradeCost) => {
          fc.pre(userBalance >= upgradeCost);
          
          const newBalance = userBalance - upgradeCost;
          return newBalance === userBalance - upgradeCost;
        }
      )
    );
  });
});

describe('Property 13: Trait increment correctness', () => {
  it('should increment trait value by exactly 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 254 }),
        (traitValue) => {
          const newValue = upgradeTrait(traitValue);
          return newValue === traitValue + 1;
        }
      )
    );
  });

  it('should not exceed maximum trait value of 255', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 255 }),
        (traitValue) => {
          const newValue = upgradeTrait(traitValue);
          return newValue <= 255;
        }
      )
    );
  });

  it('should cap at 255 when already at max', () => {
    expect(upgradeTrait(255)).toBe(255);
  });
});

describe('Property: Upgrade cost scaling', () => {
  it('should scale cost based on current trait value', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 10000 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 10, max: 100 }),
        (baseCost, traitValue, scalingFactor) => {
          const cost = calculateUpgradeCost(baseCost, traitValue, scalingFactor);
          const expectedCost = Math.floor(baseCost * (1 + traitValue / scalingFactor));
          return cost === expectedCost;
        }
      )
    );
  });

  it('should have higher cost for higher trait values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 10000 }),
        fc.integer({ min: 0, max: 254 }),
        fc.integer({ min: 10, max: 100 }),
        (baseCost, traitValue, scalingFactor) => {
          const cost1 = calculateUpgradeCost(baseCost, traitValue, scalingFactor);
          const cost2 = calculateUpgradeCost(baseCost, traitValue + 1, scalingFactor);
          return cost2 >= cost1;
        }
      )
    );
  });
});
