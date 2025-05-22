"use client";

import { useState } from "react";
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
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Link href="/smart-edge">
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
                  <h3 className="font-medium">Advanced Mode</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Improved formulas with logarithmic scaling and smoothed edge detection (now available).
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
              All notable changes to the Smart Edge tool will be documented here.
            </p>
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-lg">May 27, 2025 (v2.1.1 - Current Version)</h3>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>
                    <strong>Advanced Mode Documentation:</strong> Enhanced explanations of the advanced calculation methods:
                    <ul className="list-disc pl-5 space-y-0.5 mt-1">
                      <li>Added detailed explanations of all five formula improvements in the Advanced Mode</li>
                      <li>Included mathematical notation and proper code examples</li>
                      <li>Clarified how negative scores are handled symmetrically in logarithmic scaling</li>
                      <li>Added explanation of PnL dampening factors and their purpose</li>
                      <li>Improved documentation of logistic edge detection with threshold explanation</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Bet Sizing Transparency:</strong> Added collapsible "How Bet Sizing Works" section:
                    <ul className="list-disc pl-5 space-y-0.5 mt-1">
                      <li>Documented confidence-based betting limits (2% for Low, 5% for Medium, 10% for High)</li>
                      <li>Clarified how Kelly criterion and confidence limits work together</li>
                      <li>Explained advanced edge scaling for small edges to prevent overbetting</li>
                    </ul>
                  </li>
                </ul>
                
                <h3 className="font-medium text-lg">May 26, 2025 (v2.1)</h3>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>
                    <strong>Improved UI Clarity:</strong> Added detailed explanations to key input fields:
                    <ul className="list-disc pl-5 space-y-0.5 mt-1">
                      <li>Clarified that "Current Market Price" refers to the YES probability percentage from the market</li>
                      <li>Added context about Bankroll functionality and its relation to bet sizing</li>
                      <li>Enhanced mode toggle with specific guidance on when to use each calculation mode</li>
                    </ul>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-lg">May 25, 2025 (v2.0)</h3>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>
                    <strong>Advanced Mode Release:</strong> Introduced configurable calculation modes. The new Advanced Mode offers improved formulas with:
                    <ul className="list-disc pl-5 space-y-0.5 mt-1">
                      <li>Logarithmic scaling for smart scores to prevent exponential blowout (replacing <code>exp(score/25)</code> with <code>log(1+score)</code>)</li>
                      <li>Better handling of PnL influence with dampened logarithmic scaling for smoother response to large values</li>
                      <li>Thresholded entry price advantage with minimum effect zone (1%) and clamped maximum impact (±5%)</li>
                      <li>Non-linear confidence scaling using power function (<code>rawConfidence^0.6</code>) for better mid-range differentiation</li>
                      <li>Smoothed edge detection using logistic functions to avoid hard thresholds</li>
                      <li>Kelly bet sizing improvements for small edges using <code>edge^1.5</code> scaling to prevent overbetting</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Configuration System:</strong> Created a flexible <code>smartEdgeConfig.ts</code> module that allows toggling between modes while maintaining full backward compatibility with Classic mode.
                  </li>
                  <li>
                    <strong>Toggle UI:</strong> Added a sleek switch UI component to let users toggle between Classic and Advanced modes with explanatory labels and details about each mode's features.
                  </li>
                  <li>
                    <strong>Performance Improvements:</strong> Added position size dampening for large positions to prevent whales from completely dominating the probability calculations.
                  </li>
                  <li>
                    <strong>Technical Implementation:</strong> Created a shadow implementation (<code>calculateSmartEdgeAdvanced.ts</code>) that preserves all original behavior in Classic mode while enabling the new formulas in Advanced mode. This ensures zero risk to existing functionality.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-lg">May 22, 2025</h3>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>
                    <strong>Consolidation & Refinement:</strong> Streamlined calculator versions. The Smart Edge page (`/smart-edge`) is now the primary, most advanced calculator, superseding `vote-gravity-calculator-v1.2`.
                  </li>
                  <li>
                    <strong>Advanced Arbitrage Strategy Live:</strong> Fully integrated the "Advanced Arbitrage Strategy" card on the Smart Edge page. This includes:
                    <ul className="list-disc pl-5 space-y-0.5 mt-1">
                      <li>Selectable Kelly criterion fractions (Conservative 25%, Standard 50%, Aggressive 100%).</li>
                      <li>Calculated take profit (115% of entry) and stop loss (90% of entry) targets.</li>
                      <li>Clear display of recommended direction, edge, and stake.</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Navigation Overhaul:</strong> Corrected all navigation links in the header and on the home page to ensure "Smart Edge" now correctly points to the `/smart-edge` route.
                  </li>
                  <li>
                    <strong>Home Page Redesign:</strong> Implemented a new two-column layout for the home page, featuring organized cards for prediction tools and the Smart Edge suite with enhanced UI/UX.
                  </li>
                  <li>
                    <strong>Bug Fixes & Enhancements:</strong>
                    <ul className="list-disc pl-5 space-y-0.5 mt-1">
                      <li>Fixed React key errors in the trader input table on the Smart Edge page.</li>
                      <li>Resolved HTML nesting error (`&lt;ul&gt;` inside `&lt;p&gt;`) that caused hydration issues on the Smart Edge page.</li>
                      <li>Restored PDF/PNG download functionality and trader visibility toggle (show less/more) to the Smart Edge page.</li>
                      <li>Added "How it works" link from Smart Edge calculator to this info page.</li>
                      <li>Improved visibility of the Advanced Arbitrage Strategy card using borders and conditional messaging.</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Documentation Hub:</strong> This Smart Edge Info page was created to provide comprehensive details on the calculator's inputs, model, output interpretation, and usage strategies.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-lg">May 20, 2025</h3>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Initial beta release of Smart Edge (formerly Vote Gravity v1.2).</li>
                  <li>Core features: conviction-weighted probability, dual edge calculation (prediction and arbitrage), basic betting recommendations.</li>
                  <li>CSV upload/download for trader data.</li>
                </ul>
              </div>

              {/* Add more changelog entries here as the tool evolves */}
            </div>
          </CardContent>
        )}
      </Card>

      <div className="mt-12 text-center">
        {/* ... existing code ... */}
      </div>
    </div>
  );
}