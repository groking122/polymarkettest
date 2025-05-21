export interface Trader {
  name?: string;
  sentiment: 'yes' | 'no';
  smartScore: number;
  dollarPosition: number;
}

export interface TraderInfluence {
  name: string;
  smartScore: number;
  dollarPosition: number;
  sentiment: 'yes' | 'no';
  weight: number;
  influencePercent: number;
  signError?: boolean;
}

export interface KellyBetting {
  marketProbability: number;
  edge: number;
  kellyFraction: number;
  safeKellyFraction: number;
  recommendedBetSize: number;
  bankroll: number;
  betSide: 'yes' | 'no' | 'none';
  betConfidence: 'high' | 'medium' | 'low' | 'none';
  betReasoning: string;
  shouldBet: boolean;
}

export interface OptimalStrategy {
  shouldBet: boolean;
  maximumRisk: number; // % of bankroll
  stopLossThreshold: number; // % of bankroll
  edgeThreshold: number; // Minimum edge required
  reasoning: string;
}

export interface GravityResult {
  weights: number[];
  gravityScore: number;
  rawYesProb: number;
  calibratedYesProb: number;
  confidenceLevel: string;
  avgSmartScore: number;
  probabilityRange: {
    lower: number;
    upper: number;
  };
  traderInfluences: TraderInfluence[];
  signAccuracy?: number;
  weightedVariance?: number;
  kellyBetting?: KellyBetting;
  optimalStrategy?: OptimalStrategy;
}

// Constants for temperature calculation
const BASE_TEMP = 1.5;          // baseline > 1 keeps some spread
const SIZE_W = 1.3;             // weight of crowd-size term
const DISP_W = 2.6;             // weight for dispersion term
const T_MIN = 1.0;
const T_MAX = 12.0;
const CAP_SHARE = 0.12;
const Z_SCORE_95 = 1.96;        // Z-score for 95% confidence interval

// Add debug logging
const isProd = process.env.NODE_ENV === 'production';

function logStats(N: number, T: number, influence: number[]) {
  if (!isProd) {
    console.debug('SmartGravity stats', {
      N,
      T,
      maxShare: Math.max(...influence.map(Math.abs)),
      avgShare: influence.reduce((sum, x) => sum + Math.abs(x), 0) / N,
      minShare: Math.min(...influence.map(Math.abs))
    });
  }
}

// Helper function to calculate median
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Robust dispersion = 1.4826 * MAD (≈ σ for normal data)
 * MAD = Median Absolute Deviation
 */
function robustDispersion(values: number[]): number {
  const med = median(values);
  const absDevs = values.map(v => Math.abs(v - med));
  const mad = median(absDevs);
  return 1.4826 * mad / (med + 1e-9);
}

/**
 * Calculate quantile of an array
 * @param values Array of values
 * @param q Quantile (0-1), e.g., 0.95 for 95th percentile
 */
function quantile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  
  if (base + 1 < sorted.length) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
}

/**
 * Calculate entropy of a probability distribution
 * @param probs Array of probabilities that sum to 1
 */
function entropy(probs: number[]): number {
  return -probs.reduce((sum, p) => sum + (p > 0 ? p * Math.log(p) : 0), 0);
}

/**
 * Dynamic temperature calculation based on group size and distribution entropy
 */
function calcTemperature(weights: number[], N: number): number {
  // Calculate weights entropy
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const probs = weights.map(w => w / totalWeight);
  const entropyValue = entropy(probs);
  
  // Calculate dispersion with MAD
  const disp = robustDispersion(weights);
  
  // Use entropy and group size for temperature
  let T = BASE_TEMP + SIZE_W * Math.log(Math.max(2, N)) + DISP_W * entropyValue;
  
  // Clamp temperature between min and max
  return Math.max(T_MIN, Math.min(T_MAX, T));
}

/**
 * Temperature-scaled softmax function
 */
