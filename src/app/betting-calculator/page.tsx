"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BettingRulesPopup from "@/components/BettingRulesPopup";
import BettingSettings from "@/components/BettingSettings";
import BettingSimulator from "@/components/BettingSimulator";

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
}

interface BetHistory {
  timestamp: Date;
  betAmount: number;
  outcome: 'win' | 'loss' | null;
  profit: number;
}

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

  function calculateBet() {
    setErrorMessage("");
    setResult(null); // Clear previous results

    const marketCentsNum = parseInt(marketCentsInput);
    if (isNaN(marketCentsNum) || marketCentsNum < 1 || marketCentsNum > 99) {
      setErrorMessage("Market price must be between 1 and 99 cents.");
      return;
    }
    const marketPriceDecimal = marketCentsNum / 100;

    const gravityScoreNum = parseFloat(gravityScoreInput);
    if (isNaN(gravityScoreNum) || gravityScoreNum < -1 || gravityScoreNum > 1) {
      setErrorMessage("Crowd gravity score must be between -1 and 1.");
      return;
    }

    const bankrollVal = parseFloat(bankroll);
    if (isNaN(bankrollVal) || bankrollVal <= 0) {
      setErrorMessage("Bankroll must be greater than 0.");
      return;
    }

    const normalizedCrowdProbability = (gravityScoreNum + 1) / 2;
    let p_calc = normalizedCrowdProbability;
    let marketPrice_calc_internal = marketPriceDecimal;

    if (betType === "no") {
      p_calc = 1 - normalizedCrowdProbability;
      marketPrice_calc_internal = 1 - marketPriceDecimal;
    }

    if (marketPrice_calc_internal <= 0 || marketPrice_calc_internal >= 1) {
      setErrorMessage("Effective market price for calculation is invalid (must be > 0 and < 1). Adjust inputs or bet type.");
      return;
    }

    const payout_ratio_b = (1 - marketPrice_calc_internal) / marketPrice_calc_internal;
    const edge = (p_calc * payout_ratio_b) - (1 - p_calc);
    const isPlusEdge = edge > 0;

    let uncappedKelly = 0;
    if (isPlusEdge && payout_ratio_b !== 0) {
      uncappedKelly = edge / payout_ratio_b;
    }
    uncappedKelly = Math.max(0, uncappedKelly); // Ensure Kelly is not negative

    const safeFractionValue = isPlusEdge ? Math.min(0.25 * uncappedKelly, 0.05) : 0;
    
    let recommendedBetAmount = isPlusEdge ? safeFractionValue * bankrollVal : 0;

    let shouldStopBetting = false;
    if (trackLosses) {
      const totalLoss = betHistory
        .filter(bet => bet.outcome === 'loss')
        .reduce((sum, bet) => sum + bet.profit, 0);
      if (Math.abs(totalLoss) > bankrollVal * (maxLossPercentage / 100)) {
        shouldStopBetting = true;
        recommendedBetAmount = 0; // Override bet if stop loss hit
      }
    }
    
    setResult({
      marketImpliedDecimal: marketPriceDecimal,
      calculatedProbability: p_calc,
      effectiveMarketPrice: marketPrice_calc_internal,
      edge,
      oddsRatioB: payout_ratio_b,
      kellyFraction: uncappedKelly,
      safeBetFraction: safeFractionValue,
      finalBet: recommendedBetAmount,
      isPlusEdge,
    });
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
          />
          <BettingSimulator 
            kellyFraction={kellyFractionMultiplier}
            maxLossPercentage={maxLossPercentage}
            maxBetPercentage={maxBetPercentage}
          />
        </div>
      </div>
      
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
          <Card className={`mt-6 ${result.isPlusEdge ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <CardHeader>
              <CardTitle className={`dark:text-gray-100 ${result.isPlusEdge ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {result.isPlusEdge ? `📈 Positive Edge Bet for ${betType.toUpperCase()}` : '❌ No Edge Detected'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="space-y-1">
                  <p className="text-sm font-medium dark:text-gray-300">Market-Implied Probability (Original):</p>
                  <p className="text-xl font-bold dark:text-gray-200">
                    {(result.marketImpliedDecimal * 100).toFixed(2)}%
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium dark:text-gray-300">Calculated Probability for Bet ({betType.toUpperCase()}):</p>
                  <p className="text-xl font-bold dark:text-gray-200">
                    {(result.calculatedProbability * 100).toFixed(2)}%
                  </p>
                </div>
                
                <div className="space-y-1 md:col-span-2">
                  <p className="text-sm font-medium dark:text-gray-300">Edge:</p>
                  <p className={`text-xl font-bold ${result.isPlusEdge ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {result.isPlusEdge ? `+${(result.edge * 100).toFixed(2)}%` : `${(result.edge * 100).toFixed(2)}%`}
                  </p>
                  {!result.isPlusEdge && <p className="text-sm text-red-600 dark:text-red-400">Do not bet.</p>}
                </div>
                
                {result.isPlusEdge && (
                  <>
                    <div className="space-y-1">
                      <p className="text-sm font-medium dark:text-gray-300">Odds Ratio (b) (for {betType.toUpperCase()} bet):</p>
                      <p className="text-xl font-bold dark:text-gray-200">
                        {result.oddsRatioB.toFixed(2)}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium dark:text-gray-300">Uncapped Kelly Fraction:</p>
                      <p className="text-xl font-bold dark:text-gray-200">
                        {(result.kellyFraction * 100).toFixed(2)}%
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium dark:text-gray-300">Safe Bet Fraction (0.25 * Kelly, max 5%):</p>
                      <p className="text-xl font-bold dark:text-gray-200">
                        {(result.safeBetFraction * 100).toFixed(2)}%
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Info: Configurable Kelly ({kellyFractionMultiplier * 100}% of Kelly, max {maxBetPercentage}%):</p>
                      <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                        {(Math.min(kellyFractionMultiplier * result.kellyFraction, maxBetPercentage / 100) * 100).toFixed(2)}%
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              {result.isPlusEdge ? (
                <div className="pt-4 border-t dark:border-gray-700">
                  <p className="text-lg font-semibold mb-1 dark:text-gray-200">Recommended Bet (using Safe Bet Fraction):</p>
                  <p className="text-3xl font-bold text-center text-blue-600 dark:text-blue-400">
                    ${result.finalBet.toFixed(2)}
                  </p>
                  {result.finalBet > 0 && (
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1">
                      This is {(result.finalBet / parseFloat(bankroll) * 100).toFixed(2)}% of your ${bankroll} bankroll.
                    </p>
                  )}
                  {shouldStopBetting && (
                    <p className="text-red-600 dark:text-red-400 font-bold text-center mt-2">
                      Stop betting! Daily loss limit reached.
                    </p>
                  )}
                </div>
              ) : (
                <div className="pt-4 border-t dark:border-gray-700 text-center">
                  <p className="text-lg font-semibold text-red-600 dark:text-red-400">No bet recommended.</p>
                </div>
              )}
              
              {result.isPlusEdge && result.finalBet > 0 && (
                <div className="flex gap-4 pt-4">
                  <Button 
                    className="w-1/2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800" 
                    onClick={() => recordOutcome('win')}
                  >
                    Record Win
                  </Button>
                  <Button 
                    className="w-1/2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800" 
                    onClick={() => recordOutcome('loss')}
                  >
                    Record Loss
                  </Button>
                </div>
              )}
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