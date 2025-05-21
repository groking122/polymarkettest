// vote-gravity-calculator-v2.ts

// --- Interfaces ---

export interface Trader {
  name?: string;
  sentiment: 'yes' | 'no'; // 'yes' for positive sentiment, 'no' for negative
  smartScore: number;      // Trader's expertise or predictive score
  dollarPosition: number;  // Investment amount
  // For confidence decay, we might need prediction timestamps if they vary per trader
  // predictionTimestamp?: number; // Optional: if decay is per trader prediction age
}

export interface BayesianConfidenceParams {
  avgSmartScore: number;
  numTraders: number;
  pseudoCountM?: number; // Default: 10
  priorP?: number;       // Default: 0.5
}

export interface ConfidenceDecayParams {
  initialConfidence: number;
  daysSincePrediction: number;
  halfLifeD?: number;     // Default: 30 days
}

export interface VolatilityAdjustedKellyParams {
  edge: number;
  impliedVolatility: number;
  marketProbability: number;
  bankroll: number;
}

export interface EntropyTunedSoftmaxParams {
  rawWeights: number[];
  temperatureT: number; // This T would ideally be found via NMinimize
}

// For Cornish-Fisher, we'd need these stats for the Smart Score distribution
export interface SmartScoreDistributionStats {
  mean: number;
  standardDeviation: number;
  skewness: number;
  kurtosis: number; // This should be excess kurtosis (Kurtosis - 3)
}

export interface CornishFisherInput {
  calibratedProbability: number;
  distributionStats: SmartScoreDistributionStats;
  // Removed other params like daysSincePredictionEnMasse, as they are not directly part of C-F input
}

export interface UncertaintyBand {
  lower: number;
  upper: number;
  methodNote?: string; // To specify if it's a placeholder or actual C-F
}

export interface KellyBettingV2 {
  positionSize: number; // Calculated bet size
  edge: number;
  marketProbability: number;
  impliedVolatility: number;
  bankroll: number;
}

export interface RiskRulesConfig {
  minConfidence?: number;       // e.g., 0.3 (30%)
  minEdge?: number;             // e.g., 0.05 (5% absolute)
  maxPositionSizePct?: number; // e.g., 0.05 (5% of bankroll, applies to absolute position size)
}

export interface RiskFilterLogEntry {
  ruleTriggered: string; 
  message: string;
}

export interface RiskFilterReport {
  isFiltered: boolean;
  originalPositionSize: number;
  finalPositionSize: number;
  log: RiskFilterLogEntry[];
}

export interface GravityKellyV2Input {
  traders: Trader[];
  marketPrice: number; // Market price (0-100)
  bankroll?: number;    // Default: 100
  impliedVolatility: number; // e.g., 0.3 for 30%
  daysSincePredictionEnMasse: number; // Assuming one "age" for the set of predictions

  // Optional parameters for fine-tuning
  bayesianPseudoCountM?: number;
  bayesianPriorP?: number;
  decayHalfLifeD?: number;
  // softmaxTemperatureT is no longer a direct input for the main calculation logic
  // It will be determined by fetchOptimizedTemperature
  // lambdaEntropyCost?: number; // For the NMinimize objective if T is calculated
  riskRulesConfig?: RiskRulesConfig;
}

export interface GravityKellyV2Result {
  traderRawWeights: { name?: string, rawWeight: number }[];
  traderSoftmaxWeights: { name?: string, softmaxWeight: number }[];
  gravityScore: number;
  
  averageSmartScore: number;
  bayesianConfidence: number;
  decayedConfidence: number;
  
  intermediateProbability: number; // (gravityScore + 1) / 2
  finalCalibratedProbability: number;
  
  marketEdge: number;
  kellyBetting: KellyBettingV2;
  
  uncertaintyBands: UncertaintyBand; // From Cornish-Fisher
  
  // For debugging or further analysis
  inputsUsed: GravityKellyV2Input;
  softmaxTemperatureUsed: number;
  // riskAssessment?: any; // Placeholder for "Apply risk rules"
  riskFilterReport?: RiskFilterReport;
}