function softmax(absVals: number[], T: number): number[] {
  const expVals = absVals.map(v => Math.exp(v / T));
  const sum = expVals.reduce((s, x) => s + x, 0);
  return expVals.map(v => v / sum);
}

/**
 * Enforce maximum cap on influence
 */
function enforceCap(rawInfluence: number[], cap = CAP_SHARE): number[] {
  // Find the maximum absolute influence
  const maxInfluence = Math.max(...rawInfluence.map(Math.abs));
  
  // If no value exceeds the cap, return as-is
  if (maxInfluence <= cap) return rawInfluence;
  
  // Calculate scale factor for values below the cap
  const scale = (1 - cap) / (1 - maxInfluence);
  
  // Apply cap to max value and rescale others proportionally
  return rawInfluence.map(infl => {
    const absInfl = Math.abs(infl);
    if (absInfl >= cap) {
      return Math.sign(infl) * cap;
    } else {
      return infl * scale;
    }
  });
}

/**
 * Calculate Wilson score interval for the confidence margin
 */
function calculateErrorMargin(traders: Trader[], probability: number): number {
  const n = traders.length;
  if (n === 0) return 0.5; // max uncertainty
  
  // Wilson score interval calculation
  const z = Z_SCORE_95;
  const p = probability;
  
  const denominator = 1 + (z * z) / n;
  const margin = (z * Math.sqrt(p * (1 - p) / n + (z * z) / (4 * n * n))) / denominator;
  
  // Calculate weighted variance in smart scores for additional adjustment
  const weightedScoreSum = traders.reduce((sum, t) => 
    sum + Math.abs(t.smartScore) * Math.log(t.dollarPosition + 1), 0);
  const totalWeight = traders.reduce((sum, t) => 
    sum + Math.log(t.dollarPosition + 1), 0);
  
  const avgWeightedScore = weightedScoreSum / totalWeight;
  const weightedVariance = traders.reduce((sum, t) => 
    sum + Math.pow(Math.abs(t.smartScore) - avgWeightedScore, 2) * Math.log(t.dollarPosition + 1), 0) / totalWeight;
  
  // Adjust margin based on score variance (higher variance = wider margin)
  const varianceAdjustment = Math.sqrt(weightedVariance) / 100;
  const adjustedMargin = margin * (1 + varianceAdjustment);
  
  // Cap at ±20% error
  return Math.min(adjustedMargin, 0.2);
}

