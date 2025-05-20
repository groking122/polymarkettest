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
}); 