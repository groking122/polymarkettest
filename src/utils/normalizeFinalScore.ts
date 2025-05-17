export function normalizeFinalScore(weights: number[]): number {
  const totalAbs = weights.reduce((acc, w) => acc + Math.abs(w), 0);
  const net = weights.reduce((acc, w) => acc + w, 0);
  return totalAbs === 0 ? 0 : net / totalAbs;
} 