export function calculateSmartGravity(traders: Trader[], marketPrice: number = 50, bankroll: number = 100): GravityResult {
  if (traders.length === 0) {
    return {
      weights: [],
      gravityScore: 0,
      rawYesProb: 0.5,
      calibratedYesProb: 0.5,
      confidenceLevel: "Unknown",
      avgSmartScore: 0,
      probabilityRange: {
        lower: 0.025,
        upper: 0.975
      },
      traderInfluences: []
    };
  }

  // Sanitize input data
  const sanitizedTraders = traders.map(trader => ({
    ...trader,
    // Ensure dollar position is a valid number
    dollarPosition: typeof trader.dollarPosition === 'string' 
      ? parseFloat(String(trader.dollarPosition).replace(/[^\d.-]/g, ''))
      : trader.dollarPosition
  }));

  // Quantile-based score scaling
  const absScores = sanitizedTraders.map(t => Math.abs(t.smartScore));
  const scoreFactor = Math.max(40, quantile(absScores, 0.95));
  
  // Compute raw weights with improved score scaling
  const rawWeights = sanitizedTraders.map(trader => {
    // Dynamic quantile-based score scaling
    const scoreScale = 0.5 + 0.5 * Math.tanh(trader.smartScore / scoreFactor);
    
    // Sentiment direction
    const sentimentFactor = trader.sentiment === 'yes' ? 1 : -1;
    
    // Calculate raw weight with natural log
    return sentimentFactor * scoreScale * Math.log(trader.dollarPosition + 1);
  });

  // 3) Separate signs and magnitudes
  const signs = rawWeights.map(Math.sign);
  const absRaw = rawWeights.map(Math.abs);

  // 4) Calculate dynamic temperature based on entropy and group size
  const N = sanitizedTraders.length;
  const T = calcTemperature(absRaw, N);

  // 5) Apply softmax to magnitudes with temperature
  const pAbs = softmax(absRaw, T);

  // Re-apply sentiment signs with verification
  const rawInfluence = pAbs.map((p, i) => {
    const sentimentSign = sanitizedTraders[i].sentiment === 'yes' ? 1 : -1;
    const weightSign = Math.sign(rawWeights[i]);
    
    // Verify sign consistency
    if (weightSign !== 0 && weightSign !== sentimentSign) {
      // Sign discrepancy detected!
      console.warn(`Sign inconsistency for trader ${sanitizedTraders[i].name}: sentiment=${sanitizedTraders[i].sentiment}, weightSign=${weightSign}`);
    }
    
    // Always use sentiment sign directly
    return sentimentSign * p;
  });

  // 7) Apply post-softmax capping
  const influence = enforceCap(rawInfluence);

  // Log stats in non-prod environments
  logStats(sanitizedTraders.length, T, influence);

  // Calculate gravity score (weighted sum)
  const gravityScore = influence.reduce((sum: number, weight: number) => sum + weight, 0);

  // Calculate raw probability
  const rawYesProb = (gravityScore + 1) / 2;

  // Calculate weighted average smart score and variance
  const weightedScoreSum = sanitizedTraders.reduce((sum: number, trader: Trader) => 
    sum + Math.abs(trader.smartScore) * Math.log(trader.dollarPosition + 1), 0);
  const totalWeight = sanitizedTraders.reduce((sum: number, trader: Trader) => 
    sum + Math.log(trader.dollarPosition + 1), 0);
  
  const avgSmartScore = weightedScoreSum / totalWeight;
  
  // Calculate weighted variance
  const weightedVariance = sanitizedTraders.reduce((sum: number, trader: Trader) => 
    sum + Math.pow(trader.smartScore - avgSmartScore, 2) * Math.log(trader.dollarPosition + 1), 0) / totalWeight;

  // Calculate confidence level based on weighted average smart score
  const confidenceLevel = getConfidenceLevel(avgSmartScore);
  
  // Calculate confidence factor for calibration with variance penalty
  const confidenceFactor = calculateConfidenceFactor(avgSmartScore, weightedVariance);
  
  // Calculate calibrated probability
  const calibratedYesProb = 0.5 + (rawYesProb - 0.5) * confidenceFactor;

  // Calculate error margin using Wilson score interval
  const margin = calculateErrorMargin(sanitizedTraders, calibratedYesProb);
  
  // Calculate probability range
  const probabilityRange = {
    lower: Math.max(0.025, calibratedYesProb - margin),
    upper: Math.min(0.975, calibratedYesProb + margin)
  };

  // Calculate trader influences
  const totalAbsoluteWeight = influence.reduce((sum: number, w: number) => sum + Math.abs(w), 0);
  const traderInfluences: TraderInfluence[] = sanitizedTraders.map((trader, index) => {
    const expectedSign = trader.sentiment === 'yes' ? 1 : -1;
    const actualSign = Math.sign(influence[index]);
    const signError = actualSign !== 0 && actualSign !== expectedSign;
    
    return {
      name: trader.name || `Trader ${index + 1}`,
      smartScore: trader.smartScore,
      dollarPosition: trader.dollarPosition,
      sentiment: trader.sentiment,
      weight: influence[index],
      influencePercent: (Math.abs(influence[index]) / totalAbsoluteWeight) * 100,
      signError: signError
    };
  });

  // Sort trader influences by absolute influence percentage
  traderInfluences.sort((a, b) => Math.abs(b.influencePercent) - Math.abs(a.influencePercent));

  // Calculate sign accuracy for logging
  const signAccuracy = traderInfluences.filter(t => !t.signError).length / traderInfluences.length;
  if (signAccuracy < 1) {
    console.warn(`Sign accuracy: ${(signAccuracy * 100).toFixed(1)}% (${traderInfluences.filter(t => !t.signError).length}/${traderInfluences.length})`);
  }

  // Get numeric confidence score (0-100)
  const numericConfidence = getNumericConfidence(confidenceLevel);
  
  // Calculate Kelly betting metrics if market price is provided
  const kellyBetting = calculateKellyBetting(
    calibratedYesProb,
    marketPrice,
    bankroll,
    numericConfidence
  );
  
  // Calculate optimal strategy
  const optimalStrategy = deriveOptimalStrategy(
    kellyBetting,
    confidenceLevel,
    probabilityRange,
    marketPrice
  );

  return {
    weights: influence,
    gravityScore,
    rawYesProb,
    calibratedYesProb,
    confidenceLevel,
    avgSmartScore,
    probabilityRange,
    traderInfluences,
    signAccuracy: signAccuracy,
    weightedVariance: weightedVariance,
    kellyBetting,
    optimalStrategy
  };
}

