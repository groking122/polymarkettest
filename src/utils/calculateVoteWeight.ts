export function calculateVoteWeight({
  shares,
  sentiment,
  pnl,
  volume,
}: {
  shares: number;
  sentiment: 'yes' | 'no';
  pnl: number;
  volume: number;
}): number {
  const sentimentFactor = sentiment === 'yes' ? 1 : -1;
  const pnlFactor = Math.tanh(pnl / 100000);

  const volumeRatio = volume > 0 ? volume / 100000 : 0.0001;
  const volumeScore = 1 - Math.abs(Math.log10(volumeRatio));
  const volumeMultiplier = Math.max(0.25, Math.min(volumeScore, 1));

  const adjustedShares = Math.log2(shares + 1); // +1 avoids log(0)

  return adjustedShares * sentimentFactor * pnlFactor * volumeMultiplier;
} 