// --- Constants (can be adjusted or made configurable) ---
const DEFAULT_PSEUDO_COUNT_M = 10;
const DEFAULT_PRIOR_P = 0.5;
const DEFAULT_HALF_LIFE_D = 30; // days
const DEFAULT_BANKROLL = 100;
// Default temperature T if not calculated dynamically or provided.
// The ideal T comes from entropy minimization, which is complex.
const DEFAULT_SOFTMAX_TEMP_T = 1.5; // Placeholder, similar to BASE_TEMP in v1


// --- Helper Functions ---

// Function stubs from the user prompt to be implemented below

/**
 * 1. Bayesian Confidence Weighting
 * confidence = (n * s + m * p) / (n + m)
 * s = average Smart Score
 */
export function computeBayesianConfidence(
  params: BayesianConfidenceParams
): number {
  const { 
    avgSmartScore: s,
    numTraders: n,
    pseudoCountM: m = DEFAULT_PSEUDO_COUNT_M,
    priorP: p = DEFAULT_PRIOR_P 
  } = params;

  if (n + m === 0) {
    // Avoid division by zero, though n should be >= 0 and m > 0 by design
    return p; // Return prior if no information or pseudo-count
  }
  return (n * s + m * p) / (n + m);
}

/**
 * 2. Cornish-Fisher Uncertainty Bands (Placeholder)
 * This requires a statistical library or complex implementation.
 */
export function calculateCornishFisherBands(
  params: CornishFisherInput
): UncertaintyBand {
  const { calibratedProbability, distributionStats } = params;

  // Placeholder logic: Return a symmetric band around the calibrated probability.
  // A real Cornish-Fisher implementation would use skewness and kurtosis
  // from distributionStats to create asymmetric and more accurate bands.
  // For now, let's use a simple +/- 0.15 as a mock band, or a wider band if stdDev is large.
  
  let lower = calibratedProbability - 0.15;
  let upper = calibratedProbability + 0.15;
  let note = "Placeholder: Simple symmetric band (+/- 0.15). Skew/Kurtosis not fully used.";

  // If we have some basic stats, we can make it slightly more responsive
  // This is NOT Cornish-Fisher but better than a fixed band.
  if (distributionStats && distributionStats.standardDeviation > 0) {
    const Z_crit = 1.96; // For ~95% confidence
    const stdDev = distributionStats.standardDeviation;
    const N = distributionStats.mean > 0 && stdDev > 0 ? (distributionStats.mean * (1 - distributionStats.mean) / (stdDev * stdDev)) : 1; // Effective sample size (approx)
    const skew = distributionStats.skewness;
    const kurt = distributionStats.kurtosis; // Excess kurtosis

    // Simplified Cornish-Fisher like adjustment (Illustrative - NOT a proper CF expansion)
    // A real CF expansion is more complex: Z_cf = Z + (Z^2-1)S/6 + (Z^3-3Z)K/24 - (2Z^3-5Z)S^2/36 + ...
    // We are using a very simplified placeholder for the adjustment term.
    const adjustmentFactor = (skew / 6) * (Z_crit * Z_crit -1) + (kurt / 24) * (Z_crit * Z_crit * Z_crit - 3 * Z_crit);
    
    // This is a conceptual placeholder to show where skew/kurtosis would be used.
    // It does NOT represent a correct C-F calculation.
    // The actual values from a Wolfram call would replace this entire block.
    const lowerAdjustment = (stdDev / Math.sqrt(N)) * (Z_crit - adjustmentFactor);
    const upperAdjustment = (stdDev / Math.sqrt(N)) * (Z_crit + adjustmentFactor);

    // Fallback to simpler symmetric if adjustment is wild (due to placeholder math)
    if (isNaN(lowerAdjustment) || isNaN(upperAdjustment) || !isFinite(lowerAdjustment) || !isFinite(upperAdjustment) || lowerAdjustment <=0 || upperAdjustment <=0 ) {
        const margin = Z_crit * stdDev; // Default to simpler symmetric band using prob's std dev (if N was for binomial)
                                        // Or use stdDev of smart scores directly if that was intended: Z_crit * distributionStats.standardDeviation
                                        // Using a std dev derived from calibratedProbability assuming it acts like a mean of a binomial trial for simplicity here.
        const p_std_dev = Math.sqrt(calibratedProbability * (1-calibratedProbability) / (N > 0 ? N : 10)); // Example effective N, or use trader count
        const margin_prop = Z_crit * p_std_dev;
        lower = calibratedProbability - margin_prop;
        upper = calibratedProbability + margin_prop;
        note = `Placeholder: Symmetric band using Calibrated Prob +/- 1.96*std_dev_of_prob. Skew/Kurtosis calculated but C-F is mocked.`;
    } else {
        lower = calibratedProbability - lowerAdjustment;
        upper = calibratedProbability + upperAdjustment;
        note = `Placeholder: Mock C-F-like adjustment using calculated Skew/Kurtosis. Needs Wolfram integration for real C-F.`;
    }
  }

  return {
    lower: Math.max(0, Math.min(1, lower)), // Clamp between 0 and 1
    upper: Math.max(0, Math.min(1, upper)), // Clamp between 0 and 1
    methodNote: note
  };
}