/**
 * Calculate confidence factor based on weighted avg score and variance
 */
function calculateConfidenceFactor(avgSmartScore: number, variance: number): number {
  // Convert average smart score to a confidence factor between 0.3 and 0.95
  // with penalty for high variance
  const baseConfidence = 0.5 + 0.45 * Math.tanh(avgSmartScore / 80);
  
  // Apply variance penalty (higher variance = lower confidence)
  const variancePenalty = Math.min(0.5, Math.sqrt(variance) / 150);
  
  return Math.max(0.3, baseConfidence - variancePenalty);
}

export function getConfidenceLevel(avgSmartScore: number): string {
  if (avgSmartScore >= 70) return "High ✅";
  if (avgSmartScore >= 40) return "Medium ⚠️";
  return "Low ❗";
}

// Helper function to calculate Kelly betting metrics
export function calculateKellyBetting(
  calibratedProb: number, 
  marketPrice: number, 
  bankroll: number = 100,
  confidenceScore: number
): KellyBetting {
  // Convert market price to probability
  const marketProb = marketPrice / 100;
  
  // Determine bet side (yes or no)
  let edge: number;
  let betSide: 'yes' | 'no' | 'none';
  
  if (calibratedProb > marketProb) {
    // YES bet - positive edge
    edge = (calibratedProb - marketProb) / marketProb;
    betSide = 'yes';
  } else if (calibratedProb < marketProb) {
    // NO bet - negative edge
    edge = (calibratedProb - marketProb) / marketProb;
    betSide = 'no';
  } else {
    // No edge
    edge = 0;
    betSide = 'none';
  }

  // Kelly fraction calculation
  let kellyFraction = 0;
  if (betSide !== 'none') {
    // For yes bets: edge / (odds - 1)
    // For no bets: |edge| / (odds - 1)
    const odds = 1 / marketProb;
    kellyFraction = Math.abs(edge) / (odds - 1);
  }
  
  // Quarter Kelly for safety
  const safeKellyFraction = kellyFraction * 0.25;
  
  // Determine bet confidence based on confidence score
  let betConfidence: 'high' | 'medium' | 'low' | 'none';
  if (confidenceScore >= 80) {
    betConfidence = 'high';
  } else if (confidenceScore >= 50) {
    betConfidence = 'medium';
  } else if (confidenceScore > 0) {
    betConfidence = 'low';
  } else {
    betConfidence = 'none';
  }
  
  // Apply confidence-based position sizing limits
  let maxBetPercentage: number;
  switch (betConfidence) {
    case 'high':
      maxBetPercentage = 0.10; // Max 10% of bankroll
      break;
    case 'medium':
      maxBetPercentage = 0.05; // Max 5% of bankroll
      break;
    case 'low':
      maxBetPercentage = 0.02; // Max 2% of bankroll
      break;
    default:
      maxBetPercentage = 0;
  }
  
  // Determine if the bet should be placed
  const edgeThreshold = 0.10; // 10% minimum edge
  const shouldBet = Math.abs(edge) >= edgeThreshold && 
                   betConfidence !== 'none' && 
                   safeKellyFraction > 0;
  
  // Calculate recommended bet size (respecting max position size)
  let recommendedBetSize = shouldBet ? 
    Math.min(safeKellyFraction, maxBetPercentage) * bankroll : 0;
  
  // Round to 2 decimal places
  recommendedBetSize = Math.round(recommendedBetSize * 100) / 100;
  
  // Generate reasoning
  let betReasoning = '';
  if (!shouldBet) {
    if (Math.abs(edge) < edgeThreshold) {
      betReasoning = `Edge (${(edge * 100).toFixed(1)}%) below minimum threshold (${edgeThreshold * 100}%)`;
    } else if (betConfidence === 'none') {
      betReasoning = 'Confidence too low to recommend a bet';
    } else {
      betReasoning = 'No favorable betting opportunity';
    }
  } else {
    betReasoning = `${betSide.toUpperCase()} bet with ${(edge * 100).toFixed(1)}% edge and ${betConfidence} confidence`;
  }
  
  return {
    marketProbability: marketProb,
    edge,
    kellyFraction,
    safeKellyFraction,
    recommendedBetSize,
    bankroll,
    betSide,
    betConfidence,
    betReasoning,
    shouldBet
  };
}

