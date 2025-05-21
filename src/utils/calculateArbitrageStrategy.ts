interface ArbitrageStrategyResult {
  direction: 'YES' | 'NO' | 'NONE';
  edge: number;
  confidence: number;
  stake: number;
  strategy: 'conservative' | 'standard' | 'aggressive';
  takeProfitTarget: number;
  stopLossLimit: number;
}

export function calculateArbitrageStrategy({
  smartYesProb,
  marketYesPrice,
  confidence,
  bankroll,
  strategy = 'conservative',
}: {
  smartYesProb: number;
  marketYesPrice: number; // 0–1
  confidence: number; // 0–1
  bankroll: number;
  strategy?: 'conservative' | 'standard' | 'aggressive';
}): ArbitrageStrategyResult {
  const marketProb = marketYesPrice;
  const smartProb = smartYesProb;
  const edge = smartProb - marketProb;

  let direction: ArbitrageStrategyResult['direction'] = 'NONE';
  if (Math.abs(edge) < 0.02 || confidence < 0.2) {
    return {
      direction: 'NONE',
      edge,
      confidence,
      stake: 0,
      strategy,
      takeProfitTarget: 0,
      stopLossLimit: 0,
    };
  }

  direction = edge > 0 ? 'YES' : 'NO';
  const absoluteEdge = Math.abs(edge);

  const kellyFraction = strategy === 'aggressive' ? 1.0 : strategy === 'standard' ? 0.5 : 0.25;
  const stake = bankroll * absoluteEdge * kellyFraction * confidence;

  const entryPrice = direction === 'YES' ? marketYesPrice : 1 - marketYesPrice;

  const takeProfitTarget = entryPrice * 1.15;
  const stopLossLimit = entryPrice * 0.9;

  return {
    direction,
    edge: absoluteEdge,
    confidence,
    stake,
    strategy,
    takeProfitTarget: Math.min(takeProfitTarget, 1),
    stopLossLimit: Math.max(stopLossLimit, 0),
  };
} 