/**
 * 3. Volatility-Adjusted Kelly Sizing
 * position size = (e / (sigma * p)) * bankroll
 * e = edge, sigma = implied volatility, p = market probability
 */
export function calculateVolatilityAdjustedKelly(
  params: VolatilityAdjustedKellyParams
): number {
  const { edge, impliedVolatility, marketProbability, bankroll } = params;

  if (impliedVolatility <= 0 || marketProbability <= 0) {
    // Avoid division by zero or nonsensical results (e.g. betting entire bankroll on sure thing with no vol)
    // Depending on strategy, might return 0 or handle differently.
    // For now, returning 0 if volatility or market_prob is non-positive.
    return 0;
  }

  // Ensure marketProbability is not > 1 (can happen if marketPrice > 100 passed in error)
  const p = Math.min(marketProbability, 1.0);

  const positionSize = (edge / (impliedVolatility * p)) * bankroll;
  
  // Kelly fraction can be > 1 or negative. 
  // Typically, a practical Kelly strategy caps the fraction (e.g., 0.25 for quarter Kelly)
  // and only bets if edge > 0 and fraction is positive.
  // This function currently returns the raw Kelly fraction * bankroll.
  // Further capping and logic (e.g. no bet if edge < 0) should be in the main system flow.
  return positionSize;
}

/**
 * 4.a Raw Weight Calculation (Part of Entropy-Tuned Softmax)
 * raw_weight = sign * tanh(score/40) * log(position + 1)
 */
export function calculateRawWeight(
  trader: Trader
): number {
  const { smartScore, dollarPosition, sentiment } = trader;

  // Ensure dollarPosition is non-negative before log
  const position = Math.max(0, dollarPosition);

  // Determine sign from sentiment
  const sign = sentiment === 'yes' ? 1 : -1;
  
  // tanh(score/40)
  const scoreComponent = Math.tanh(smartScore / 40);
  
  // log(position + 1)
  const positionComponent = Math.log(position + 1);
  
  return sign * scoreComponent * positionComponent;
}

/**
 * 4.b Softmax Function (Part of Entropy-Tuned Softmax)
 * weights = softmax(raw_weights / T)
 */
export function applySoftmax(
  params: EntropyTunedSoftmaxParams
): number[] {
  const { rawWeights, temperatureT: T } = params;

  if (T <= 0) {
    // Temperature must be positive. Handle error or use a default.
    // For simplicity, returning raw weights (or empty if T is critical and invalid)
    console.warn("Softmax temperature T must be positive. Got:", T);
    // Or throw new Error("Softmax temperature T must be positive.");
    // Depending on how strict we want to be, could return rawWeights or an empty array.
    // Returning normalized weights without temp scaling if T is invalid, as a fallback.
    const sum = rawWeights.reduce((s, x) => s + x, 0);
    if (sum === 0) return rawWeights.map(() => 1 / rawWeights.length); // Equal weight if sum is 0
    return rawWeights.map(rw => rw / sum);
  }

  // The prompt shows softmax(raw_weights / T).
  // However, typical softmax is on `x_i`, not `x_i / T` before exponentiation.
  // The `T` is usually in the denominator of the exponent: exp(x_i / T).
  // Assuming exp( (raw_weight_i / T) ) / sum( exp( (raw_weight_j / T) ) ) is NOT what's meant.
  // Assuming raw_weights are already scaled by 1/T IF that was the intention before this function.
  // If the formula means `exp(raw_weight_value / T)`, then that scaling should happen here.
  // Let's clarify. The V1 code did: expVals = absVals.map(v => Math.exp(v / T));
  // This suggests the division by T is *inside* the exp.
  // The prompt: `softmax(raw_weights / T)` could mean apply scaling, then softmax.
  // Or `softmax_with_temp_T(raw_weights)`.  Let's assume the latter, where T is used in exp.
  
  // Max value for numerical stability (prevents overflow with large rawWeights)
  const maxVal = Math.max(...rawWeights);
  
  const expVals = rawWeights.map(rw => Math.exp((rw - maxVal) / T));
  const sumExpVals = expVals.reduce((sum, val) => sum + val, 0);

  if (sumExpVals === 0) {
    // Avoid division by zero. If all expVals are 0 (e.g., due to very negative inputs and small T),
    // return uniform distribution or handle as an error.
    return rawWeights.map(() => 1 / rawWeights.length);
  }

  return expVals.map(val => val / sumExpVals);
}