// Helper to calculate an optimal strategy
export function deriveOptimalStrategy(
  kellyResult: KellyBetting,
  confidenceLevel: string,
  probabilityRange: { lower: number, upper: number },
  marketPrice: number
): OptimalStrategy {
  const marketProb = marketPrice / 100;
  
  // Check if uncertainty band overlaps with market probability
  const uncertaintyOverlap = 
    probabilityRange.lower <= marketProb && 
    probabilityRange.upper >= marketProb;
  
  // Calculate maximum risk based on confidence level
  let maximumRisk: number;
  let edgeThreshold: number;
  
  if (confidenceLevel.includes("High")) {
    maximumRisk = 0.10; // 10% of bankroll
    edgeThreshold = 0.10; // 10% minimum edge
  } else if (confidenceLevel.includes("Medium")) {
    maximumRisk = 0.05; // 5% of bankroll
    edgeThreshold = 0.15; // 15% minimum edge
  } else {
    maximumRisk = 0.02; // 2% of bankroll
    edgeThreshold = 0.20; // 20% minimum edge
  }
  
  // Determine if we should bet based on strategy rules
  const edgeStrong = Math.abs(kellyResult.edge) >= edgeThreshold;
  const shouldBet = edgeStrong && 
                    kellyResult.betConfidence !== 'none' && 
                    !uncertaintyOverlap;
  
  // Generate reasoning
  let reasoning: string;
  if (!shouldBet) {
    if (!edgeStrong) {
      reasoning = `Edge (${(kellyResult.edge * 100).toFixed(1)}%) below threshold for ${confidenceLevel} confidence`;
    } else if (uncertaintyOverlap) {
      reasoning = 'Uncertainty band overlaps with market price';
    } else {
      reasoning = 'Insufficient confidence for betting';
    }
  } else {
    reasoning = `Strong ${(kellyResult.edge * 100).toFixed(1)}% edge with ${confidenceLevel} confidence`;
  }
  
  return {
    shouldBet,
    maximumRisk,
    stopLossThreshold: 0.10, // 10% of bankroll daily loss limit
    edgeThreshold,
    reasoning
  };
}

// Helper to convert confidence level to numeric value
export function getNumericConfidence(confidenceLevel: string): number {
  if (confidenceLevel.includes("High")) return 85;
  if (confidenceLevel.includes("Medium")) return 55;
  return 25;
} 