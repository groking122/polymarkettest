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
}

// Constants for temperature calculation
const BASE_TEMP = 1.5;          // baseline > 1 keeps some spread
const SIZE_W = 1.3;             // weight of crowd-size term
const DISP_W = 2.6;             // weight for dispersion term
const T_MIN = 1.0;
const T_MAX = 12.0;
const CAP_SHARE = 0.12;

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

/** robust dispersion = 1.4826 * MAD (≈ σ for normal data) */
function robustDispersion(values: number[]): number {
  const med = median(values);
  const absDevs = values.map(v => Math.abs(v - med));
  const mad = median(absDevs);
  return 1.4826 * mad / (med + 1e-9);
}

function calcTemperature(rawAbs: number[], N: number): number {
  // Calculate dispersion with MAD
  const disp = robustDispersion(rawAbs);
  
  // Use nonlinear dispersion sensitivity (disp^0.8)
  let T = BASE_TEMP + SIZE_W * Math.log2(Math.max(2, N)) + DISP_W * Math.pow(disp, 0.8);
  
  // Clamp temperature between min and max
  return Math.max(T_MIN, Math.min(T_MAX, T));
}

function softmax(absVals: number[], T: number): number[] {
  const expVals = absVals.map(v => Math.exp(v / T));
  const sum = expVals.reduce((s, x) => s + x, 0);
  return expVals.map(v => v / sum);
}

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

function calculateErrorMargin(traders: Trader[]): number {
  const n = traders.length;
  if (n === 0) return 0.5; // max uncertainty

  // Calculate weighted variance in smart scores
  const weightedScoreSum = traders.reduce((sum, t) => 
    sum + Math.abs(t.smartScore) * Math.log2(t.dollarPosition + 1), 0);
  const totalWeight = traders.reduce((sum, t) => 
    sum + Math.log2(t.dollarPosition + 1), 0);
  
  const avgWeightedScore = weightedScoreSum / totalWeight;
  const weightedVariance = traders.reduce((sum, t) => 
    sum + Math.pow(Math.abs(t.smartScore) - avgWeightedScore, 2) * Math.log2(t.dollarPosition + 1), 0) / totalWeight;
  
  const weightedStdDev = Math.sqrt(weightedVariance);
  
  // Base margin of error (conservative version)
  const baseMargin = 0.5 / Math.sqrt(n);
  
  // Scale margin by weighted smart score variability
  const scaledMargin = baseMargin * (weightedStdDev / 50);  // smart scaling
  
  // Cap at ±20% error
  return Math.min(scaledMargin, 0.2);
}

export function calculateSmartGravity(traders: Trader[]): GravityResult {
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

  // 1) Compute raw weights with improved score scaling
  const rawWeights = traders.map(trader => {
    // Smoother sigmoid variant for smart scores
    const scoreScale = 0.5 + 0.5 * Math.tanh(trader.smartScore / 40);
    
    // Sentiment direction
    const sentimentFactor = trader.sentiment === 'yes' ? 1 : -1;
    
    // Calculate raw weight
    return sentimentFactor * scoreScale * Math.log2(trader.dollarPosition + 1);
  });

  // 2) Separate signs and magnitudes
  const signs = rawWeights.map(Math.sign);
  const absRaw = rawWeights.map(Math.abs);

  // 3) Calculate temperature with nonlinear dispersion
  const N = traders.length;
  const T = calcTemperature(absRaw, N);

  // 4) Apply softmax to magnitudes
  const pAbs = softmax(absRaw, T);

  // 5) Re-apply sentiment signs to get raw influence
  const rawInfluence = pAbs.map((p, i) => signs[i] * p);

  // 6) Apply post-softmax capping
  const influence = enforceCap(rawInfluence);

  // Log stats in non-prod environments
  logStats(traders.length, T, influence);

  // Calculate gravity score
  const gravityScore = influence.reduce((sum: number, weight: number) => sum + weight, 0);

  // Calculate raw probability
  const rawYesProb = (gravityScore + 1) / 2;

  // Calculate weighted average smart score
  const weightedScoreSum = traders.reduce((sum: number, trader: Trader) => 
    sum + Math.abs(trader.smartScore) * Math.log2(trader.dollarPosition + 1), 0);
  const totalWeight = traders.reduce((sum: number, trader: Trader) => 
    sum + Math.log2(trader.dollarPosition + 1), 0);
  
  const avgSmartScore = weightedScoreSum / totalWeight;

  // Calculate confidence level based on weighted average smart score
  const confidenceLevel = getConfidenceLevel(avgSmartScore);
  
  // Calculate confidence factor for calibration
  const confidenceFactor = calculateConfidenceFactor(avgSmartScore);
  
  // Calculate calibrated probability
  const calibratedYesProb = 0.5 + (rawYesProb - 0.5) * confidenceFactor;

  // Calculate error margin
  const margin = calculateErrorMargin(traders);
  
  // Calculate probability range
  const probabilityRange = {
    lower: Math.max(0.025, calibratedYesProb - margin),
    upper: Math.min(0.975, calibratedYesProb + margin)
  };

  // Calculate trader influences
  const totalAbsoluteWeight = influence.reduce((sum: number, w: number) => sum + Math.abs(w), 0);
  const traderInfluences: TraderInfluence[] = traders.map((trader, index) => ({
    name: trader.name || `Trader ${index + 1}`,
    smartScore: trader.smartScore,
    dollarPosition: trader.dollarPosition,
    sentiment: trader.sentiment,
    weight: influence[index],
    influencePercent: (Math.abs(influence[index]) / totalAbsoluteWeight) * 100
  }));

  // Sort trader influences by absolute influence percentage
  traderInfluences.sort((a, b) => Math.abs(b.influencePercent) - Math.abs(a.influencePercent));

  return {
    weights: influence,
    gravityScore,
    rawYesProb,
    calibratedYesProb,
    confidenceLevel,
    avgSmartScore,
    probabilityRange,
    traderInfluences
  };
}

function calculateConfidenceFactor(avgSmartScore: number): number {
  // Convert average smart score to a confidence factor between 0.5 and 1.0
  return 0.5 + (avgSmartScore / 200);
}

export function getConfidenceLevel(avgSmartScore: number): string {
  if (avgSmartScore >= 70) return "High ✅";
  if (avgSmartScore >= 40) return "Medium ⚠️";
  return "Low ❗";
} 