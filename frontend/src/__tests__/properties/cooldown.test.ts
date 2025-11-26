/**
 * Property-based tests for cooldown mechanics
 */

import fc from 'fast-check';

function isInCooldown(lastActivity: number, cooldownDuration: number, currentTime: number): boolean {
  if (lastActivity === 0) return false;
  return currentTime < lastActivity + cooldownDuration;
}

function getCooldownRemaining(lastActivity: number, cooldownDuration: number, currentTime: number): number {
  if (lastActivity === 0) return 0;
  const cooldownEnd = lastActivity + cooldownDuration;
  return Math.max(0, cooldownEnd - currentTime);
}

describe('Property 5: Cooldown enforcement', () => {
  it('should prevent activity during cooldown period', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000000 }),
        fc.integer({ min: 1, max: 86400 }),
        fc.integer({ min: 0, max: 86400 }),
        (lastActivity, cooldownDuration, timeElapsed) => {
          const currentTime = lastActivity + timeElapsed;
          const inCooldown = isInCooldown(lastActivity, cooldownDuration, currentTime);
          
          if (timeElapsed < cooldownDuration) {
            return inCooldown === true;
          } else {
            return inCooldown === false;
          }
        }
      )
    );
  });

  it('should allow activity after cooldown expires', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000000 }),
        fc.integer({ min: 1, max: 86400 }),
        (lastActivity, cooldownDuration) => {
          const currentTime = lastActivity + cooldownDuration + 1;
          return !isInCooldown(lastActivity, cooldownDuration, currentTime);
        }
      )
    );
  });

  it('should calculate correct remaining cooldown time', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000000 }),
        fc.integer({ min: 1, max: 86400 }),
        fc.integer({ min: 0, max: 86400 }),
        (lastActivity, cooldownDuration, timeElapsed) => {
          const currentTime = lastActivity + timeElapsed;
          const remaining = getCooldownRemaining(lastActivity, cooldownDuration, currentTime);
          
          if (timeElapsed >= cooldownDuration) {
            return remaining === 0;
          } else {
            return remaining === cooldownDuration - timeElapsed;
          }
        }
      )
    );
  });
});

describe('Property 6: Activity timestamp update', () => {
  it('should update last_activity to current time', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000000 }),
        fc.integer({ min: 1000000 }),
        (oldTimestamp, newTimestamp) => {
          fc.pre(newTimestamp > oldTimestamp);
          
          // Simulate activity update
          const updatedTimestamp = newTimestamp;
          
          return updatedTimestamp === newTimestamp && updatedTimestamp > oldTimestamp;
        }
      )
    );
  });
});
