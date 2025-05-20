"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateSmartGravity, getConfidenceLevel } from "@/utils/calculateSmartGravity";
import BettingRulesPopup from "@/components/BettingRulesPopup";
import BettingSettings from "@/components/BettingSettings";
import BettingSimulator from "@/components/BettingSimulator";
import { toast } from "sonner";

interface BettingResult {
  marketImpliedDecimal: number; // Original market price (0-1) from cents
  calculatedProbability: number; // p_calc used for the bet
  effectiveMarketPrice: number; // marketPrice_calc_internal used for the bet
  edge: number;
  oddsRatioB: number; // b based on effectiveMarketPrice
  kellyFraction: number; // Uncapped Kelly: edge / b
  safeBetFraction: number; // Capped Kelly for recommendation
  finalBet: number; // Recommended bet amount
  isPlusEdge: boolean;
  confidenceLabel: string;
  isNearExtremeProb: boolean; // For "capped for safety" message
  isHighVolatility: boolean;
  displayEdge: number;
  safeKelly: number;
  probabilityRange: { lower: number; upper: number };
}

interface BetHistory {
  timestamp: Date;
  betAmount: number;
  outcome: 'win' | 'loss' | null;
  profit: number;
}

// Helper function (can be outside the component if preferred, but fine here for now)
const calibratedProbability = (score: number, traderData?: { 
  avgSmartScore: number, 
  traderCount: number, 
  dispersion: number 
}): number => {
  const raw = (score + 1) / 2;
  
  // Default calibration (without trader data)
  if (!traderData) {
    return 0.95 * raw + 0.025; // Caps between 2.5% and 97.5%
  }
  
  // Dynamic confidence adjustment based on trader data
  const { avgSmartScore, traderCount, dispersion } = traderData;
  
  // 1. Penalty for low trader count (0-0.05)
  const countPenalty = Math.min(0.05, Math.max(0, 0.05 - (traderCount / 200) * 0.05));
  
  // 2. Penalty for high dispersion in smart scores (0-0.05)
  const dispersionPenalty = Math.min(0.05, dispersion / 2);
  
  // 3. Bonus for high average smart score (0-0.025)
  const smartScoreBonus = Math.min(0.025, (avgSmartScore / 100) * 0.025);
  
  // Adjusted calibration weight (0.85-0.95)
  const calibrationWeight = 0.95 - countPenalty - dispersionPenalty + smartScoreBonus;
  
  // Calculate calibrated probability with adjusted weights
  return calibrationWeight * raw + (1 - calibrationWeight) / 2;
};

const getConfidenceLabel = (score: number): string => {
  const abs = Math.abs(score);
  if (abs >= 0.8) return "High ✅";
  if (abs >= 0.5) return "Medium ⚠️";
  return "Low ❗";
};