/**
 * 5. Prediction Aging (Confidence Decay)
 * confidence_new = confidence_old * exp(-days / d)
 * d = half-life period. Note: The formula exp(-days/d) with d as half-life is not standard.
 * Standard is conf * (0.5)^(days/half_life) or conf * exp(-days * ln(2)/half_life).
 * Will implement user's formula and add a note.
 */
export function applyConfidenceDecay(
  params: ConfidenceDecayParams
): number {
  const { 
    initialConfidence,
    daysSincePrediction,
    halfLifeD: d = DEFAULT_HALF_LIFE_D 
  } = params;

  if (d <= 0) {
    console.warn("Confidence decay half-life d must be positive. Got:", d);
    return initialConfidence; // No decay if half-life is invalid
  }
  
  // Formula as provided: confidence * exp(-days / d)
  // Note: If d is the "half-life", typically the base of the exponent or the rate is adjusted.
  // For example, decay_factor = (0.5)**(daysSincePrediction / d)
  // or decay_factor = Math.exp(-daysSincePrediction * Math.log(2) / d).
  // The provided formula means that after `d` days, confidence is `initialConfidence * exp(-1)` (approx 0.368 of initial).
  // If `d` is when it should be 0.5, then the rate `1/d` in `exp(-rate * days)` should be `ln(2)/d`.
  // Implementing as per user specification:
  const decayFactor = Math.exp(-daysSincePrediction / d);
  
  return initialConfidence * decayFactor;
}

// Placeholder for fetching optimized softmax temperature T
// In a real scenario, this might involve a call to Wolfram Cloud or other optimization logic.
async function fetchOptimizedTemperature(rawWeights: number[]): Promise<number> {
  // Simulate Wolfram NMinimize[{Entropy[Softmax[weights/T]] + lambda * GroupSize}, {T}]
  // For now, returning a default or a very simple heuristic.
  // A real implementation would require an async call and proper error handling.
  console.log("Simulating call to fetchOptimizedTemperature with rawWeights:", rawWeights);
  // Example: if variance is high, use higher T, if low, use lower T.
  if (rawWeights.length < 2) return 1.5; // Default if not enough data for variance

  const mean = rawWeights.reduce((a,b) => a+b, 0) / rawWeights.length;
  const variance = rawWeights.map(x => Math.pow(x - mean, 2)).reduce((a,b) => a+b, 0) / rawWeights.length;
  
  let optimizedT = 1.5; // Default
  if (variance > 0.5) { // Arbitrary threshold for high variance
    optimizedT = 2.0;
  } else if (variance < 0.1 && variance > 0) { // Arbitrary threshold for low variance
    optimizedT = 1.0;
  }
  console.log(`Simulated optimized T: ${optimizedT} based on variance: ${variance}`);
  return Promise.resolve(optimizedT); // Simulate async call
}

// Utility: Math.log is natural log. Math.tanh is available.
// Need an entropy function if we try to replicate T calculation from v1 or for the NMinimize objective
function entropy(probs: number[]): number {
  return -probs.reduce((sum, p) => {
    if (p <= 0) return sum; // log(0) or log(<0) is undefined.
    return sum + p * Math.log(p);
  }, 0);
}

