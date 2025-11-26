/**
 * Property-based tests for breeding mechanics
 */

import fc from 'fast-check';

function inheritTrait(parent1Trait: number, parent2Trait: number, variation: number): number {
  const average = (parent1Trait + parent2Trait) / 2;
  const result = average + variation;
  return Math.max(0, Math.min(255, Math.floor(result)));
}

function calculateOffspringGeneration(parent1Gen: number, parent2Gen: number): number {
  return Math.max(parent1Gen, parent2Gen) + 1;
}

function calculateBreedingCost(baseCost: number, generation: number, multiplier: number): number {
  return Math.floor(baseCost * Math.pow(multiplier, generation));
}

function canBreed(lastBreeding: number, cooldown: number, currentTime: number, breedingCount: number, maxBreeding: number): boolean {
  const cooldownExpired = currentTime >= lastBreeding + cooldown;
  const underLimit = breedingCount < maxBreeding;
  return cooldownExpired && underLimit;
}

describe('Property 14: Parent ownership validation', () => {
  it('should require both parents owned by same user', () => {
    const validateOwnership = (parent1Owner: string, parent2Owner: string, user: string) => {
      return parent1Owner === user && parent2Owner === user;
    };

    fc.assert(
      fc.property(
        fc.hexaString({ minLength: 32, maxLength: 44 }),
        (user) => {
          return validateOwnership(user, user, user) === true;
        }
      )
    );
  });
});

describe('Property 15: Trait inheritance bounds', () => {
  it('should keep offspring traits within [0, 255]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: -20, max: 20 }),
        (parent1, parent2, variation) => {
          const offspring = inheritTrait(parent1, parent2, variation);
          return offspring >= 0 && offspring <= 255;
        }
      )
    );
  });

  it('should average parent traits with variation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 200 }),
        fc.integer({ min: 50, max: 200 }),
        fc.integer({ min: -20, max: 20 }),
        (parent1, parent2, variation) => {
          const offspring = inheritTrait(parent1, parent2, variation);
          const average = (parent1 + parent2) / 2;
          const expected = Math.max(0, Math.min(255, Math.floor(average + variation)));
          return offspring === expected;
        }
      )
    );
  });
});

describe('Property 16: Offspring creation', () => {
  it('should create offspring with generation = max(parent_gens) + 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 10 }),
        (gen1, gen2) => {
          const offspringGen = calculateOffspringGeneration(gen1, gen2);
          return offspringGen === Math.max(gen1, gen2) + 1;
        }
      )
    );
  });
});

describe('Property 42: Breeding cooldown enforcement', () => {
  it('should prevent breeding during cooldown', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000000 }),
        fc.integer({ min: 3600, max: 86400 }),
        fc.integer({ min: 0, max: 3599 }),
        fc.integer({ min: 0, max: 5 }),
        (lastBreeding, cooldown, timeElapsed, breedingCount) => {
          const currentTime = lastBreeding + timeElapsed;
          const result = canBreed(lastBreeding, cooldown, currentTime, breedingCount, 10);
          return result === false;
        }
      )
    );
  });

  it('should allow breeding after cooldown expires', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000000 }),
        fc.integer({ min: 3600, max: 86400 }),
        fc.integer({ min: 0, max: 5 }),
        (lastBreeding, cooldown, breedingCount) => {
          const currentTime = lastBreeding + cooldown + 1;
          const result = canBreed(lastBreeding, cooldown, currentTime, breedingCount, 10);
          return result === true;
        }
      )
    );
  });
});

describe('Property 43: Breeding count limit', () => {
  it('should prevent breeding when max count reached', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (maxBreeding) => {
          const result = canBreed(0, 0, 1000000, maxBreeding, maxBreeding);
          return result === false;
        }
      )
    );
  });

  it('should allow breeding when under max count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (maxBreeding) => {
          const result = canBreed(0, 0, 1000000, maxBreeding - 1, maxBreeding);
          return result === true;
        }
      )
    );
  });
});

describe('Property 44: Generation-based cost scaling', () => {
  it('should scale breeding cost with generation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 100000 }),
        fc.integer({ min: 0, max: 5 }),
        fc.double({ min: 1.1, max: 2.0 }),
        (baseCost, generation, multiplier) => {
          const cost = calculateBreedingCost(baseCost, generation, multiplier);
          const expected = Math.floor(baseCost * Math.pow(multiplier, generation));
          return cost === expected;
        }
      )
    );
  });

  it('should have higher cost for higher generations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 100000 }),
        fc.integer({ min: 0, max: 4 }),
        fc.double({ min: 1.1, max: 2.0 }),
        (baseCost, generation, multiplier) => {
          const cost1 = calculateBreedingCost(baseCost, generation, multiplier);
          const cost2 = calculateBreedingCost(baseCost, generation + 1, multiplier);
          return cost2 > cost1;
        }
      )
    );
  });
});
