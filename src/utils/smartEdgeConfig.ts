/**
 * Smart Edge Configuration
 * Controls the behavior and formula variations in the Smart Edge calculation engine
 */

export interface SmartEdgeConfig {
  // Calculation mode - classic uses original formulas, advanced uses improved formulas
  useAdvancedMode: boolean;
  
  // Weighting factors
  scoreEmphasisFactor: number;      // Default: 25 (classic) or N/A (advanced)
  pnlScalingFactor: number;         // Default: 1000 (classic) or N/A (advanced)
  entryAdvantageMultiplier: number; // Default: 0.4 (both modes)
  
  // Confidence calculation weights
  smartSkewWeight: number;          // Default: 0.5
  scoreConfidenceWeight: number;    // Default: 0.3  
  concentrationWeight: number;      // Default: 0.2
  
  // Confidence scaling (advanced mode)
  confidenceExponent: number;       // Default: 0.6 (advanced) or 1.0 (classic)
  
  // Kelly criterion settings
  kellyFraction: number;            // Default: 0.25 (quarter Kelly)
  
  // Edge thresholds
  minimumArbitrageEdge: number;     // Default: 0.02 (2%)
  minimumPredictionEdge: number;    // Default: 0.15 (15%) for high confidence
}

// Default classic mode configuration
export const defaultClassicConfig: SmartEdgeConfig = {
  useAdvancedMode: false,
  scoreEmphasisFactor: 25,
  pnlScalingFactor: 1000,
  entryAdvantageMultiplier: 0.4,
  smartSkewWeight: 0.5,
  scoreConfidenceWeight: 0.3,
  concentrationWeight: 0.2,
  confidenceExponent: 1.0,
  kellyFraction: 0.25,
  minimumArbitrageEdge: 0.02,
  minimumPredictionEdge: 0.15
};

// Default advanced mode configuration
export const defaultAdvancedConfig: SmartEdgeConfig = {
  useAdvancedMode: true,
  scoreEmphasisFactor: 25, // Not used in advanced mode but kept for type safety
  pnlScalingFactor: 1000,  // Not used in advanced mode but kept for type safety
  entryAdvantageMultiplier: 0.4,
  smartSkewWeight: 0.5,
  scoreConfidenceWeight: 0.3,
  concentrationWeight: 0.2,
  confidenceExponent: 0.6, // Apply non-linear scaling to confidence
  kellyFraction: 0.25,
  minimumArbitrageEdge: 0.02,
  minimumPredictionEdge: 0.15
};

// Current active configuration
export let activeConfig: SmartEdgeConfig = { ...defaultClassicConfig };

/**
 * Switch between classic and advanced modes
 * @param useAdvanced Whether to use the advanced calculation mode
 */
export function setCalculationMode(useAdvanced: boolean): void {
  activeConfig = useAdvanced ? { ...defaultAdvancedConfig } : { ...defaultClassicConfig };
}

/**
 * Update specific configuration parameters
 * @param updates Partial configuration updates
 */
export function updateConfig(updates: Partial<SmartEdgeConfig>): void {
  activeConfig = { ...activeConfig, ...updates };
}

/**
 * Helper function for advanced PnL scaling (uses logarithmic scaling instead of tanh)
 * @param pnl Profit/loss value
 * @returns Scaled PnL multiplier
 */
export function logPnl(pnl: number = 0): number {
  const sign = Math.sign(pnl);
  const absPnl = Math.abs(pnl);
  
  if (absPnl === 0) return 0;
  
  // Log-scale the PnL for smoother response to large values
  return sign * Math.log10(1 + absPnl / 100) / 2;
}

/**
 * Helper function to clamp a value between min and max
 * @param value The value to clamp
 * @param min Minimum value
 * @param max Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Logistic function for smoother arbitrage edge detection
 * @param x Input value
 * @param k Steepness (default: 20)
 * @param x0 Midpoint (default: 0.02 - minimum edge threshold)
 * @returns Output between 0 and 1
 */
export function logistic(x: number, k: number = 20, x0: number = 0.02): number {
  return 1 / (1 + Math.exp(-k * (x - x0)));
} 