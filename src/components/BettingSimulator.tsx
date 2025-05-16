"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogTrigger, 
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BettingSimulatorProps {
  kellyFraction: number;
  maxLossPercentage: number;
  maxBetPercentage: number;
}

interface SimulationResult {
  totalBets: number;
  winRate: number;
  finalBankroll: number;
  peakBankroll: number;
  maxDrawdown: number;
  profitFactor: number;
  roi: number;
  totalProfit: number;
}

export default function BettingSimulator({
  kellyFraction,
  maxLossPercentage,
  maxBetPercentage
}: BettingSimulatorProps) {
  const [marketPrice, setMarketPrice] = useState<string>("0.5");
  const [crowdProb, setCrowdProb] = useState<string>("0.6");
  const [winRate, setWinRate] = useState<string>("0.6");
  const [startingBankroll, setStartingBankroll] = useState<string>("1000");
  const [numSimulations, setNumSimulations] = useState<string>("100");
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runSimulation = () => {
    setIsLoading(true);
    
    const marketPriceVal = parseFloat(marketPrice);
    const crowdProbVal = parseFloat(crowdProb);
    const winRateVal = parseFloat(winRate);
    const bankrollVal = parseFloat(startingBankroll);
    const simCount = parseInt(numSimulations);
    
    if (
      isNaN(marketPriceVal) || isNaN(crowdProbVal) || isNaN(winRateVal) || 
      isNaN(bankrollVal) || isNaN(simCount) || 
      marketPriceVal <= 0 || marketPriceVal >= 1 ||
      crowdProbVal <= 0 || crowdProbVal >= 1 ||
      winRateVal <= 0 || winRateVal >= 1 ||
      bankrollVal <= 0 || simCount <= 0
    ) {
      setIsLoading(false);
      return;
    }

    // Run simulation in setTimeout to not block UI
    setTimeout(() => {
      const results = simulateBettingStrategy(
        marketPriceVal,
        crowdProbVal,
        winRateVal,
        bankrollVal,
        simCount,
        kellyFraction,
        maxLossPercentage / 100,
        maxBetPercentage / 100
      );
      
      setSimResult(results);
      setIsLoading(false);
    }, 50);
  };

  function simulateBettingStrategy(
    marketPrice: number,
    crowdProb: number,
    actualWinRate: number,
    startingBankroll: number,
    numSimulations: number,
    kellyFraction: number,
    maxLossPercentage: number,
    maxBetPercentage: number
  ): SimulationResult {
    // Prepare aggregated results
    let totalFinalBankroll = 0;
    let totalPeakBankroll = 0;
    let totalMaxDrawdown = 0;
    let totalWins = 0;
    let totalBets = 0;
    let totalProfit = 0;
    let totalLoss = 0;
    
    // Run multiple simulations
    for (let sim = 0; sim < numSimulations; sim++) {
      let bankroll = startingBankroll;
      let peakBankroll = startingBankroll;
      let maxDrawdown = 0;
      let dailyLoss = 0;
      let wins = 0;
      let bets = 0;
      let profitSum = 0;
      let lossSum = 0;
      
      // Simulate 100 betting rounds
      for (let i = 0; i < 100; i++) {
        // Calculate expected value & Kelly bet
        const expectedValue = crowdProb * (1 - marketPrice) - (1 - crowdProb) * marketPrice;
        
        // Skip if negative EV
        if (expectedValue <= 0) continue;
        
        // Calculate Kelly fraction
        const oddsRatio = (1 - marketPrice) / marketPrice;
        const fullKelly = ((oddsRatio * crowdProb) - (1 - crowdProb)) / oddsRatio;
        let betFraction = fullKelly * kellyFraction;
        
        // Apply max bet size limit
        betFraction = Math.min(betFraction, maxBetPercentage);
        
        // Check daily loss limit
        if (Math.abs(dailyLoss) > startingBankroll * maxLossPercentage) {
          // Reset for next day
          dailyLoss = 0;
          continue;
        }
        
        const betAmount = bankroll * betFraction;
        bets++;
        
        // Determine outcome (random based on actual win rate)
        const isWin = Math.random() < actualWinRate;
        
        // Update bankroll and stats
        if (isWin) {
          const profit = betAmount * oddsRatio;
          bankroll += profit;
          profitSum += profit;
          wins++;
          
          if (bankroll > peakBankroll) {
            peakBankroll = bankroll;
          }
        } else {
          bankroll -= betAmount;
          lossSum += betAmount;
          dailyLoss += betAmount;
          
          // Track drawdown
          const drawdown = (peakBankroll - bankroll) / peakBankroll;
          if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
          }
        }
        
        // Break if bankrupt
        if (bankroll <= 0) {
          break;
        }
      }
      
      // Aggregate results
      totalFinalBankroll += bankroll;
      totalPeakBankroll += peakBankroll;
      totalMaxDrawdown += maxDrawdown;
      totalWins += wins;
      totalBets += bets;
      totalProfit += profitSum;
      totalLoss += lossSum;
    }
    
    // Calculate averages
    const avgFinalBankroll = totalFinalBankroll / numSimulations;
    const avgPeakBankroll = totalPeakBankroll / numSimulations;
    const avgMaxDrawdown = totalMaxDrawdown / numSimulations;
    const avgWinRate = totalBets > 0 ? totalWins / totalBets : 0;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;
    const roi = (avgFinalBankroll - startingBankroll) / startingBankroll;
    
    return {
      totalBets: Math.round(totalBets / numSimulations),
      winRate: avgWinRate,
      finalBankroll: avgFinalBankroll,
      peakBankroll: avgPeakBankroll,
      maxDrawdown: avgMaxDrawdown,
      profitFactor,
      roi,
      totalProfit: avgFinalBankroll - startingBankroll
    };
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <PlayCircle className="h-4 w-4" /> Simulate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Betting Strategy Simulator</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="market-price">Market Price</Label>
              <Input
                id="market-price"
                type="text"
                inputMode="decimal"
                value={marketPrice}
                onChange={(e) => setMarketPrice(e.target.value)}
                placeholder="0.5"
                className="dark:bg-gray-800"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="crowd-prob">Your Probability Estimate</Label>
              <Input
                id="crowd-prob"
                type="text"
                inputMode="decimal"
                value={crowdProb}
                onChange={(e) => setCrowdProb(e.target.value)}
                placeholder="0.6"
                className="dark:bg-gray-800"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="win-rate">Actual Win Rate</Label>
              <Input
                id="win-rate"
                type="text"
                inputMode="decimal"
                value={winRate}
                onChange={(e) => setWinRate(e.target.value)}
                placeholder="0.6"
                className="dark:bg-gray-800"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This simulates the actual outcomes (may differ from your estimate)
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="starting-bankroll">Starting Bankroll</Label>
              <Input
                id="starting-bankroll"
                type="text"
                inputMode="decimal"
                value={startingBankroll}
                onChange={(e) => setStartingBankroll(e.target.value)}
                placeholder="1000"
                className="dark:bg-gray-800"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="num-simulations">Number of Simulations</Label>
              <Input
                id="num-simulations"
                type="text"
                inputMode="decimal"
                value={numSimulations}
                onChange={(e) => setNumSimulations(e.target.value)}
                placeholder="100"
                className="dark:bg-gray-800"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Higher number = more accurate results, but slower
              </p>
            </div>
            
            <div className="space-y-2 pt-2">
              <Button 
                onClick={runSimulation} 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Running Simulation..." : "Run Simulation"}
              </Button>
            </div>
          </div>
        </div>
        
        {simResult && (
          <Card className="mt-4 dark:bg-gray-900">
            <CardHeader>
              <CardTitle>Simulation Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Final Bankroll</p>
                  <p className="text-xl font-bold">
                    ${simResult.finalBankroll.toFixed(2)}
                  </p>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Profit</p>
                  <p className={`text-xl font-bold ${simResult.totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {simResult.totalProfit >= 0 ? '+' : ''}{simResult.totalProfit.toFixed(2)}
                  </p>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                  <p className="text-sm text-gray-500 dark:text-gray-400">ROI</p>
                  <p className={`text-xl font-bold ${simResult.roi >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {(simResult.roi * 100).toFixed(2)}%
                  </p>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Win Rate</p>
                  <p className="text-xl font-bold">
                    {(simResult.winRate * 100).toFixed(2)}%
                  </p>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Bets</p>
                  <p className="text-xl font-bold">
                    {simResult.totalBets}
                  </p>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Peak Bankroll</p>
                  <p className="text-xl font-bold">
                    ${simResult.peakBankroll.toFixed(2)}
                  </p>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Max Drawdown</p>
                  <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                    {(simResult.maxDrawdown * 100).toFixed(2)}%
                  </p>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Profit Factor</p>
                  <p className="text-xl font-bold">
                    {simResult.profitFactor.toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <p className="text-sm">
                  <strong>Settings used:</strong> {kellyFraction}x Kelly, {maxBetPercentage}% max bet, {maxLossPercentage}% daily stop-loss
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
} 