// --- Risk Filter Function ---
export function applyRiskFilters(
  currentResult: Readonly<GravityKellyV2Result>, // Use Readonly to avoid accidental direct modification outside of explicit returns
  config?: RiskRulesConfig
): RiskFilterReport {
  const { kellyBetting, decayedConfidence, marketEdge } = currentResult;
  const originalPositionSize = kellyBetting.positionSize;
  let newPositionSize = originalPositionSize;
  const log: RiskFilterLogEntry[] = [];
  let isFiltered = false;

  if (!config) {
    return {
      isFiltered: false,
      originalPositionSize,
      finalPositionSize: originalPositionSize,
      log: [],
    };
  }

  const effectiveBankroll = kellyBetting.bankroll || DEFAULT_BANKROLL; // Ensure bankroll is defined

  // Rule 1: Minimum Confidence
  if (config.minConfidence !== undefined && decayedConfidence < config.minConfidence) {
    isFiltered = true;
    newPositionSize = 0;
    log.push({
      ruleTriggered: "Minimum Confidence",
      message: `Actual decayed confidence ${decayedConfidence.toFixed(4)} is below minimum ${config.minConfidence.toFixed(4)}. Position size set to 0.`,
    });
  }

  // Rule 2: Minimum Edge (only apply if not already zeroed by confidence)
  // Edge is absolute, so check Math.abs(marketEdge)
  if (newPositionSize !== 0 && config.minEdge !== undefined && Math.abs(marketEdge) < config.minEdge) {
    isFiltered = true;
    newPositionSize = 0;
    log.push({
      ruleTriggered: "Minimum Edge",
      message: `Absolute market edge ${Math.abs(marketEdge).toFixed(4)} is below minimum ${config.minEdge.toFixed(4)}. Position size set to 0.`,
    });
  }

  // Rule 3: Maximum Position Size Percentage of Bankroll (only apply if not already zeroed)
  // This applies to the absolute size of the bet.
  if (newPositionSize !== 0 && config.maxPositionSizePct !== undefined && effectiveBankroll > 0) {
    const maxAllowedAbsolutePosition = effectiveBankroll * config.maxPositionSizePct;
    if (Math.abs(newPositionSize) > maxAllowedAbsolutePosition) {
      isFiltered = true;
      // Cap the position size, preserving its original sign
      newPositionSize = Math.sign(newPositionSize) * maxAllowedAbsolutePosition;
      log.push({
        ruleTriggered: "Maximum Position Size",
        message: `Absolute position size ${Math.abs(originalPositionSize).toFixed(2)} (${(Math.abs(originalPositionSize)/effectiveBankroll*100).toFixed(1)}% of bankroll) exceeds maximum ${config.maxPositionSizePct*100}% (${maxAllowedAbsolutePosition.toFixed(2)}). Position size capped to ${newPositionSize.toFixed(2)}.`,
      });
    }
  }
  
  return {
    isFiltered,
    originalPositionSize,
    finalPositionSize: newPositionSize,
    log,
  };
}

// --- Main System Flow Function ---

