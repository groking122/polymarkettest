import { describe, test, expect } from 'vitest';
import { calculateSmartGravity, type Trader } from './calculateSmartGravity';
import * as fc from 'fast-check';

// Helper functions
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
const maxAbs = (arr: number[]) => Math.max(...arr.map(Math.abs));
const expectClose = (a: number, b: number, tol = 1e-9) => 
  expect(Math.abs(a - b)).toBeLessThan(tol);

// Test fixtures
const fixtures = {
  uniformMids: Array.from({ length: 100 }, (_, i) => ({
    name: `Trader ${i}`,
    sentiment: i % 2 === 0 ? 'yes' : 'no',
    smartScore: 50 + (Math.random() * 20 - 10),
    dollarPosition: 10000 + (Math.random() * 2000 - 1000)
  })),

  singleWhale: [
    { name: 'Whale', sentiment: 'yes', smartScore: 90, dollarPosition: 1e6 },
    ...Array.from({ length: 99 }, (_, i) => ({
      name: `Trader ${i}`,
      sentiment: i % 2 === 0 ? 'yes' : 'no',
      smartScore: 50,
      dollarPosition: 10000
    }))
  ],

  opposingWhales: [
    { name: 'Bull Whale', sentiment: 'yes', smartScore: 90, dollarPosition: 1e6 },
    { name: 'Bear Whale', sentiment: 'no', smartScore: 90, dollarPosition: 1e6 },
    ...Array.from({ length: 98 }, (_, i) => ({
      name: `Trader ${i}`,
      sentiment: i % 2 === 0 ? 'yes' : 'no',
      smartScore: 50,
      dollarPosition: 10000
    }))
  ],

  logNormalSpread: Array.from({ length: 100 }, (_, i) => ({
    name: `Trader ${i}`,
    sentiment: i % 2 === 0 ? 'yes' : 'no',
    smartScore: 50 + (Math.random() * 20 - 10),
    dollarPosition: Math.exp(Math.random() * 8) * 100 // 100 to ~1e6
  })),

  tinyGroup: Array.from({ length: 5 }, (_, i) => ({
    name: `Trader ${i}`,
    sentiment: i % 2 === 0 ? 'yes' : 'no',
    smartScore: 50 + (Math.random() * 20 - 10),
    dollarPosition: 10000
  })),

  hugeGroup: Array.from({ length: 200 }, (_, i) => ({
    name: `Trader ${i}`,
    sentiment: i % 2 === 0 ? 'yes' : 'no',
    smartScore: 50 + (Math.random() * 20 - 10),
    dollarPosition: 10000 + (Math.random() * 2000 - 1000)
  })),
  
  // New specific test cases for improvements
  extremeScores: [
    { name: 'High Score', sentiment: 'yes', smartScore: 200, dollarPosition: 1000 },
    { name: 'Low Score', sentiment: 'no', smartScore: -200, dollarPosition: 1000 },
    ...Array.from({ length: 10 }, (_, i) => ({
      name: `Normal ${i}`,
      sentiment: i % 2 === 0 ? 'yes' : 'no',
      smartScore: 50,
      dollarPosition: 1000
    }))
  ],

  megalodons: [
    { name: 'Whale 1', sentiment: 'yes', smartScore: 90, dollarPosition: 1e9 },
    { name: 'Whale 2', sentiment: 'yes', smartScore: 90, dollarPosition: 1e9 },
    ...Array.from({ length: 100 }, (_, i) => ({
      name: `Minnow ${i}`,
      sentiment: 'no',
      smartScore: 70,
      dollarPosition: 1000
    }))
  ],

  highVariance: Array.from({ length: 50 }, (_, i) => ({
    name: `Trader ${i}`,
    sentiment: i % 2 === 0 ? 'yes' : 'no',
    smartScore: Math.random() > 0.5 ? 100 : -100, // Maximum disagreement
    dollarPosition: 10000
  }))
};

// Unit tests
describe('calculateSmartGravity', () => {
  // Test each fixture
  Object.entries(fixtures).forEach(([name, traders]) => {
    test(`fixture: ${name}`, () => {
      const result = calculateSmartGravity(traders);
      const influences = result.traderInfluences.map(t => t.influencePercent / 100);

      // Sum ≈ 1
      expectClose(sum(influences), 1);

      // Cap holds
      expect(maxAbs(influences)).toBeLessThanOrEqual(0.12);

      // No NaNs/infinities
      expect(influences.every(Number.isFinite)).toBe(true);

      // Order preserved (check top 3)
      const rawWeights = traders.map(t => 
        (t.sentiment === 'yes' ? 1 : -1) * 
        Math.tanh(t.smartScore / 50) * 
        Math.log2(t.dollarPosition + 1)
      );
      const rawRanks = rawWeights
        .map((w, i) => ({ w, i }))
        .sort((a, b) => Math.abs(b.w) - Math.abs(a.w))
        .slice(0, 3)
        .map(x => x.i);
      
      const inflRanks = influences
        .map((w, i) => ({ w, i }))
        .sort((a, b) => Math.abs(b.w) - Math.abs(a.w))
        .slice(0, 3)
        .map(x => x.i);

      expect(inflRanks).toEqual(rawRanks);

      // Sign preserved
      rawWeights.forEach((raw, i) => {
        expect(Math.sign(raw)).toBe(Math.sign(influences[i]));
      });
    });
  });
});

