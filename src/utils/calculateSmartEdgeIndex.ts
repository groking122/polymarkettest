import { Trader } from "./calculateSmartGravity";

export interface SmartEdgeResult {
  // Basic metrics
  gravityScore: number;
  smartWeightedGravity: number;
  rawYesProb: number;
  calibratedYesProb: number;
  confidenceFactor: number;
  avgSmartScore: number;
  
  // Special metrics for this model
  smartSkew: number;
  smartYesCapital: number;
  smartNoCapital: number;
  
  // Range and trader influence data
  probabilityRange: {
    lower: number;
    upper: number;
  };
  traderInfluences: TraderInfluence[];
  
  // For Kelly betting calculations
  kellyBetting?: {
    edge: number;
    betSide: 'yes' | 'no' | 'none';
    positionSize: number;
    bankroll: number;
  };
}

export interface TraderInfluence {
  name: string;
  smartScore: number;
  dollarPosition: number;
  sentiment: 'yes' | 'no';
  scoreEmphasis: number;
  edgeWeight: number;
  influencePercent: number;
}

// Constants
const SCORE_EMPHASIS_K = 30; // Controls exponential steepness
const SMART_SCORE_THRESHOLD = 70; // Threshold for "smart" traders
const Z_SCORE_95 = 1.96; // Z-score for 95% confidence interval

/**
 * Calculate the Smart Edge Index based on trader data
 * @param traders Array of trader objects with sentiment, smartScore, and dollarPosition
 * @param marketPrice Current market price as percentage (0-100)
 * @param bankroll Optional bankroll for Kelly calculation
 * @returns SmartEdgeResult object with calculation results
 */
export function calculateSmartEdgeIndex(
  traders: Trader[],
  marketPrice: number = 50,
  bankroll: number = 100
): SmartEdgeResult {
  // Return default values for empty traders array
  if (traders.length === 0) {
    return {
      gravityScore: 0,
      smartWeightedGravity: 0,
      rawYesProb: 0.5,
      calibratedYesProb: 0.5,
      confidenceFactor: 0,
      avgSmartScore: 0,
      smartSkew: 0,
      smartYesCapital: 0,
      smartNoCapital: 0,
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

  // STEP 1: Calculate Score Emphasis using exponential
  const traderInfluences: TraderInfluence[] = sanitizedTraders.map(trader => {
    // Calculate score emphasis: exp(SmartScore / k)
    const scoreEmphasis = Math.exp(trader.smartScore / SCORE_EMPHASIS_K);
    
    // Calculate edge weight
    const sentimentFactor = trader.sentiment === 'yes' ? 1 : -1;
    const edgeWeight = sentimentFactor * scoreEmphasis * Math.log(trader.dollarPosition + 1);
    
    return {
      name: trader.name || '',
      smartScore: trader.smartScore,
      dollarPosition: trader.dollarPosition,
      sentiment: trader.sentiment,
      scoreEmphasis,
      edgeWeight,
      influencePercent: 0 // Will be calculated later
    };
  });

  // STEP 2 & 3: Calculate Smart Capital and Smart Skew
  const smartTraders = sanitizedTraders.filter(t => t.smartScore > SMART_SCORE_THRESHOLD);
  const smartYesCapital = smartTraders
    .filter(t => t.sentiment === 'yes')
    .reduce((sum, t) => sum + t.dollarPosition, 0);
  
  const smartNoCapital = smartTraders
    .filter(t => t.sentiment === 'no')
    .reduce((sum, t) => sum + t.dollarPosition, 0);
  
  const totalSmartCapital = smartYesCapital + smartNoCapital;
  // Add small epsilon to avoid division by zero
  const smartSkew = totalSmartCapital > 0 
    ? (smartYesCapital - smartNoCapital) / (totalSmartCapital + 0.001) 
    : 0;

  // STEP 4: Calculate Adjusted Gravity Score (Smart-Weighted)
  const totalEdgeWeight = traderInfluences.reduce((sum, t) => sum + t.edgeWeight, 0);
  const totalAbsEdgeWeight = traderInfluences.reduce((sum, t) => sum + Math.abs(t.edgeWeight), 0);
  
  // Avoid division by zero
  const smartWeightedGravity = totalAbsEdgeWeight > 0 
    ? totalEdgeWeight / totalAbsEdgeWeight 
    : 0;

  // STEP 5: Calculate Raw Yes Probability
  const rawYesProb = (smartWeightedGravity + 1) / 2;

  // STEP 6: Calculate Confidence Factor based on Smart Skew
  const confidenceFactor = Math.min(1, Math.pow(Math.abs(smartSkew), 0.6));
  
  // Calculate Calibrated Yes Probability
  const calibratedYesProb = 0.5 + (rawYesProb - 0.5) * confidenceFactor;

  // Additional calculations
  const avgSmartScore = sanitizedTraders.reduce((sum, t) => sum + t.smartScore, 0) / sanitizedTraders.length;
  
  // Calculate influence percentages
  traderInfluences.forEach(trader => {
    trader.influencePercent = totalAbsEdgeWeight > 0 
      ? (Math.abs(trader.edgeWeight) / totalAbsEdgeWeight) * 100 
      : 0;
  });

  // Sort by influence (highest first)
  traderInfluences.sort((a, b) => b.influencePercent - a.influencePercent);

  // Calculate probability range (simple approximation)
  const marginOfError = (1 - confidenceFactor) * 0.5;
  const probabilityRange = {
    lower: Math.max(0, calibratedYesProb - marginOfError),
    upper: Math.min(1, calibratedYesProb + marginOfError)
  };

  // Calculate Kelly bet size if market price is provided
  let kellyBetting;
  if (marketPrice !== undefined) {
    const marketProbability = marketPrice / 100;
    const edge = calibratedYesProb - marketProbability;
    
    // Determine bet side and calculate Kelly
    let betSide: 'yes' | 'no' | 'none' = 'none';
    let kellyFraction = 0;
    
    if (Math.abs(edge) > 0.01) { // Only bet if edge is significant
      if (edge > 0) {
        // Bet YES
        betSide = 'yes';
        // Kelly formula for YES bet: edge/odds
        const odds = (1 - marketProbability) / marketProbability;
        kellyFraction = edge / odds;
      } else {
        // Bet NO
        betSide = 'no';
        // Kelly formula for NO bet: -edge/odds
        const odds = marketProbability / (1 - marketProbability);
        kellyFraction = -edge / odds;
      }
    }
    
    // Cap Kelly at 20% for safety
    const safeFraction = Math.min(0.2, Math.max(0, kellyFraction));
    const positionSize = bankroll * safeFraction;
    
    kellyBetting = {
      edge,
      betSide,
      positionSize,
      bankroll
    };
  }

  return {
    gravityScore: smartWeightedGravity,
    smartWeightedGravity,
    rawYesProb,
    calibratedYesProb,
    confidenceFactor,
    avgSmartScore,
    smartSkew,
    smartYesCapital,
    smartNoCapital,
    probabilityRange,
    traderInfluences,
    kellyBetting
  };
}

/**
 * Get a readable confidence level from the confidence factor
 */
export function getConfidenceLevelFromFactor(confidenceFactor: number): string {
  if (confidenceFactor >= 0.75) return "High";
  if (confidenceFactor >= 0.4) return "Medium";
  return "Low";
} 