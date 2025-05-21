"use client";

import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function SmartEdgeInfoPage() {
  const [expandedSections, setExpandedSections] = useState({
    model: true,
    output: true,
    strategies: true,
    beta: true,
    changelog: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Head>
        <title>Smart Edge – How It Works</title>
      </Head>

      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Link href="/vote-gravity-calculator-v1.2">
            <Button variant="outline" size="sm">← Back to Calculator</Button>
          </Link>
        </div>
        <h1 className="text-4xl font-bold mt-6 mb-2">🧠 Smart Edge: How It Works & Why It Matters</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          The intelligent prediction and betting edge calculator for prediction markets
        </p>
      </div>

      {/* Introduction */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">Introduction</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-700 dark:text-gray-300 space-y-4">
          <p>
            Smart Edge is an intelligent prediction and betting edge calculator powered by trader data, 
            market dynamics, and performance metrics.
          </p>
          <p>
            It identifies two independent types of edge:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <span className="font-medium text-blue-600 dark:text-blue-400">🎯 Prediction Edge</span> – 
              Based on smart trader consensus
            </li>
            <li>
              <span className="font-medium text-amber-600 dark:text-amber-400">💸 Arbitrage Edge</span> – 
              Based on market mispricing
            </li>
          </ul>
          <p>
            This page explains how it works, what inputs it uses, and how to interpret the results.
          </p>
        </CardContent>
      </Card>

      {/* Inputs Used */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">📥 Inputs</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-700 dark:text-gray-300">
          <h3 className="font-medium text-lg mb-3">Trader Metrics</h3>
          <div className="mb-6 overflow-hidden overflow-x-auto">
            <table className="min-w-full rounded-md">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Input</th>
                  <th className="px-4 py-2 text-left font-medium">Range</th>
                  <th className="px-4 py-2 text-left font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <tr className="bg-white dark:bg-gray-900">
                  <td className="px-4 py-3 font-medium">Sentiment</td>
                  <td className="px-4 py-3">YES or NO</td>
                  <td className="px-4 py-3">What the trader is betting on</td>
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium">Smart Score</td>
                  <td className="px-4 py-3">-100 to +100</td>
                  <td className="px-4 py-3">Trader's accuracy score (higher is better)</td>
                </tr>
                <tr className="bg-white dark:bg-gray-900">
                  <td className="px-4 py-3 font-medium">Position Size</td>
                  <td className="px-4 py-3">$0+</td>
                  <td className="px-4 py-3">Amount of capital the trader has in the market</td>
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium">Entry Price</td>
                  <td className="px-4 py-3">0% to 100%</td>
                  <td className="px-4 py-3">The price at which the trader entered the market</td>
                </tr>
                <tr className="bg-white dark:bg-gray-900">
                  <td className="px-4 py-3 font-medium">Realized PnL</td>
                  <td className="px-4 py-3">Any $ value</td>
                  <td className="px-4 py-3">Closed trade profits</td>
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium">Unrealized PnL</td>
                  <td className="px-4 py-3">Any $ value</td>
                  <td className="px-4 py-3">Paper gains/losses on open trades</td>
                </tr>
                <tr className="bg-white dark:bg-gray-900">
                  <td className="px-4 py-3 font-medium">Supply Ownership</td>
                  <td className="px-4 py-3">0% to 100%</td>
                  <td className="px-4 py-3">Percentage of market held (e.g., 5%)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="font-medium text-lg mb-3">System Inputs</h3>
          <div className="overflow-hidden overflow-x-auto">
            <table className="min-w-full rounded-md">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Input</th>
                  <th className="px-4 py-2 text-left font-medium">Range</th>
                  <th className="px-4 py-2 text-left font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <tr className="bg-white dark:bg-gray-900">
                  <td className="px-4 py-3 font-medium">Market Price</td>
                  <td className="px-4 py-3">0% to 100%</td>
                  <td className="px-4 py-3">Current YES market probability</td>
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium">Bankroll</td>
                  <td className="px-4 py-3">$1+</td>
                  <td className="px-4 py-3">Capital used for sizing optimal bets</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* How the Model Works */}
      <Card className="mb-8">
        <CardHeader className="cursor-pointer" onClick={() => toggleSection('model')}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">🧠 The Smart Edge Model</CardTitle>
            <Button variant="ghost" size="icon">
              {expandedSections.model ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.model && (
          <CardContent className="text-gray-700 dark:text-gray-300 space-y-6">
            <div>
              <h3 className="font-medium text-lg mb-2">1. Trader Selection</h3>
              <p className="mb-2">
                Instead of using an arbitrary number of YES/NO traders, Smart Edge:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Scores all traders based on influence (smartScore × log(positionSize))</li>
                <li>Sorts and selects the top 200 most influential traders</li>
                <li>Applies advanced weighting based on multiple factors</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-lg mb-2">2. Influence Calculation</h3>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md font-mono text-sm overflow-x-auto">
                <pre>
{`// Base weight from exponential score emphasis
scoreWeight = exp(smartScore ÷ 25)

// PnL multiplier - rewards profitable traders
pnlMultiplier = 1 + 0.5 × tanh(realizedPnl ÷ 1000) + 0.5 × tanh(unrealizedPnl ÷ 1000)

// Entry price advantage
entryAdvantage = (marketPrice - entryPrice) ÷ marketPrice
entryMultiplier = 1 + 0.4 × entryAdvantage

// Supply ownership bonus
supplyMultiplier = supplyOwnership ≥ 5% ? 1.2 : 1

// Final weighted influence
influence = dollarPosition × scoreWeight × pnlMultiplier × entryMultiplier × supplyMultiplier`}
                </pre>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-lg mb-2">3. Gravity Score → Probability</h3>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md font-mono text-sm overflow-x-auto">
                <pre>
{`// Calculate the gravity score from all weighted influences
sumWeights = sum of all trader influences
sumAbsWeights = sum of absolute values of influences
gravitySmart = sumWeights ÷ sumAbsWeights

// Convert to probability
rawYesProb = (gravitySmart + 1) ÷ 2`}
                </pre>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-lg mb-2">4. Multi-factor Confidence Calibration</h3>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md font-mono text-sm overflow-x-auto">
                <pre>
{`// Smart capital imbalance
smartSkew = (smartYesCapital - smartNoCapital) ÷ (smartYesCapital + smartNoCapital)
smartSkewConfidence = min(1, |smartSkew|)

// Average smart score quality
scoreConfidence = min(1, avgSmartScore ÷ 100)

// Capital concentration (Herfindahl Index)
herfindahlIndex = sum of (trader capital ÷ total capital)²
concentrationConfidence = min(1, herfindahlIndex × 10)

// Combined confidence factor
confidenceFactor = 0.5 × smartSkewConfidence + 0.3 × scoreConfidence + 0.2 × concentrationConfidence`}
                </pre>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-lg mb-2">5. Calibrated Probability</h3>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md font-mono text-sm overflow-x-auto">
                <pre>
{`// Final calibrated probability
calibratedYesProb = 0.5 + (rawYesProb - 0.5) × confidenceFactor`}
                </pre>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Understanding the Output */}
      <Card className="mb-8">
        <CardHeader className="cursor-pointer" onClick={() => toggleSection('output')}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">🔍 Interpreting the Results</CardTitle>
            <Button variant="ghost" size="icon">
              {expandedSections.output ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.output && (
          <CardContent className="text-gray-700 dark:text-gray-300 space-y-6">
            <div>
              <h3 className="text-lg font-medium text-blue-600 dark:text-blue-400 mb-2">🎯 Prediction Edge</h3>
              <p>
                This reflects the true YES probability based on smart traders. If Smart Edge calculates 64% 
                and the market is at 50%, you have a high-conviction edge. The prediction edge is most 
                valuable when confidence is high.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 mt-2 rounded-md">
                <h4 className="font-medium mb-1">Example:</h4>
                <p>
                  Smart Edge says YES = 65% (with high confidence)<br/>
                  Market price = 50%<br/>
                  <span className="font-medium">→ BUY YES with strong conviction</span>
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-amber-600 dark:text-amber-400 mb-2">💸 Arbitrage Edge</h3>
              <p>
                This reflects a price discrepancy that can be profitable to trade, even if your confidence 
                in the true outcome is low. If Smart Edge says 50% and the market says 80%, that's an 
                overpriced opportunity to sell, regardless of what you think the true probability is.
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 p-3 mt-2 rounded-md">
                <h4 className="font-medium mb-1">Example:</h4>
                <p>
                  Smart Edge says YES = 50% (even with low confidence)<br/>
                  Market price = 80%<br/>
                  <span className="font-medium">→ SELL YES due to mispricing</span>
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">📈 Confidence</h3>
              <p>
                The confidence score tells you how strong the prediction signal is, based on three factors:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><span className="font-medium">Smart Skew</span> (50%) – Imbalance between YES/NO smart capital</li>
                <li><span className="font-medium">Score Quality</span> (30%) – How high the trader smart scores are</li>
                <li><span className="font-medium">Concentration</span> (20%) – Whether capital is diverse or concentrated</li>
              </ul>
              <p className="mt-2">
                Use confidence to adjust bet size and filter out noise. Lower confidence means higher uncertainty.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">💵 Bet Size</h3>
              <p>
                Smart Edge uses a quarter-Kelly strategy based on your bankroll and edge strength:
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 mt-2 rounded-md font-mono text-sm">
                <pre>
{`recommendedBetSize = bankroll × edge × 0.25 × confidenceAdjustment`}
                </pre>
              </div>
              <p className="mt-2">
                This conservative approach prevents overbetting while still capturing edge effectively.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Strategies & Use Cases */}
      <Card className="mb-8">
        <CardHeader className="cursor-pointer" onClick={() => toggleSection('strategies')}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">🎯 How to Use Smart Edge</CardTitle>
            <Button variant="ghost" size="icon">
              {expandedSections.strategies ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.strategies && (
          <CardContent className="text-gray-700 dark:text-gray-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-200 dark:border-blue-800">
                <h3 className="font-medium text-lg text-blue-700 dark:text-blue-300 mb-2">Prediction Mode</h3>
                <p className="mb-2">
                  Bet directionally when confidence and edge are high.
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Prioritize high confidence scores (70%+)</li>
                  <li>Use when substantial edge exists (&gt;5%)</li>
                  <li>Adjust position size to confidence level</li>
                </ul>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-md border border-amber-200 dark:border-amber-800">
                <h3 className="font-medium text-lg text-amber-700 dark:text-amber-300 mb-2">Arbitrage Mode</h3>
                <p className="mb-2">
                  Trade price mispricing even without prediction certainty.
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Works even with lower confidence</li>
                  <li>Pure value betting based on mispricing</li>
                  <li>Set take-profit and stop-loss levels</li>
                </ul>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md border border-green-200 dark:border-green-800">
                <h3 className="font-medium text-lg text-green-700 dark:text-green-300 mb-2">Market-Making</h3>
                <p className="mb-2">
                  Sell overpriced positions, rebuy if price resets.
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Set limit orders at probability extremes</li>
                  <li>Use Smart Edge to identify mispricing ranges</li>
                  <li>Capture spread between true value and market value</li>
                </ul>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md border border-red-200 dark:border-red-800">
                <h3 className="font-medium text-lg text-red-700 dark:text-red-300 mb-2">Risk Management</h3>
                <p className="mb-2">
                  Use low confidence to avoid betting altogether.
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Avoid markets with low confidence scores</li>
                  <li>Reduce position size proportionally to uncertainty</li>
                  <li>Look for correlated markets with higher certainty</li>
                </ul>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Beta Features */}
      <Card className="mb-8">
        <CardHeader className="cursor-pointer" onClick={() => toggleSection('beta')}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">🧪 Coming Soon in Beta</CardTitle>
            <Button variant="ghost" size="icon">
              {expandedSections.beta ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.beta && (
          <CardContent className="text-gray-700 dark:text-gray-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 border rounded-md">
                <div className="text-2xl">📊</div>
                <div>
                  <h3 className="font-medium">Backtesting Module</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Upload previous market data to analyze accuracy, ROI, and optimization opportunities.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 border rounded-md">
                <div className="text-2xl">🧠</div>
                <div>
                  <h3 className="font-medium">Bayesian Trader Weighting</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Advanced statistical methods for cleaner probability estimates.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 border rounded-md">
                <div className="text-2xl">🔍</div>
                <div>
                  <h3 className="font-medium">Trader Filters</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Custom filters to remove noise and bias from the consensus signal.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 border rounded-md">
                <div className="text-2xl">📈</div>
                <div>
                  <h3 className="font-medium">Visual Analytics</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Enhanced visuals for edge and signal breakdowns.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 border rounded-md">
                <div className="text-2xl">🚦</div>
                <div>
                  <h3 className="font-medium">Guardrails</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Smart suppression of low-confidence edges to prevent false positives.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">✅ Summary</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-700 dark:text-gray-300">
          <p className="mb-3">
            Smart Edge gives you a dual approach to market intelligence:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <h3 className="font-medium text-blue-700 dark:text-blue-300">🎯 Prediction Edge</h3>
              <p className="text-sm">Conviction-weighted smart probability</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md">
              <h3 className="font-medium text-amber-700 dark:text-amber-300">💸 Arbitrage Edge</h3>
              <p className="text-sm">Mispricing-based trade opportunity</p>
            </div>
          </div>
          <p>
            Together, they allow you to bet smarter, size more effectively, and avoid noise.
          </p>
        </CardContent>
      </Card>

      {/* Changelog */}
      <Card className="mb-8">
        <CardHeader className="cursor-pointer" onClick={() => toggleSection('changelog')}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">📝 Changelog</CardTitle>
            <Button variant="ghost" size="icon">
              {expandedSections.changelog ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.changelog && (
          <CardContent className="text-gray-700 dark:text-gray-300">
            <p className="mb-4">
              This section tracks major updates and improvements to the Smart Edge system over time.
            </p>
            
            <div className="border-l-4 border-blue-500 pl-4 mb-8">
              <h3 className="text-xl font-medium mb-1">v1.4 – Smart Edge Upgrade</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">May 21, 2025</p>
              
              <ul className="list-disc pl-5 space-y-2">
                <li>🧠 Renamed system to <span className="font-medium">Smart Edge</span></li>
                <li>🔁 Rewrote <span className="font-medium">"How It Works"</span> to reflect true algorithm structure</li>
                <li className="space-y-2">
                  ✅ Added full support for <span className="font-medium">enhanced trader metrics</span>:
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Entry Price</li>
                    <li>Realized PnL</li>
                    <li>Unrealized PnL</li>
                    <li>Supply Ownership</li>
                  </ul>
                </li>
                <li>🔀 Replaced top 100 YES/NO symmetry with <span className="font-medium">influence-based selection</span></li>
                <li>📈 Implemented multi-factor <span className="font-medium">confidence calibration</span></li>
                <li className="space-y-2">
                  🔍 Separated and displayed:
                  <ul className="list-disc pl-5 space-y-1">
                    <li>🎯 Prediction Edge</li>
                    <li>💸 Arbitrage Edge</li>
                  </ul>
                </li>
                <li>💵 Added <span className="font-medium">conservative Kelly-based bet sizing</span></li>
                <li className="space-y-2">
                  ✅ Created <span className="font-medium">Arbitrage Strategy Module</span> with:
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Entry threshold</li>
                    <li>Stake sizing</li>
                    <li>Take-profit and stop-loss targets</li>
                  </ul>
                </li>
                <li>🖥️ Enhanced trader table UI with expandable <span className="font-medium">Advanced Inputs</span></li>
                <li>✅ Added user-friendly <span className="font-medium">inputs guide</span> to info page</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="text-xl font-medium mb-1">Upcoming in v1.5 Beta</h3>
              
              <ul className="list-disc pl-5 space-y-2">
                <li>🧪 <span className="font-medium">Backtest module</span> (upload CSV, track ROI & accuracy)</li>
                <li>🧠 <span className="font-medium">Bayesian probability update engine</span></li>
                <li>🧹 <span className="font-medium">Noise suppression filters</span> for low-quality traders</li>
                <li>📊 <span className="font-medium">Visual analytics</span> (edge sources, signal graphs)</li>
                <li>🚦 <span className="font-medium">UX guardrails</span> for low-confidence warnings</li>
              </ul>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
} 