// Tests for specific improvements
describe('Smart Gravity Improvements', () => {
  test('quantile-based scaling handles extreme score values', () => {
    const result = calculateSmartGravity(fixtures.extremeScores);
    
    // Check that extreme score traders don't dominate completely
    const highScoreTrader = result.traderInfluences.find(t => t.name === 'High Score');
    const lowScoreTrader = result.traderInfluences.find(t => t.name === 'Low Score');
    
    expect(highScoreTrader).toBeDefined();
    expect(lowScoreTrader).toBeDefined();
    
    // Scores should be saturated but not dominate entirely
    expect(highScoreTrader!.influencePercent).toBeLessThan(25);
    expect(lowScoreTrader!.influencePercent).toBeLessThan(25);
  });
  
  test('natural log scaling properly controls whale influence', () => {
    const result = calculateSmartGravity(fixtures.megalodons);
    
    // Find whale 1 and whale 2
    const whale1 = result.traderInfluences.find(t => t.name === 'Whale 1');
    const whale2 = result.traderInfluences.find(t => t.name === 'Whale 2');
    
    expect(whale1).toBeDefined();
    expect(whale2).toBeDefined();
    
    // Despite having 1 billion dollar position, should be capped at ~12%
    expect(whale1!.influencePercent).toBeLessThanOrEqual(12.5);
    expect(whale2!.influencePercent).toBeLessThanOrEqual(12.5);
    
    // Both whales together should be less than 25%
    expect(whale1!.influencePercent + whale2!.influencePercent).toBeLessThan(25);
  });
  
  test('high variance lowers confidence and widens probability range', () => {
    const result = calculateSmartGravity(fixtures.highVariance);
    
    // High variance should result in:
    // 1. Wider probability range (higher uncertainty)
    const rangeWidth = result.probabilityRange.upper - result.probabilityRange.lower;
    expect(rangeWidth).toBeGreaterThan(0.2); // Significant uncertainty
    
    // 2. Probability should be closer to 0.5 than raw probability
    const rawDelta = Math.abs(result.rawYesProb - 0.5);
    const calibratedDelta = Math.abs(result.calibratedYesProb - 0.5);
    expect(calibratedDelta).toBeLessThan(rawDelta);
  });
  
  test('tiny groups have larger uncertainty bands', () => {
    const tinyResult = calculateSmartGravity(fixtures.tinyGroup);
    const largeResult = calculateSmartGravity(fixtures.uniformMids);
    
    const tinyRange = tinyResult.probabilityRange.upper - tinyResult.probabilityRange.lower;
    const largeRange = largeResult.probabilityRange.upper - largeResult.probabilityRange.lower;
    
    // Smaller groups should have wider ranges
    expect(tinyRange).toBeGreaterThan(largeRange);
  });
});

// Property tests
describe('calculateSmartGravity property tests', () => {
  // Generator for random traders
  const genTrader = fc.record({
    name: fc.string(),
    sentiment: fc.constantFrom('yes', 'no'),
    smartScore: fc.integer({ min: -100, max: 100 }),
    dollarPosition: fc.float({ min: 0, max: 1e7 })
  });

  const genTraders = fc.array(genTrader, { minLength: 5, maxLength: 300 });

  test('properties hold for random inputs', () => {
    fc.assert(
      fc.property(genTraders, traders => {
        const result = calculateSmartGravity(traders);
        const influences = result.traderInfluences.map(t => t.influencePercent / 100);

        return (
          Math.abs(sum(influences) - 1) < 1e-9 &&
          maxAbs(influences) <= 0.12 + 1e-6 &&
          influences.every(Number.isFinite)
        );
      }),
      { numRuns: 1000 }
    );
  });
  
  test('probability ranges are valid and contain calibrated probability', () => {
    fc.assert(
      fc.property(genTraders, traders => {
        const result = calculateSmartGravity(traders);
        
        return (
          result.probabilityRange.lower <= result.calibratedYesProb &&
          result.calibratedYesProb <= result.probabilityRange.upper &&
          result.probabilityRange.lower >= 0 &&
          result.probabilityRange.upper <= 1
        );
      }),
      { numRuns: 1000 }
    );
  });
}); 