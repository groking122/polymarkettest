export interface Trader {
  name?: string;
  sentiment: 'yes' | 'no';
  smartScore: number;
  dollarPosition: number;
  entryPrice?: number;         // Market entry price (0-1)
  realizedPnl?: number;        // Realized profit/loss
  unrealizedPnl?: number;      // Unrealized profit/loss
  supplyOwnership?: number;    // % of market owned (0-1)
  showAdvanced?: boolean;      // UI state for showing advanced fields
}

// Enhanced trader model with influence score
export interface EnhancedTrader extends Trader {
  influenceScore: number;      // Calculated influence score
  weightedInfluence: number;   // Final weighted influence value
}

export interface TraderInfluence {
  name: string;
  smartScore: number;
  dollarPosition: number;
  sentiment: 'yes' | 'no';
  weight: number;
  influencePercent: number;
  signError?: boolean;
  entryPrice?: number;
  realizedPnl?: number;
  unrealizedPnl?: number;
  supplyOwnership?: number;
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

export interface SmartEdgeResult {
  edgeWeights: number[];
  smartSkew: number;
  gravitySmart: number;
  rawYesProb: number;
  calibratedYesProb: number;
  confidenceLevel: string;
  avgSmartScore: number;
  confidenceFactor: number;
  probabilityRange: {
    lower: number;
    upper: number;
  };
  traderInfluences: TraderInfluence[];
  smartYesCapital: number;
  smartNoCapital: number;
  kellyBetting?: KellyBetting;
  optimalStrategy?: OptimalStrategy;
}

export interface ArbitrageEdgeResult {
  marketYesProb: number;
  marketNoProb: number;
  smartYesProb: number;
  smartNoProb: number;
  yesEdge: number;
  noEdge: number;
  betDirection: 'yes' | 'no' | 'none';
  edge: number;
  stake: number;
  bankrollPercentage: number;
  hasEdge: boolean;
}

// Constants
const SCORE_EMPHASIS_FACTOR = 25;  // k value for exponential score emphasis (adjusted from 30)
const SMART_SCORE_THRESHOLD = 70;  // Threshold for considering traders as "smart"
const EPSILON = 1e-9;             // Small value to avoid division by zero
const Z_SCORE_95 = 1.96;          // Z-score for 95% confidence interval

// Helper function for logs
const isProd = process.env.NODE_ENV === 'production';
function logDebug(message: string, data: any) {
  if (!isProd) {
    console.debug(message, data);
  }
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
 * Wilson score interval for confidence margin
 */
function calculateErrorMargin(traders: Trader[], probability: number): number {
  const n = traders.length;
  if (n === 0) return 0.5; // max uncertainty
  
  // Wilson score interval calculation
  const z = Z_SCORE_95;
  const p = probability;
  
  const denominator = 1 + (z * z) / n;
  const margin = (z * Math.sqrt(p * (1 - p) / n + (z * z) / (4 * n * n))) / denominator;
  
  // Cap at ±20% error
  return Math.min(margin, 0.2);
}

/**
 * Compute weighted influence for a trader based on advanced metrics
 * @param trader The trader object
 * @param marketPrice Current market price (0-1)
 * @returns Weighted influence score (positive for YES, negative for NO)
 */
function computeWeightedInfluence(trader: Trader, marketPrice: number): number {
  // Exponential score weight - emphasizes high smart scores
  const scoreWeight = Math.exp(trader.smartScore / SCORE_EMPHASIS_FACTOR);
  
  // PnL multiplier - rewards profitable traders
  const pnlMultiplier = 1 + 
    0.5 * Math.tanh((trader.realizedPnl || 0) / 1000) +
    0.5 * Math.tanh((trader.unrealizedPnl || 0) / 1000);
  
  // Entry price advantage - rewards traders who got better entry
  let entryMultiplier = 1;
  if (trader.entryPrice !== undefined) {
    const entryPrice = trader.entryPrice;
    const entryAdvantage = trader.sentiment === 'yes' 
      ? (marketPrice - entryPrice) / Math.max(marketPrice, EPSILON) 
      : (entryPrice - marketPrice) / Math.max(entryPrice, EPSILON);
    entryMultiplier = 1 + 0.4 * Math.max(-0.5, Math.min(1, entryAdvantage));
  }
  
  // Supply ownership multiplier - rewards whales
  const supplyMultiplier = (trader.supplyOwnership && trader.supplyOwnership >= 0.05) ? 1.2 : 1;
  
  // Base weight from position size and smart score
  const baseWeight = trader.dollarPosition * scoreWeight;
  
  // Final weighted influence calculation
  const finalWeight = baseWeight * pnlMultiplier * entryMultiplier * supplyMultiplier;
  
  // Return signed influence (positive for YES, negative for NO)
  return trader.sentiment === 'yes' ? finalWeight : -finalWeight;
}

export function calculateSmartEdge(traders: Trader[], marketPrice: number = 50, bankroll: number = 100): SmartEdgeResult {
  // Handle empty traders case
  if (traders.length === 0) {
    return {
      edgeWeights: [],
      smartSkew: 0,
      gravitySmart: 0,
      rawYesProb: 0.5,
      calibratedYesProb: 0.5,
      confidenceLevel: "Unknown",
      avgSmartScore: 0,
      confidenceFactor: 0,
      probabilityRange: {
        lower: 0.025,
        upper: 0.975
      },
      traderInfluences: [],
      smartYesCapital: 0,
      smartNoCapital: 0
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

  // Convert market price to 0-1 scale for calculations
  const marketProbability = marketPrice / 100;

  // Step 1: Score each trader with influence-based selection
  const enhancedTraders: EnhancedTrader[] = sanitizedTraders.map(trader => {
    // Calculate base influence score
    const influenceScore = trader.smartScore * Math.log(trader.dollarPosition + 1);
    
    // Calculate full weighted influence
    const weightedInfluence = computeWeightedInfluence(trader, marketProbability);
    
    return {
      ...trader,
      influenceScore,
      weightedInfluence
    };
  });
  
  // Step 2: Sort by absolute influence score for better selection
  enhancedTraders.sort((a, b) => Math.abs(b.influenceScore) - Math.abs(a.influenceScore));
  
  // Take the top 200 most influential traders (or all if less than 200)
  const topTraders = enhancedTraders.slice(0, Math.min(200, enhancedTraders.length));
  
  // Step 3: Calculate raw weights using advanced weighted influence
  const rawWeights = topTraders.map(trader => trader.weightedInfluence);
  
  // Step 4: Calculate smart capital distribution
  const smartYesCapital = topTraders
    .filter(t => t.smartScore > SMART_SCORE_THRESHOLD && t.sentiment === 'yes')
    .reduce((sum, t) => sum + t.dollarPosition, 0);
  
  const smartNoCapital = topTraders
    .filter(t => t.smartScore > SMART_SCORE_THRESHOLD && t.sentiment === 'no')
    .reduce((sum, t) => sum + t.dollarPosition, 0);
  
  // Calculate Smart Skew (imbalance between smart YES and NO capital)
  const smartSkew = (smartYesCapital - smartNoCapital) / 
                    (smartYesCapital + smartNoCapital + EPSILON);

  // Step 5: Calculate weighted gravity score
  const sumWeights = rawWeights.reduce((sum, w) => sum + w, 0);
  const sumAbsWeights = rawWeights.reduce((sum, w) => sum + Math.abs(w), 0);
  const gravitySmart = sumWeights / (sumAbsWeights + EPSILON);
  
  // Step 6: Calculate raw Yes probability
  const rawYesProb = (gravitySmart + 1) / 2;
  
  // Step 7: Calculate average smart score (for confidence)
  const avgSmartScore = topTraders.reduce((sum, t) => 
    sum + Math.abs(t.smartScore) * Math.log(t.dollarPosition + 1), 0) / 
    (topTraders.reduce((sum, t) => sum + Math.log(t.dollarPosition + 1), 0) + EPSILON);
  
  // Step 8: Calculate confidence factor based on multiple signals
  // - Smart skew (capital imbalance)
  // - Average smart score
  // - Concentration of capital
  const smartSkewConfidence = Math.min(1, Math.abs(smartSkew));
  const scoreConfidence = Math.min(1, avgSmartScore / 100);
  
  // Calculate concentration metric - how concentrated the capital is
  const totalCapital = topTraders.reduce((sum, t) => sum + t.dollarPosition, 0);
  const herfindahlIndex = topTraders.reduce((sum, t) => 
    sum + Math.pow(t.dollarPosition / totalCapital, 2), 0);
  const concentrationConfidence = Math.min(1, herfindahlIndex * 10); // Scale up for better range
  
  // Combined confidence factor
  const confidenceFactor = 0.5 * smartSkewConfidence + 0.3 * scoreConfidence + 0.2 * concentrationConfidence;
  
  // Step 9: Calculate calibrated yes probability
  const calibratedYesProb = 0.5 + (rawYesProb - 0.5) * confidenceFactor;
  
  // Determine confidence level based on confidence factor
  const confidenceLevel = getConfidenceLevel(confidenceFactor * 100);
  
  // Calculate error margin for probability range
  const margin = calculateErrorMargin(topTraders, calibratedYesProb);
  
  // Calculate probability range
  const probabilityRange = {
    lower: Math.max(0.025, calibratedYesProb - margin),
    upper: Math.min(0.975, calibratedYesProb + margin)
  };
  
  // Calculate normalized influence for each trader
  const traderInfluences: TraderInfluence[] = topTraders.map((trader) => {
    return {
      name: trader.name || `Trader ${topTraders.indexOf(trader) + 1}`,
      smartScore: trader.smartScore,
      dollarPosition: trader.dollarPosition,
      sentiment: trader.sentiment,
      weight: trader.weightedInfluence,
      influencePercent: (Math.abs(trader.weightedInfluence) / (sumAbsWeights + EPSILON)) * 100,
      entryPrice: trader.entryPrice,
      realizedPnl: trader.realizedPnl,
      unrealizedPnl: trader.unrealizedPnl,
      supplyOwnership: trader.supplyOwnership
    };
  });

  // Sort trader influences by absolute influence percentage
  traderInfluences.sort((a, b) => Math.abs(b.influencePercent) - Math.abs(a.influencePercent));

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
    edgeWeights: rawWeights,
    smartSkew,
    gravitySmart,
    rawYesProb,
    calibratedYesProb,
    confidenceLevel,
    avgSmartScore,
    confidenceFactor,
    probabilityRange,
    traderInfluences,
    smartYesCapital,
    smartNoCapital,
    kellyBetting,
    optimalStrategy
  };
}

export function getConfidenceLevel(confidenceValue: number): string {
  if (confidenceValue >= 70) return "High ✅";
  if (confidenceValue >= 40) return "Medium ⚠️";
  return "Low ❗";
}

// Helper to convert confidence level to numeric value
export function getNumericConfidence(confidenceLevel: string): number {
  if (confidenceLevel.includes("High")) return 85;
  if (confidenceLevel.includes("Medium")) return 55;
  return 25;
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
    edge = (marketProb - calibratedProb) / marketProb;
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
    const odds = betSide === 'yes' ? 1 / marketProb : 1 / (1 - marketProb);
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
  const edgeThreshold = 0.15; // 15% minimum edge (increased from original)
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
    edgeThreshold = 0.15; // 15% minimum edge (increased from original)
  } else if (confidenceLevel.includes("Medium")) {
    maximumRisk = 0.05; // 5% of bankroll
    edgeThreshold = 0.20; // 20% minimum edge (increased from original)
  } else {
    maximumRisk = 0.02; // 2% of bankroll
    edgeThreshold = 0.25; // 25% minimum edge (increased from original)
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

/**
 * Calculate arbitrage edge based on market price and smart estimate
 * This is a separate calculation from the prediction-based edge
 */
export function calculateArbitrageEdge(
  smartEstimate: number, 
  marketPrice: number, 
  bankroll: number = 100,
  kellyFraction: number = 0.25 // Quarter Kelly by default
): ArbitrageEdgeResult {
  // Convert to probabilities (0-1 scale)
  const marketYesProb = marketPrice / 100;
  const marketNoProb = 1 - marketYesProb;
  
  const smartYesProb = smartEstimate;
  const smartNoProb = 1 - smartYesProb;
  
  // Calculate edge per side
  const yesEdge = smartYesProb - marketYesProb;
  const noEdge = smartNoProb - marketNoProb;
  
  // Determine direction
  const absYesEdge = Math.abs(yesEdge);
  const absNoEdge = Math.abs(noEdge);
  
  let betDirection: 'yes' | 'no' | 'none' = 'none';
  let edge = 0;
  
  // Only bet if the edge is at least 2%
  const EDGE_THRESHOLD = 0.02;
  
  if (yesEdge > EDGE_THRESHOLD && yesEdge > noEdge) {
    betDirection = 'yes';
    edge = yesEdge;
  } else if (noEdge > EDGE_THRESHOLD && noEdge > yesEdge) {
    betDirection = 'no';
    edge = noEdge;
  }
  
  // Calculate Kelly stake
  const stake = edge > 0 ? bankroll * edge * kellyFraction : 0;
  const bankrollPercentage = edge > 0 ? edge * kellyFraction * 100 : 0;
  
  return {
    marketYesProb,
    marketNoProb,
    smartYesProb,
    smartNoProb,
    yesEdge,
    noEdge,
    betDirection,
    edge,
    stake,
    bankrollPercentage,
    hasEdge: edge > 0
  };
} 