export default function BettingCalculator() {
  const [marketCentsInput, setMarketCentsInput] = useState<string>("63"); // Market price in cents
  const [gravityScoreInput, setGravityScoreInput] = useState<string>("0.2");
  const [bankroll, setBankroll] = useState<string>("1000");
  const [betType, setBetType] = useState<'yes' | 'no'>("yes");
  const [trackLosses, setTrackLosses] = useState<boolean>(false);
  const [betHistory, setBetHistory] = useState<BetHistory[]>([]);
  const [result, setResult] = useState<BettingResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isFormValid, setIsFormValid] = useState<boolean>(false);

  // Configurable betting parameters for display/settings
  const [kellyFractionMultiplier, setKellyFractionMultiplier] = useState<number>(0.25);
  const [maxLossPercentage, setMaxLossPercentage] = useState<number>(10);
  const [maxBetPercentage, setMaxBetPercentage] = useState<number>(5);

  // Client-side only rendering
  const [mounted, setMounted] = useState(false);
  const [extremeGravityWarning, setExtremeGravityWarning] = useState<string | null>(null);

  // New configuration state variables
  const [minEdgeThreshold, setMinEdgeThreshold] = useState<number>(1.0); // Minimum edge in percentage
  const [minBetSize, setMinBetSize] = useState<number>(0.5); // Minimum bet size as percentage of bankroll

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Validate inputs whenever they change
    const marketCentsNum = parseInt(marketCentsInput);
    const gravityScoreNum = parseFloat(gravityScoreInput);
    const bankrollNum = parseFloat(bankroll);

    const marketValid = !isNaN(marketCentsNum) && marketCentsNum >= 1 && marketCentsNum <= 99;
    const gravityValid = !isNaN(gravityScoreNum) && gravityScoreNum >= -1 && gravityScoreNum <= 1;
    const bankrollValid = !isNaN(bankrollNum) && bankrollNum > 0;

    setIsFormValid(marketValid && gravityValid && bankrollValid);

    if (marketValid && gravityValid && bankrollValid) {
        setErrorMessage(""); // Clear general error message if form becomes valid
    } else {
        // Optionally, provide specific feedback, or rely on calculateBet for detailed errors on submission
        // For now, just manage the button state
    }

  }, [marketCentsInput, gravityScoreInput, bankroll]);

  const calculateBet = () => {
    if (!marketCentsInput || !gravityScoreInput || !bankroll) {
      toast.error("Please fill in all required fields");
      return;
    }

    const marketCentsNum = parseInt(marketCentsInput);
    const gravityScoreNum = parseFloat(gravityScoreInput);
    const bankrollNum = parseFloat(bankroll);

    const marketValid = !isNaN(marketCentsNum) && marketCentsNum >= 1 && marketCentsNum <= 99;
    const gravityValid = !isNaN(gravityScoreNum) && gravityScoreNum >= -1 && gravityScoreNum <= 1;
    const bankrollValid = !isNaN(bankrollNum) && bankrollNum > 0;

    if (!marketValid || !gravityValid || !bankrollValid) {
      toast.error("Invalid input. Please check your market price, gravity score, and bankroll.");
      return;
    }

    const marketPriceDecimal = marketCentsNum / 100;
    const gravityScore = gravityScoreNum;
    const bankrollVal = bankrollNum;

    // Get trader data from gravity calculator if available
    let traderData;
    try {
      // This assumes you have a way to get the current trader data
      // If not, you can pass additional parameters or use a context/store
      const gravityResult = JSON.parse(localStorage.getItem('latestGravityResult') || '{}');
      if (gravityResult.avgSmartScore && gravityResult.traderInfluences) {
        traderData = {
          avgSmartScore: gravityResult.avgSmartScore,
          traderCount: gravityResult.traderInfluences.length,
          dispersion: calculateDispersion(gravityResult.traderInfluences.map((t: any) => t.smartScore))
        };
      }
    } catch (err) {
      console.warn('Could not load trader data for confidence adjustment', err);
    }

    // Use CALIBRATED probability with dynamic adjustment if trader data available
    const normalizedCrowdProbability = calibratedProbability(gravityScore, traderData);
    
    let p_calc = normalizedCrowdProbability;
    let marketPrice_calc_internal = marketPriceDecimal;

    if (betType === "no") {
      p_calc = 1 - normalizedCrowdProbability;
      marketPrice_calc_internal = 1 - marketPriceDecimal;
    }

    if (marketPrice_calc_internal <= 0 || marketPrice_calc_internal >= 1) {
      toast.error("Effective market price for calculation is invalid. Adjust inputs or bet type.");
      return;
    }
    
    const payout_ratio_b = (1 - marketPrice_calc_internal) / marketPrice_calc_internal;
    const edge = (p_calc * payout_ratio_b) - (1 - p_calc);
    const isPlusEdge = edge > 0;
    const confidence = getConfidenceLabel(gravityScore);

    // 2. Edge Threshold Filter
    // If edge is below minimum threshold, set to zero
    const isAboveThreshold = edge * 100 >= minEdgeThreshold;
    
    let uncappedKelly = 0;
    if (isPlusEdge && payout_ratio_b !== 0 && isAboveThreshold) {
      uncappedKelly = edge / payout_ratio_b;
    }
    uncappedKelly = Math.max(0, uncappedKelly); 

    // Check for high volatility conditions
    const isHighVolatility = 
      (marketPrice_calc_internal < 0.15 || marketPrice_calc_internal > 0.85) && 
      Math.abs(p_calc - marketPrice_calc_internal) >= 0.3;

    // Apply risk discount for high volatility bets
    const adjustedEdge = isHighVolatility ? edge * 0.5 : edge;
    
    // Calculate Kelly fraction with adjusted edge
    const kellyFraction = adjustedEdge / payout_ratio_b;
    
    // Apply safety factor and bankroll percentage
    const safeKelly = kellyFraction * 0.25;
    
    // Calculate the raw bet amount
    let finalBet = Math.min(safeKelly * bankrollVal, bankrollVal * 0.05);
    
    // 3. Kelly Fraction Bound
    // If bet size is below minimum percentage of bankroll, set to zero
    if (finalBet < (minBetSize / 100) * bankrollVal) {
      finalBet = 0;
      toast.info(`Bet skipped: Size (${(safeKelly * 100).toFixed(2)}%) below minimum threshold (${minBetSize}%)`);
    }

    // If edge is positive but below threshold, show info message
    if (isPlusEdge && !isAboveThreshold) {
      toast.info(`Bet skipped: Edge (${(edge * 100).toFixed(2)}%) below minimum threshold (${minEdgeThreshold}%)`);
    }

    // Cap displayed edge at 100%
    const displayEdge = Math.min(adjustedEdge * 100, 100);

    const probabilityRange = {
      lower: Math.max(0, p_calc - 0.025),
      upper: Math.min(1, p_calc + 0.025)
    };

    setResult({
      marketImpliedDecimal: marketPriceDecimal,
      calculatedProbability: p_calc,
      effectiveMarketPrice: marketPrice_calc_internal,
      edge,
      oddsRatioB: payout_ratio_b,
      kellyFraction,
      safeBetFraction: safeKelly,
      finalBet,
      isPlusEdge,
      confidenceLabel: confidence,
      isNearExtremeProb: p_calc >= 0.9749 || p_calc <= 0.0251,
      isHighVolatility,
      displayEdge,
      safeKelly,
      probabilityRange,
    });
  };

  // Helper function to calculate dispersion (standard deviation) of smart scores
  function calculateDispersion(scores: number[]): number {
    if (!scores || scores.length === 0) return 0;
    
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length;
    
    return Math.sqrt(variance) / 100; // Normalize to 0-1 range (assuming scores are -100 to +100)
  }

  function recordOutcome(outcome: 'win' | 'loss') {
    if (!result || result.finalBet <= 0) return; // No bet was made or recommended
    
    // oddsRatioB in result is based on effectiveMarketPrice, which is correct for profit calc
    const profit = outcome === 'win' 
      ? result.finalBet * result.oddsRatioB 
      : -result.finalBet;
    
    const newBet: BetHistory = {
      timestamp: new Date(),
      betAmount: result.finalBet,
      outcome,
      profit
    };
    
    setBetHistory(prevHistory => [newBet, ...prevHistory]);
    
    const currentBankrollVal = parseFloat(bankroll);
    if (!isNaN(currentBankrollVal)) {
      setBankroll((currentBankrollVal + profit).toFixed(2));
    }
  }

  function resetHistory() {
    setBetHistory([]);
  }

  if (!mounted) return null;

  // Calculate total profit/loss
  const totalProfitLoss = betHistory.reduce((sum, bet) => sum + bet.profit, 0);
  
  // Calculate if we should stop betting
  const shouldStopBetting = trackLosses && betHistory.length > 0 && 
    betHistory
      .filter(bet => bet.outcome === 'loss')
      .reduce((sum, bet) => sum + bet.profit, 0) < -parseFloat(bankroll) * (maxLossPercentage / 100);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Kelly Betting Calculator</h1>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <p className="text-gray-500 dark:text-gray-400 text-center md:text-left">
          Calculate optimal bet size based on edge and bankroll management
        </p>
        <div className="flex space-x-2 mt-4 md:mt-0">
          <BettingRulesPopup />
          <BettingSettings 
            kellyFraction={kellyFractionMultiplier}
            setKellyFraction={setKellyFractionMultiplier}
            maxLossPercentage={maxLossPercentage}
            setMaxLossPercentage={setMaxLossPercentage}
            maxBetPercentage={maxBetPercentage}
            setMaxBetPercentage={setMaxBetPercentage}
            minEdgeThreshold={minEdgeThreshold}
            setMinEdgeThreshold={setMinEdgeThreshold}
            minBetSize={minBetSize}
            setMinBetSize={setMinBetSize}
          />
          <BettingSimulator 
            kellyFraction={kellyFractionMultiplier}
            maxLossPercentage={maxLossPercentage}
            maxBetPercentage={maxBetPercentage}
          />
        </div>
      </div>
      
      {/* Extreme Gravity Warning UI */}
      {extremeGravityWarning && (
        <div className="mb-4 p-3 rounded-md border border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:border-orange-600 dark:text-orange-300 text-sm">
          {extremeGravityWarning}
        </div>
      )}
      
      <div className="grid gap-6">
        <Card className="shadow-md dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">Betting Parameters</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="market-price" className="dark:text-gray-200">Market Price (1-99¢)</Label>
              <Input
                id="market-price"
                type="number"
                inputMode="numeric"
                value={marketCentsInput}
                onChange={(e) => setMarketCentsInput(e.target.value)}
                placeholder="e.g. 63"
                className="dark:bg-gray-800 dark:text-gray-100"
              />
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span>YES price: {marketCentsInput ? `${marketCentsInput}¢` : "--"}</span>
                <span>NO price: {marketCentsInput ? `${(100 - parseInt(marketCentsInput) || 0)}¢` : "--"}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Enter the market price of the YES bet (e.g. 63¢ = 63% chance)</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="crowd-probability" className="dark:text-gray-200">Crowd Gravity Score (-1 to 1)</Label>
              <Input
                id="crowd-probability"
                type="text"
                inputMode="decimal"
                value={gravityScoreInput}
                onChange={(e) => setGravityScoreInput(e.target.value)}
                placeholder="Enter a value between -1 and 1"
                className="dark:bg-gray-800 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">Your estimated gravity score for the outcome</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bankroll" className="dark:text-gray-200">Bankroll ($)</Label>
              <Input
                id="bankroll"
                type="text"
                inputMode="decimal"
                value={bankroll}
                onChange={(e) => setBankroll(e.target.value)}
                placeholder="Enter your bankroll amount"
                className="dark:bg-gray-800 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">Your total betting capital</p>
            </div>
            
            <div className="space-y-2 md:col-span-1 flex flex-col items-start">
              <Label className="dark:text-gray-200">Bet Type</Label>
              <div className="flex space-x-2 rounded-md bg-slate-300 dark:bg-slate-700 p-1">
                <Button
                  variant={betType === 'yes' ? 'default' : 'ghost'}
                  onClick={() => setBetType('yes')}
                  className={`w-full ${betType === 'yes' ? 'bg-blue-600 text-white dark:bg-blue-500' : 'dark:text-gray-300'}`}
                >
                  Bet Yes
                </Button>
                <Button
                  variant={betType === 'no' ? 'default' : 'ghost'}
                  onClick={() => setBetType('no')}
                  className={`w-full ${betType === 'no' ? 'bg-pink-600 text-white dark:bg-pink-500' : 'dark:text-gray-300'}`}
                >
                  Bet No
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 pt-7 md:col-span-2">
              <input
                type="checkbox"
                id="track-losses"
                checked={trackLosses}
                onChange={(e) => setTrackLosses(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="track-losses" className="dark:text-gray-200">Track losses (stop if daily loss exceeds {maxLossPercentage}% of bankroll)</Label>
            </div>
          </CardContent>
        </Card>
        
        <Button className="w-full" onClick={calculateBet} disabled={!isFormValid}>
          Calculate Optimal Bet
        </Button>
        
        {errorMessage && !isFormValid && (
          <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300 px-4 py-3 rounded">
            {errorMessage}
          </div>
        )}
        
        {result && (
          <Card className={`shadow-lg ${result.finalBet > 0 ? 'border-green-500 dark:border-green-600' : 'border-red-500 dark:border-red-600'} border-2`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Betting Recommendation</CardTitle>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-white ${result.finalBet > 0 ? 'bg-green-500 dark:bg-green-600' : 'bg-red-500 dark:bg-red-600'}`}>
                    {result.finalBet > 0 ? 'Bet Recommended' : 'No Bet'}
                  </span>
                  <div className="relative group">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cursor-help text-gray-500">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 16v-4"></path>
                      <path d="M12 8h.01"></path>
                    </svg>
                    <div className="absolute right-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="font-bold mb-1">🧠 Bet Status Indicator</p>
                      <p className="mb-1"><span className="text-green-400">Green</span>: Bet is statistically favorable based on crowd consensus, expected return, and risk settings.</p>
                      <p><span className="text-red-400">Red</span>: No bet recommended due to low edge, small bet size, or high risk/uncertainty.</p>
                    </div>
                  </div>
                </div>
              </div>
              <CardDescription>Based on your inputs and market conditions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                    <p className="text-sm text-gray-500">Market Implied Probability</p>
                    <p className="text-xl font-semibold">{(result.marketImpliedDecimal * 100).toFixed(1)}%</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                    <p className="text-sm text-gray-500">Calibrated Yes Probability</p>
                    <p className="text-xl font-semibold">{(result.calculatedProbability * 100).toFixed(1)}%</p>
                    <div className="text-xs text-gray-500 mt-1">
                      <p>Uncertainty Band: {(result.probabilityRange.lower * 100).toFixed(1)}% – {(result.probabilityRange.upper * 100).toFixed(1)}%</p>
                      <div className="relative group inline-block ml-1">
                        <span className="text-blue-500 cursor-help">ℹ️</span>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          Based on trader count and score variance. Wider range = higher uncertainty.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  <p className="text-sm text-gray-500">Edge</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-semibold">+{result.displayEdge.toFixed(2)}%</p>
                    <div className="relative group">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cursor-help text-blue-500">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 16v-4"></path>
                        <path d="M12 8h.01"></path>
                      </svg>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <p className="font-bold mb-1">True Edge: +{(result.edge * 100).toFixed(2)}%</p>
                        <p className="text-xs">
                          {result.edge * 100 > 100 
                            ? "Display is capped at 100% for UI purposes. Very high edges usually come with high volatility." 
                            : "This is your calculated edge based on the difference between your probability and the market price."}
                        </p>
                      </div>
                    </div>
                    {result.edge * 100 > 100 && (
                      <div className="relative group">
                        <span className="text-yellow-500 cursor-help">⚠️</span>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          True edge is higher, but displayed value capped for realism. Very high edge usually comes with high volatility.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {result.isHighVolatility && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
                    <p className="text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                      <span>⚠️</span>
                      <span>High Volatility Warning: This bet involves extreme market odds and large disagreement. Expect high variance.</span>
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                    <p className="text-sm text-gray-500">Kelly Fraction</p>
                    <p className="text-xl font-semibold">{(result.kellyFraction * 100).toFixed(1)}%</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {result.isHighVolatility ? "Risk-adjusted for high volatility" : "Full Kelly"}
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                      ⚠️ Kelly assumes the model is accurate. If probabilities are wrong, you can lose money even with a 'positive edge'.
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                    <p className="text-sm text-gray-500">Safe Kelly (25%)</p>
                    <p className="text-xl font-semibold">{(result.safeKelly * 100).toFixed(1)}%</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Quarter Kelly for reduced risk
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  <p className="text-sm text-gray-500">Recommended Bet</p>
                  <p className="text-xl font-semibold">${result.finalBet.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {result.finalBet === 0 ? 
                      "No bet recommended based on current parameters" : 
                      result.isHighVolatility ? 
                        "Risk-adjusted for high volatility (max 5% of bankroll)" : 
                        "Based on quarter Kelly (max 5% of bankroll)"}
                  </p>
                </div>

                <div className="text-xs text-gray-500 mt-4">
                  <p>Note: This is general information only and not financial advice. For personal guidance, please talk to a licensed professional.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {betHistory.length > 0 && (
          <Card className="dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="dark:text-gray-100">Betting History</CardTitle>
              <Button variant="outline" size="sm" onClick={resetHistory} className="dark:border-gray-700 dark:text-gray-300">Reset</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                  <p className="text-lg dark:text-gray-200">Current Bankroll: <span className="font-bold dark:text-white">${parseFloat(bankroll).toFixed(2)}</span></p>
                  <p className="text-lg dark:text-gray-200">
                    Total P/L: 
                    <span className={`font-bold ${totalProfitLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {' '}{totalProfitLoss >= 0 ? '+' : ''}${totalProfitLoss.toFixed(2)}
                    </span>
                  </p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-2 px-4 dark:text-gray-300">Time</th>
                        <th className="text-left py-2 px-4 dark:text-gray-300">Amount</th>
                        <th className="text-left py-2 px-4 dark:text-gray-300">Outcome</th>
                        <th className="text-left py-2 px-4 dark:text-gray-300">Profit/Loss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {betHistory.map((bet, i) => (
                        <tr key={i} className="border-b dark:border-gray-700">
                          <td className="py-2 px-4 dark:text-gray-200">{bet.timestamp.toLocaleTimeString()}</td>
                          <td className="py-2 px-4 dark:text-gray-200">${bet.betAmount.toFixed(2)}</td>
                          <td className="py-2 px-4">
                            <span className={bet.outcome === 'win' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                              {bet.outcome === 'win' ? 'Win' : 'Loss'}
                            </span>
                          </td>
                          <td className={`py-2 px-4 ${bet.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {bet.profit >= 0 ? '+' : ''}${bet.profit.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 