export async function calculateGravityKellyV2(
  inputs: GravityKellyV2Input
): Promise<GravityKellyV2Result> {
  const {
    traders,
    marketPrice, // Market price (0-100)
    bankroll = DEFAULT_BANKROLL,
    impliedVolatility, // e.g., 0.3 for 30%
    daysSincePredictionEnMasse,
    bayesianPseudoCountM = DEFAULT_PSEUDO_COUNT_M,
    bayesianPriorP = DEFAULT_PRIOR_P,
    decayHalfLifeD = DEFAULT_HALF_LIFE_D,
    // softmaxTemperatureT is no longer a direct input for the main calculation logic
    riskRulesConfig // new input
  } = inputs;

  const numTraders = traders.length;
  const marketProbability = marketPrice / 100;

  // --- Initial check for empty trader list --- (already present, but good to confirm)
  if (numTraders === 0) {
    const priorConfidence = bayesianPriorP;
    const decayedPriorConfidence = applyConfidenceDecay({
      initialConfidence: priorConfidence,
      daysSincePrediction: daysSincePredictionEnMasse,
      halfLifeD: decayHalfLifeD,
    });
    const finalProbBasedOnPrior = priorConfidence * 0.5 + (1 - priorConfidence) * 0.5; // effectively 0.5
    const edgeFromPrior = finalProbBasedOnPrior - marketProbability;

    const initialKellyBetting: KellyBettingV2 = {
        positionSize: calculateVolatilityAdjustedKelly({ 
            edge: edgeFromPrior, 
            impliedVolatility, 
            marketProbability, 
            bankroll 
        }),
        edge: edgeFromPrior,
        marketProbability: marketProbability,
        impliedVolatility: impliedVolatility,
        bankroll: bankroll,
    };
    
    // Construct a partial result to pass to applyRiskFilters
    const partialResultForEmpty: Pick<GravityKellyV2Result, 'decayedConfidence' | 'marketEdge' | 'kellyBetting'> = {
        decayedConfidence: decayedPriorConfidence,
        marketEdge: edgeFromPrior,
        kellyBetting: initialKellyBetting
    };

    // Apply risk filters even for empty trader list (e.g. if edge is too small based on prior)
    // Need to cast partialResultForEmpty to GravityKellyV2Result for applyRiskFilters, or adjust applyRiskFilters
    // For simplicity, let's ensure applyRiskFilters can handle a structure with just the necessary fields,
    // or we fully construct a minimal GravityKellyV2Result here.
    // The current applyRiskFilters expects more fields from currentResult.
    // Let's just pass a simplified config and update positionSize directly for this edge case,
    // or, better yet, the risk filters should be applied at the very end.
    // Let's re-think: applyRiskFilters takes GravityKellyV2Result. So we need to structure this no-trader case.
    
    let riskFilterReportForEmpty: RiskFilterReport = {
        isFiltered: false,
        originalPositionSize: initialKellyBetting.positionSize,
        finalPositionSize: initialKellyBetting.positionSize,
        log: []
    };

    if (riskRulesConfig) {
        // Create a minimal mock result for filtering
        const mockResultForFilter: GravityKellyV2Result = {
            traderRawWeights: [],
            traderSoftmaxWeights: [],
            gravityScore: 0,
            averageSmartScore: 0,
            bayesianConfidence: priorConfidence,
            decayedConfidence: decayedPriorConfidence,
            intermediateProbability: 0.5,
            finalCalibratedProbability: finalProbBasedOnPrior,
            marketEdge: edgeFromPrior,
            kellyBetting: { ...initialKellyBetting }, // Use a copy
            uncertaintyBands: { lower: 0, upper: 0, methodNote: "N/A for no traders prior" }, // Placeholder
            inputsUsed: { ...inputs, bankroll, bayesianPseudoCountM, bayesianPriorP, decayHalfLifeD, riskRulesConfig },
            softmaxTemperatureUsed: 1.5, // Default
            // riskFilterReport will be populated by applyRiskFilters
        };
        riskFilterReportForEmpty = applyRiskFilters(mockResultForFilter, riskRulesConfig);
        initialKellyBetting.positionSize = riskFilterReportForEmpty.finalPositionSize;
    }


    return {
      traderRawWeights: [],
      traderSoftmaxWeights: [],
      gravityScore: 0,
      averageSmartScore: 0, // No traders, so average score is 0 or undefined. Let's use 0.
      bayesianConfidence: priorConfidence,
      decayedConfidence: decayedPriorConfidence,
      intermediateProbability: 0.5,
      finalCalibratedProbability: finalProbBasedOnPrior, // Calibrated with prior
      marketEdge: edgeFromPrior,
      kellyBetting: initialKellyBetting, // Now potentially filtered
      uncertaintyBands: calculateCornishFisherBands({
        calibratedProbability: finalProbBasedOnPrior,
        distributionStats: { mean:0, standardDeviation:0, skewness:0, kurtosis:0 } // No data for stats
        // No longer need to pass other params here as CornishFisherInput is simplified
      }),
      inputsUsed: { ...inputs, bankroll, bayesianPseudoCountM, bayesianPriorP, decayHalfLifeD, riskRulesConfig },
      softmaxTemperatureUsed: 1.5, // Default T for no traders, as fetchOptimizedTemperature won't run
      riskFilterReport: riskFilterReportForEmpty,
    };
  }

  // --- 1. Trader Weighting Module: Calculate raw_weight per trader ---
  const traderRawWeights = traders.map(trader => ({
    name: trader.name,
    rawWeight: calculateRawWeight(trader),
  }));
  const rawWeights = traderRawWeights.map(rw => rw.rawWeight);

  // --- 2. Determine/Use Softmax Temperature T ---
  // The "Entropy Optimizer for Softmax Temp" (NMinimize) is a complex step not implemented here.
  // const T_used = softmaxTemperatureT; // Old way
  const T_used = await fetchOptimizedTemperature(rawWeights); // New: simulated async fetch

  // --- 3. Apply Softmax(weight / T) --- 
  const softmaxedWeights = applySoftmax({ rawWeights, temperatureT: T_used });
  const traderSoftmaxWeights = traders.map((trader, index) => ({
    name: trader.name,
    softmaxWeight: softmaxedWeights[index],
  }));

  // --- 4. Gravity Score = sum(weights) ---
  // The softmaxed weights represent probabilities (sum to 1 if all positive, or handle signs).
  // The prompt's raw_weight = sign * ... implies raw weights can be negative.
  // If raw weights are signed, softmax is typically applied to magnitudes, then signs reapplied.
  // Or, if softmax is applied to signed values directly, it can be problematic.
  // Let's re-evaluate: raw_weight = sign * tanh(score/40) * log(position+1).
  // Softmax is typically applied to a vector of scores to convert them to probabilities.
  // If rawWeights are signed, this suggests gravity is a sum of these signed values *after* softmax scaling on magnitudes.
  // The v1 `calculateSmartGravity` applied softmax to `absRaw` then reapplied signs.
  // The prompt: `weights = softmax(raw_weights / T)`. If raw_weights are signed, this is unusual for standard softmax.
  // Let's assume softmax is on magnitudes, then signs are reapplied, similar to v1 logic flow.

  const absRawWeights = rawWeights.map(Math.abs);
  const signs = rawWeights.map(rw => rw === 0 ? 0 : Math.sign(rw)); // preserve sign, handle 0
  
  const pAbsSoftmax = applySoftmax({ rawWeights: absRawWeights, temperatureT: T_used });
  const finalSignedInfluences = pAbsSoftmax.map((p, i) => signs[i] * p);
  
  const gravityScore = finalSignedInfluences.reduce((sum, influence) => sum + influence, 0);
  
  // Update traderSoftmaxWeights to reflect the signed influence based on this interpretation.
  const finalTraderInfluences = traders.map((trader, index) => ({
      name: trader.name,
      // softmaxWeight here should be the final influence value used in gravity score.
      softmaxWeight: finalSignedInfluences[index], 
  }));


  // --- 5. Calculate Average Smart Score ---
  // Simple average for now. Could be weighted by position or other factors if needed.
  const sumSmartScores = traders.reduce((sum, trader) => sum + trader.smartScore, 0);
  const averageSmartScore = numTraders > 0 ? sumSmartScores / numTraders : 0;

  // --- 6. Compute Bayesian Confidence ---
  const bayesianConfidence = computeBayesianConfidence({
    avgSmartScore: averageSmartScore,
    numTraders: numTraders,
    pseudoCountM: bayesianPseudoCountM,
    priorP: bayesianPriorP,
  });

  // --- 7. Apply Confidence Decay ---
  const decayedConfidence = applyConfidenceDecay({
    initialConfidence: bayesianConfidence,
    daysSincePrediction: daysSincePredictionEnMasse,
    halfLifeD: decayHalfLifeD,
  });

  // --- 8. Calibrated Probability via sigmoid (or linear interpolation as in flow) ---
  // The flow diagram shows: Final Calibrated Prob = conf × prob + (1-conf) × 0.5
  // Where `prob` is the probability derived from Gravity Score.
  // Let's derive `intermediateProbability` from `gravityScore` (e.g., (score + 1) / 2 for score in [-1, 1])
  const intermediateProbability = (gravityScore + 1) / 2; // Assumes gravityScore is in [-1, 1]
  // Ensure intermediateProbability is capped [0,1]
  const cappedIntermediateProbability = Math.max(0, Math.min(1, intermediateProbability));

  // --- 9. Final Calibrated Prob = conf × prob + (1-conf) × 0.5 ---
  const finalCalibratedProbability = 
    decayedConfidence * cappedIntermediateProbability + (1 - decayedConfidence) * 0.5;

  // --- 10. Market Edge = Calibrated Prob - Market Prob ---
  const marketEdge = finalCalibratedProbability - marketProbability;

  // --- 11. Compute Bet Size using Volatility-Adjusted Kelly ---
  const kellyPositionSize = calculateVolatilityAdjustedKelly({
    edge: marketEdge,
    impliedVolatility: impliedVolatility,
    marketProbability: marketProbability,
    bankroll: bankroll,
  });
  
  const kellyBetting: KellyBettingV2 = {
      positionSize: kellyPositionSize, // This is the raw size, may need capping/rules
      edge: marketEdge,
      marketProbability: marketProbability,
      impliedVolatility: impliedVolatility,
      bankroll: bankroll,
  };

  // --- 12. Compute Cornish-Fisher Uncertainty Bands (using placeholder) ---
  // For C-F, we need distribution stats of Smart Scores. Let's compute them simply.
  const smartScores = traders.map(t => t.smartScore);
  const meanScore = averageSmartScore; // Already computed
  const stdDevScore = numTraders > 1 
    ? Math.sqrt(smartScores.reduce((sumSqDiff, score) => sumSqDiff + Math.pow(score - meanScore, 2), 0) / (numTraders -1))
    : 0;
  
  // Skewness and Kurtosis calculation (basic moments)
  let skewness = 0;
  let kurtosis = 0; // This will be excess kurtosis

  if (numTraders > 2 && stdDevScore > 0) {
    const m3 = smartScores.reduce((sum, score) => sum + Math.pow(score - meanScore, 3), 0) / numTraders;
    skewness = m3 / Math.pow(stdDevScore, 3);
  }
  if (numTraders > 3 && stdDevScore > 0) {
    const m4 = smartScores.reduce((sum, score) => sum + Math.pow(score - meanScore, 4), 0) / numTraders;
    kurtosis = (m4 / Math.pow(stdDevScore, 4)) - 3; // Excess kurtosis
  }
  
  const distributionStats: SmartScoreDistributionStats = {
      mean: meanScore,
      standardDeviation: stdDevScore,
      skewness: isNaN(skewness) ? 0 : skewness,
      kurtosis: isNaN(kurtosis) ? 0 : kurtosis, // Store excess kurtosis
  };
  //  if (numTraders <= 3) { // Minimal data for higher moments - This logic is now incorporated above
  //    distributionStats.skewness = 0;
  //    distributionStats.kurtosis = 0; // or 3 if it refers to Pearson's
  //  }

  const uncertaintyBands = calculateCornishFisherBands({
    calibratedProbability: finalCalibratedProbability,
    distributionStats: distributionStats
    // No longer need to pass other params here
  });
  
  // --- 13. Assemble Result ---
  
  const preliminaryResult: GravityKellyV2Result = {
    traderRawWeights: traderRawWeights, // These are the signed raw weights before softmax on magnitude
    traderSoftmaxWeights: finalTraderInfluences, // These are the signed influences after softmax on magnitude
    gravityScore: gravityScore,
    
    averageSmartScore: averageSmartScore,
    bayesianConfidence: bayesianConfidence,
    decayedConfidence: decayedConfidence,
    
    intermediateProbability: cappedIntermediateProbability,
    finalCalibratedProbability: finalCalibratedProbability,
    
    marketEdge: marketEdge,
    kellyBetting: kellyBetting,
    
    uncertaintyBands: uncertaintyBands,
    
    inputsUsed: { ...inputs, bankroll, bayesianPseudoCountM, bayesianPriorP, decayHalfLifeD, riskRulesConfig },
    softmaxTemperatureUsed: T_used,
  };

  const riskFilterReport = applyRiskFilters(preliminaryResult, riskRulesConfig);
  
  // Update kellyBetting with the filtered position size
  const finalKellyBetting: KellyBettingV2 = {
      ...preliminaryResult.kellyBetting,
      positionSize: riskFilterReport.finalPositionSize,
  };

  return {
      ...preliminaryResult,
      kellyBetting: finalKellyBetting,
      riskFilterReport: riskFilterReport,
  };
} 