"use client";

import { useState } from "react";
import {
  calculateGravityKellyV2,
  type Trader,
  type GravityKellyV2Input,
  type GravityKellyV2Result,
} from "../../utils/vote-gravity-calculator-v2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Trash2, PlusCircle, AlertCircle, Loader2 } from "lucide-react";

// Example Trader Sets for quick population
const EXAMPLE_YES_TRADERS: Trader[] = [
  { name: "YesAlpha", sentiment: "yes", smartScore: 82, dollarPosition: 1200 },
  { name: "YesBeta", sentiment: "yes", smartScore: 75, dollarPosition: 800 },
  { name: "YesGamma", sentiment: "yes", smartScore: 88, dollarPosition: 2000 },
];

const EXAMPLE_NO_TRADERS: Trader[] = [
  { name: "NoDelta", sentiment: "no", smartScore: 78, dollarPosition: 900 },
  { name: "NoEpsilon", sentiment: "no", smartScore: 68, dollarPosition: 1500 },
  { name: "NoZeta", sentiment: "no", smartScore: 81, dollarPosition: 700 },
];

export default function VoteGravityV2Display() {
  // State for individual trader inputs
  const [currentTraderName, setCurrentTraderName] = useState<string>("");
  const [currentTraderSentiment, setCurrentTraderSentiment] = useState<"yes" | "no">("yes");
  const [currentTraderSmartScore, setCurrentTraderSmartScore] = useState<string>("");
  const [currentTraderDollarPosition, setCurrentTraderDollarPosition] = useState<string>("");

  // State for the list of traders
  const [traders, setTraders] = useState<Trader[]>([]);

  // State for global market parameters
  const [marketPrice, setMarketPrice] = useState<string>("50");
  const [bankroll, setBankroll] = useState<string>("100");
  const [impliedVolatility, setImpliedVolatility] = useState<string>("0.3");
  const [daysSincePrediction, setDaysSincePrediction] = useState<string>("0");

  // Optional parameters
  const [bayesianPseudoCountM, setBayesianPseudoCountM] = useState<string>("");
  const [bayesianPriorP, setBayesianPriorP] = useState<string>("");
  const [decayHalfLifeD, setDecayHalfLifeD] = useState<string>("");

  // State for results and errors
  const [result, setResult] = useState<GravityKellyV2Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // State for risk filters
  const [minConfidence, setMinConfidence] = useState<string>(""); // e.g. "0.3"
  const [minEdge, setMinEdge] = useState<string>(""); // e.g. "0.05"
  const [maxPositionSizePct, setMaxPositionSizePct] = useState<string>(""); // e.g. "0.05" for 5%

  const handleAddTrader = () => {
    setError(null);
    const smartScoreNum = parseFloat(currentTraderSmartScore);
    const dollarPositionNum = parseFloat(currentTraderDollarPosition);

    if (isNaN(smartScoreNum)) {
      setError("Trader Smart Score must be a valid number.");
      return;
    }
    if (smartScoreNum < 0 || smartScoreNum > 100) {
      setError("Trader Smart Score must be between 0 and 100.");
      return;
    }
    if (isNaN(dollarPositionNum) || dollarPositionNum <=0) {
      setError("Trader Dollar Position must be a positive number.");
      return;
    }

    const newTrader: Trader = {
      name: currentTraderName.trim() || undefined,
      sentiment: currentTraderSentiment,
      smartScore: smartScoreNum,
      dollarPosition: dollarPositionNum,
    };
    setTraders([...traders, newTrader]);
    setCurrentTraderName("");
    setCurrentTraderSentiment("yes");
    setCurrentTraderSmartScore("");
    setCurrentTraderDollarPosition("");
  };

  const handleAddExampleYesTraders = () => {
    setTraders(prevTraders => [...prevTraders, ...EXAMPLE_YES_TRADERS.map(t => ({...t}))]); // Add copies to avoid issues if these constants were mutable
  };

  const handleAddExampleNoTraders = () => {
    setTraders(prevTraders => [...prevTraders, ...EXAMPLE_NO_TRADERS.map(t => ({...t}))]);
  };

  const handleRemoveTrader = (index: number) => {
    setTraders(traders.filter((_, i) => i !== index));
  };

  const removeZeroScoreTraders = () => {
    const filteredTraders = traders.filter(trader => trader.smartScore !== 0);
    if (traders.length === filteredTraders.length) {
      // No traders with zero scores found
      alert("No traders with zero smart scores found");
      return;
    }
    const removedCount = traders.length - filteredTraders.length;
    setTraders(filteredTraders);
    alert(`Removed ${removedCount} trader${removedCount > 1 ? 's' : ''} with zero smart scores`);
  };

  const handleCalculate = async () => {
    setError(null);
    setResult(null);
    setIsLoading(true);

    const marketPriceNum = parseFloat(marketPrice);
    if (isNaN(marketPriceNum) || marketPriceNum < 0 || marketPriceNum > 100) {
      setError("Market Price must be a number between 0 and 100.");
      return;
    }

    const impliedVolatilityNum = parseFloat(impliedVolatility);
    if (isNaN(impliedVolatilityNum) || impliedVolatilityNum <= 0) {
      setError("Implied Volatility must be a positive number.");
      return;
    }
    
    const daysSincePredictionNum = parseInt(daysSincePrediction, 10);
    if (isNaN(daysSincePredictionNum) || daysSincePredictionNum < 0) {
      setError("Days Since Prediction must be a non-negative integer.");
      return;
    }

    let bankrollVal: number | undefined = undefined;
    if (bankroll.trim() !== "") {
        bankrollVal = parseFloat(bankroll);
        if (isNaN(bankrollVal)) { setError("Bankroll is not a valid number."); return; }
        if (bankrollVal <= 0) { setError("Bankroll must be a positive number."); return; }
    }

    let bPCM_Val: number | undefined = undefined;
    if (bayesianPseudoCountM.trim() !== "") {
        bPCM_Val = parseFloat(bayesianPseudoCountM);
        if (isNaN(bPCM_Val)) { setError("Bayesian Pseudo Count M is not a valid number."); return; }
        if (bPCM_Val <= 0) { setError("Bayesian Pseudo Count M must be positive."); return; }
    }

    let bPP_Val: number | undefined = undefined;
    if (bayesianPriorP.trim() !== "") {
        bPP_Val = parseFloat(bayesianPriorP);
        if (isNaN(bPP_Val)) { setError("Bayesian Prior P is not a valid number."); return; }
        if (bPP_Val < 0 || bPP_Val > 1) { setError("Bayesian Prior P must be between 0 and 1."); return; }
    }

    let dHLD_Val: number | undefined = undefined;
    if (decayHalfLifeD.trim() !== "") {
        dHLD_Val = parseFloat(decayHalfLifeD);
        if (isNaN(dHLD_Val)) { setError("Decay Half-Life D is not a valid number."); return; }
        if (dHLD_Val <= 0) { setError("Decay Half-Life D must be positive."); return; }
    }
    
    // Parse Risk Filter Inputs
    let minConfidenceVal: number | undefined = undefined;
    if (minConfidence.trim() !== "") {
      minConfidenceVal = parseFloat(minConfidence);
      if (isNaN(minConfidenceVal) || minConfidenceVal < 0 || minConfidenceVal > 1) {
        setError("Min Confidence must be a number between 0 and 1.");
        setIsLoading(false);
        return;
      }
    }

    let minEdgeVal: number | undefined = undefined;
    if (minEdge.trim() !== "") {
      minEdgeVal = parseFloat(minEdge);
      if (isNaN(minEdgeVal) || minEdgeVal < 0) {
        setError("Min Edge must be a non-negative number.");
        setIsLoading(false);
        return;
      }
    }

    let maxPositionSizePctVal: number | undefined = undefined;
    if (maxPositionSizePct.trim() !== "") {
      maxPositionSizePctVal = parseFloat(maxPositionSizePct);
      if (isNaN(maxPositionSizePctVal) || maxPositionSizePctVal <= 0 || maxPositionSizePctVal > 1) {
        setError("Max Position Size Pct must be a number between 0 (exclusive) and 1 (inclusive).");
        setIsLoading(false);
        return;
      }
    }

    const riskConfig: GravityKellyV2Input['riskRulesConfig'] = {
      minConfidence: minConfidenceVal,
      minEdge: minEdgeVal,
      maxPositionSizePct: maxPositionSizePctVal,
    };
    
    const inputs: GravityKellyV2Input = {
      traders,
      marketPrice: marketPriceNum,
      bankroll: bankrollVal,
      impliedVolatility: impliedVolatilityNum,
      daysSincePredictionEnMasse: daysSincePredictionNum,
      bayesianPseudoCountM: bPCM_Val,
      bayesianPriorP: bPP_Val,
      decayHalfLifeD: dHLD_Val,
      riskRulesConfig: riskConfig,
    };

    try {
      const calculationResult = await calculateGravityKellyV2(inputs);
      setResult(calculationResult);
    } catch (e: any) {
      setError(`Calculation error: ${e.message || 'Unknown error'}`);
      console.error("Calculation Error:", e);
    }
    setIsLoading(false);
  };

  return (
    <div className="p-4 border rounded-lg h-full flex flex-col" suppressHydrationWarning={true}>
      <h2 className="text-xl font-semibold mb-4 text-center">Vote Gravity Calculator (V2)</h2>

      <Card className="mb-6">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="how-it-works">
            <AccordionTrigger className="px-6 py-4 text-lg font-semibold">
              How This Calculator Works & Input Guide
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4 text-sm text-muted-foreground space-y-6">
              <p className="italic">
                This calculator processes trader data and market parameters through several steps to produce a calibrated probability and a suggested Kelly betting position size. Below is a guide to the inputs and a summary of the calculation flow.
              </p>

              {/* Input Explanations */}
              <h3 className="text-md font-semibold text-card-foreground pt-2">Understanding the Inputs:</h3>

              <Accordion type="multiple" className="w-full space-y-2">
                <AccordionItem value="market-params-guide">
                  <AccordionTrigger className="text-sm font-medium hover:no-underline bg-muted/50 px-4 py-2 rounded-md">Market Parameters</AccordionTrigger>
                  <AccordionContent className="pt-3 px-2 space-y-2">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="text-left">
                          <th className="border p-2 font-semibold">Field</th>
                          <th className="border p-2 font-semibold">What It Means</th>
                          <th className="border p-2 font-semibold">What You Should Put</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border p-2"><strong>Market Price (0-100)</strong></td>
                          <td className="border p-2">Current % chance the market gives</td>
                          <td className="border p-2">Use actual market % (e.g. 50, 63)</td>
                        </tr>
                        <tr>
                          <td className="border p-2"><strong>Bankroll</strong></td>
                          <td className="border p-2">Your total capital</td>
                          <td className="border p-2">Leave at 100 if unsure, or your specific bankroll for this market.</td>
                        </tr>
                        <tr>
                          <td className="border p-2"><strong>Implied Volatility</strong></td>
                          <td className="border p-2">How risky/volatile this kind of prediction is</td>
                          <td className="border p-2">Use 0.2 (low risk/vol) to 0.4 (high risk/vol); 0.3 is a good default.</td>
                        </tr>
                        <tr>
                          <td className="border p-2"><strong>Days Since Prediction</strong></td>
                          <td className="border p-2">How old the trader opinions are</td>
                          <td className="border p-2">0 if fresh; 7 if a week ago; use higher for stale opinions.</td>
                        </tr>
                      </tbody>
                    </table>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="tuning-params-guide">
                  <AccordionTrigger className="text-sm font-medium hover:no-underline bg-muted/50 px-4 py-2 rounded-md">Optional Tuning Parameters</AccordionTrigger>
                  <AccordionContent className="pt-3 px-2 space-y-2">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="text-left">
                          <th className="border p-2 font-semibold">Field</th>
                          <th className="border p-2 font-semibold">What It Means</th>
                          <th className="border p-2 font-semibold">What to Use</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border p-2"><strong>Bayesian Pseudo Count (m)</strong></td>
                          <td className="border p-2">How heavily you weight your prior belief in trader expertise</td>
                          <td className="border p-2">10 is good default. Lower (e.g., 5) trusts new trader data faster; higher (e.g., 20) relies more on the prior.</td>
                        </tr>
                        <tr>
                          <td className="border p-2"><strong>Bayesian Prior (p)</strong></td>
                          <td className="border p-2">Your neutral prior belief about a trader's Smart Score</td>
                          <td className="border p-2">0.5 = neutral (calibrates towards 50% Smart Score if no data). Use this unless you have a reason to bias.</td>
                        </tr>
                        <tr>
                          <td className="border p-2"><strong>Decay Half-Life (d)</strong></td>
                          <td className="border p-2">How quickly predictions lose informational value</td>
                          <td className="border p-2">30 is a good default. (Note: current formula means confidence is ~37% of initial after 'd' days, not exactly 50%).</td>
                        </tr>
                        <tr>
                          <td className="border p-2"><strong>Softmax Temperature (T)</strong></td>
                          <td className="border p-2">How much the system listens to dominant traders vs. all traders</td>
                          <td className="border p-2">This is now auto-optimized (see calculation flow). A value around 1.0-1.5 is typical.</td>
                        </tr>
                      </tbody>
                    </table>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="traders-guide">
                  <AccordionTrigger className="text-sm font-medium hover:no-underline bg-muted/50 px-4 py-2 rounded-md">Traders Section</AccordionTrigger>
                  <AccordionContent className="pt-3 px-2 space-y-2">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="text-left">
                          <th className="border p-2 font-semibold">Field</th>
                          <th className="border p-2 font-semibold">Meaning</th>
                          <th className="border p-2 font-semibold">Tip</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border p-2">Name</td>
                          <td className="border p-2">Optional identifier</td>
                          <td className="border p-2">Just to label your traders.</td>
                        </tr>
                        <tr>
                          <td className="border p-2">Sentiment</td>
                          <td className="border p-2">Yes or No</td>
                          <td className="border p-2">What the trader believes will happen.</td>
                        </tr>
                        <tr>
                          <td className="border p-2">Smart Score</td>
                          <td className="border p-2">0–100, trader's historical accuracy/expertise</td>
                          <td className="border p-2">70+ suggests a reliable trader. This heavily influences their weight.</td>
                        </tr>
                        <tr>
                          <td className="border p-2">Dollar Position</td>
                          <td className="border p-2">How much they're betting (conviction)</td>
                          <td className="border p-2">Use raw $ amounts. E.g., $1000 = strong conviction, $100 = smaller bet.</td>
                        </tr>
                      </tbody>
                    </table>
                  </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="example-setup-guide">
                  <AccordionTrigger className="text-sm font-medium hover:no-underline bg-muted/50 px-4 py-2 rounded-md">Example Setup: Political Market</AccordionTrigger>
                  <AccordionContent className="pt-3 px-2 space-y-3">
                    <p className="text-xs">Suppose you're looking at a bet like: <em>"Will Candidate A win the election?"</em></p>
                    <h4 className="text-xs font-semibold mt-1">Market & Tuning Parameters:</h4>
                    <ul className="list-disc list-inside text-xs pl-2 space-y-0.5">
                        <li>Market Price: 48%</li>
                        <li>Bankroll: 100 (or your specific amount)</li>
                        <li>Implied Volatility: 0.3</li>
                        <li>Days Since Prediction: 0 (fresh data)</li>
                        <li>Bayesian Pseudo Count M: 10</li>
                        <li>Bayesian Prior P: 0.5</li>
                        <li>Decay Half-Life D: 30</li>
                        <li>(Softmax T will be auto-calculated)</li>
                    </ul>
                     <h4 className="text-xs font-semibold mt-2">Traders:</h4>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="text-left">
                          <th className="border p-1">Name</th>
                          <th className="border p-1">Sentiment</th>
                          <th className="border p-1">Smart Score</th>
                          <th className="border p-1">Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td className="border p-1">Alice</td><td className="border p-1">Yes</td><td className="border p-1">90</td><td className="border p-1">$500</td></tr>
                        <tr><td className="border p-1">Bob</td><td className="border p-1">No</td><td className="border p-1">70</td><td className="border p-1">$200</td></tr>
                        <tr><td className="border p-1">Eve</td><td className="border p-1">Yes</td><td className="border p-1">60</td><td className="border p-1">$800</td></tr>
                      </tbody>
                    </table>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <h3 className="text-md font-semibold text-card-foreground pt-4">Calculation Flow Summary:</h3>
              <ol className="list-decimal list-inside space-y-2 text-xs">
                <li>Trader Raw Weight Calculation: Each trader is assigned a raw weight based on their: Sentiment, Smart Score, and Dollar Position.</li>
                <li>Softmax Normalization: The absolute values of these raw weights are normalized using a Softmax function, which incorporates a Temperature (T) parameter. This converts weights into proportional influences. The original signs are then reapplied.</li>
                <li>Gravity Score: The signed, softmax-scaled influences from all traders are summed up to produce the Gravity Score. This score (typically between -1 and +1) represents the overall weighted sentiment of the group.</li>
                <li>Bayesian Confidence: A confidence score is calculated using a Bayesian approach, considering: Average Smart Score of traders, Number of traders, A pseudo-count (weight of the prior belief), and A prior probability (e.g., 0.5 for neutral).</li>
                <li>Confidence Decay: The Bayesian confidence is then decayed based on the age of the predictions (Days Since Prediction En Masse) and a specified half-life period, making older data less impactful.</li>
                <li>Calibrated Probability: The Gravity Score is first mapped to an intermediate probability (e.g., (Gravity Score + 1) / 2). This intermediate probability is then blended with a neutral 0.5 probability, weighted by the decayed confidence. High confidence leans towards the gravity-derived probability; low confidence leans towards 0.5.</li>
                <li>Market Edge: The difference between this Final Calibrated Probability and the input Market Probability.</li>
                <li>Volatility-Adjusted Kelly Bet Size: Finally, a position size is suggested using the Kelly Criterion, adjusted for the Market Edge, Implied Volatility, Market Probability, and your Bankroll.</li>
                <li>Uncertainty Bands: Placeholder bands are calculated around the final probability. (Note: A full Cornish-Fisher implementation for more precise, potentially asymmetric bands is not yet in place).</li>
              </ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      {/* Error display */}
      {error && (
        <Card className="mb-6 bg-destructive/10 border-destructive">
          <CardHeader>
            <div className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <CardTitle className="text-lg">Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Market Parameters and Optional Tuning Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6" suppressHydrationWarning={true}>
        <Card>
          <CardHeader>
            <CardTitle>Market Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4" suppressHydrationWarning={true}>
            <div className="space-y-1">
              <Label htmlFor="v2MarketPrice">Market Price (0-100)</Label>
              <Input id="v2MarketPrice" type="number" value={marketPrice} onChange={(e) => setMarketPrice(e.target.value)} placeholder="e.g., 50" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="v2Bankroll">Bankroll (optional, default: 100)</Label>
              <Input id="v2Bankroll" type="number" value={bankroll} onChange={(e) => setBankroll(e.target.value)} placeholder="e.g., 100" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="v2ImpliedVolatility">Implied Volatility (e.g., 0.3)</Label>
              <Input id="v2ImpliedVolatility" type="number" step="0.01" value={impliedVolatility} onChange={(e) => setImpliedVolatility(e.target.value)} placeholder="e.g., 0.3" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="v2DaysSincePrediction">Days Since Prediction</Label>
              <Input id="v2DaysSincePrediction" type="number" value={daysSincePrediction} onChange={(e) => setDaysSincePrediction(e.target.value)} placeholder="e.g., 0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Optional Tuning Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4" suppressHydrationWarning={true}>
            <div className="space-y-1">
              <Label htmlFor="v2BayesianPseudoCountM">Bayesian Pseudo Count M (def: 10)</Label>
              <Input id="v2BayesianPseudoCountM" type="number" value={bayesianPseudoCountM} onChange={(e) => setBayesianPseudoCountM(e.target.value)} placeholder="e.g., 10" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="v2BayesianPriorP">Bayesian Prior P (0-1, def: 0.5)</Label>
              <Input id="v2BayesianPriorP" type="number" step="0.01" value={bayesianPriorP} onChange={(e) => setBayesianPriorP(e.target.value)} placeholder="e.g., 0.5" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="v2DecayHalfLifeD">Decay Half-Life D (days, def: 30)</Label>
              <Input id="v2DecayHalfLifeD" type="number" value={decayHalfLifeD} onChange={(e) => setDecayHalfLifeD(e.target.value)} placeholder="e.g., 30" />
            </div>
            {/* Softmax Temperature T input is removed as it will be auto-optimized */}
          </CardContent>
        </Card>
      </div>

      {/* Trader Management */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Manage Traders</CardTitle>
        </CardHeader>
        <CardContent suppressHydrationWarning={true}>
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end mb-4 p-4 border rounded-md"
            suppressHydrationWarning={true}
          >
            <div className="space-y-1">
              <Label htmlFor="v2TraderName">Name (Optional)</Label>
              <Input id="v2TraderName" type="text" value={currentTraderName} onChange={(e) => setCurrentTraderName(e.target.value)} placeholder="e.g., Alice" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="v2TraderSentiment">Sentiment</Label>
              <Select value={currentTraderSentiment} onValueChange={(value: "yes" | "no") => setCurrentTraderSentiment(value)}>
                <SelectTrigger id="v2TraderSentiment">
                  <SelectValue placeholder="Select sentiment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="v2TraderSmartScore">Smart Score (0-100)</Label>
              <Input id="v2TraderSmartScore" type="number" value={currentTraderSmartScore} onChange={(e) => setCurrentTraderSmartScore(e.target.value)} placeholder="e.g., 75" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="v2TraderDollarPosition">Dollar Position</Label>
              <Input id="v2TraderDollarPosition" type="number" value={currentTraderDollarPosition} onChange={(e) => setCurrentTraderDollarPosition(e.target.value)} placeholder="e.g., 1000" />
            </div>
            <Button onClick={handleAddTrader} className="w-full lg:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Trader
            </Button>
          </div>

          <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button onClick={handleAddExampleYesTraders} variant="outline" size="sm">
              Load Example YES Traders
            </Button>
            <Button onClick={handleAddExampleNoTraders} variant="outline" size="sm">
              Load Example NO Traders
            </Button>
          </div>

          {traders.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Current Traders ({traders.length}):</h3>
                <Button onClick={removeZeroScoreTraders} variant="outline" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" /> Remove Zero Scores
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {traders.map((trader, index) => (
                  <Card key={index} className="relative">
                    <CardHeader>
                      <CardTitle className="text-base">{trader.name || `Trader ${index + 1}`}</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveTrader(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p><strong>Sentiment:</strong> <span className={trader.sentiment === 'yes' ? 'text-green-600' : 'text-red-600'}>{trader.sentiment}</span></p>
                      <p><strong>Smart Score:</strong> {trader.smartScore}</p>
                      <p><strong>Dollar Position:</strong> ${trader.dollarPosition.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Filter Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Risk Filter Settings (Optional)</CardTitle>
          <CardDescription>Define rules to adjust or zero out the position based on confidence, edge, or bankroll percentage.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4" suppressHydrationWarning={true}>
          <div className="space-y-1">
            <Label htmlFor="v2MinConfidence">Min Decayed Confidence (0-1)</Label>
            <Input id="v2MinConfidence" type="number" step="0.01" value={minConfidence} onChange={(e) => setMinConfidence(e.target.value)} placeholder="e.g., 0.3" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="v2MinEdge">Min Absolute Market Edge (e.g. 0.05 for 5%)</Label>
            <Input id="v2MinEdge" type="number" step="0.01" value={minEdge} onChange={(e) => setMinEdge(e.target.value)} placeholder="e.g., 0.05" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="v2MaxPositionSizePct">Max Position Size (% of Bankroll, 0-1)</Label>
            <Input id="v2MaxPositionSizePct" type="number" step="0.01" value={maxPositionSizePct} onChange={(e) => setMaxPositionSizePct(e.target.value)} placeholder="e.g., 0.05 for 5%" />
          </div>
        </CardContent>
      </Card>

      {/* Calculate Button */}
      <Button onClick={handleCalculate} size="lg" className="w-full text-lg py-6 mb-8" disabled={isLoading} suppressHydrationWarning={true}>
        {isLoading ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Please wait...</>
        ) : (
          "Calculate Gravity & Kelly"
        )}
      </Button>

      {/* Results display */}
      {result && !isLoading && (
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-xl">Calculation Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div><strong>Gravity Score:</strong> {result.gravityScore.toFixed(4)}</div>
              <div><strong>Avg Smart Score:</strong> {result.averageSmartScore.toFixed(2)}</div>
              <div><strong>Bayesian Confidence:</strong> {result.bayesianConfidence.toFixed(4)}</div>
              <div><strong>Decayed Confidence:</strong> {result.decayedConfidence.toFixed(4)}</div>
              <div><strong>Intermediate Probability:</strong> {(result.intermediateProbability * 100).toFixed(2)}%</div>
              <div className="font-semibold"><strong>Final Calibrated Probability:</strong> {(result.finalCalibratedProbability * 100).toFixed(2)}%</div>
              <div><strong>Market Edge:</strong> {(result.marketEdge * 100).toFixed(2)}%</div>
              {result.softmaxTemperatureUsed !== undefined && (
                <div className="font-semibold"><strong>Softmax Temp (Auto):</strong> {result.softmaxTemperatureUsed.toFixed(2)}</div>
              )}
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="kelly">
                <AccordionTrigger className="text-md font-semibold">Kelly Betting Details</AccordionTrigger>
                <AccordionContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm pt-2">
                  <div><strong>Bankroll:</strong> ${result.kellyBetting.bankroll.toLocaleString()}</div>
                  <div><strong>Market Probability:</strong> {(result.kellyBetting.marketProbability * 100).toFixed(1)}%</div>
                  <div><strong>Implied Volatility:</strong> {(result.kellyBetting.impliedVolatility * 100).toFixed(1)}%</div>
                  
                  {result.riskFilterReport && result.riskFilterReport.isFiltered && (
                    <div className="sm:col-span-2 my-2 p-3 rounded-md border border-amber-500 bg-amber-50">
                      <p className="font-semibold text-amber-700 text-sm mb-1">Position Filtered:</p>
                      <ul className="list-disc list-inside text-xs text-amber-600 space-y-0.5">
                        {result.riskFilterReport.log.map((entry, idx) => (
                          <li key={idx}><strong>{entry.ruleTriggered}:</strong> {entry.message}</li>
                        ))}
                      </ul>
                      <p className="text-xs mt-1.5">
                        Original Position: ${result.riskFilterReport.originalPositionSize.toFixed(2)}
                      </p>
                    </div>
                  )}
                  
                  <div className={`font-semibold ${result.riskFilterReport?.isFiltered ? 'text-amber-700' : ''}`}><strong>Final Position Size:</strong> ${result.kellyBetting.positionSize.toFixed(2)}</div>

                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="uncertainty">
                <AccordionTrigger className="text-md font-semibold">Uncertainty Bands</AccordionTrigger>
                <AccordionContent className="text-sm pt-2">
                  <p><strong>Range:</strong> [{(result.uncertaintyBands.lower * 100).toFixed(1)}% - {(result.uncertaintyBands.upper * 100).toFixed(1)}%]</p>
                  <p className="text-xs text-muted-foreground mt-1"><em>Method: {result.uncertaintyBands.methodNote}</em></p>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="trader-influences">
                <AccordionTrigger className="text-md font-semibold">Trader Influences</AccordionTrigger>
                <AccordionContent className="pt-2">
                  {result.traderSoftmaxWeights.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">Raw Weight</TableHead>
                          <TableHead className="text-right">Softmax Influence</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.traderSoftmaxWeights.map((tw, i) => {
                          const rawWeightEntry = result.traderRawWeights.find(
                            (rw) => (rw.name && tw.name && rw.name === tw.name) || 
                                     (!rw.name && !tw.name && result.traderRawWeights.indexOf(rw) === result.traderSoftmaxWeights.indexOf(tw))
                          );
                          return (
                            <TableRow key={i}>
                              <TableCell>{tw.name || `Trader ${i + 1}`}</TableCell>
                              <TableCell className="text-right">{rawWeightEntry ? rawWeightEntry.rawWeight.toFixed(4) : "N/A"}</TableCell>
                              <TableCell className="text-right">{tw.softmaxWeight.toFixed(4)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No trader data to display.</p>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="full-json">
                <AccordionTrigger className="text-md font-semibold">Full JSON Result & Inputs</AccordionTrigger>
                <AccordionContent className="pt-2 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Full Result Object:</h4>
                    <pre className="p-3 bg-background rounded-md text-xs overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Inputs Used:</h4>
                    <pre className="p-3 bg-background rounded-md text-xs overflow-x-auto">{JSON.stringify(result.inputsUsed, null, 2)}</pre>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 