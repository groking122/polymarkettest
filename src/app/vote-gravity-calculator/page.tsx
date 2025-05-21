"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Upload, Download, ChevronDown, ChevronUp, FileDown, Minimize2, Maximize2, ArrowUp, ArrowDown, AlertTriangle, Info } from "lucide-react";
import { calculateSmartGravity, getConfidenceLevel, type Trader, type GravityResult } from "@/utils/calculateSmartGravity";
import { parseTraderCSV, generateTraderCSV } from "@/utils/csvParser";
import Head from 'next/head';
import { CrowdProbabilityDisplay } from '@/components/CrowdProbabilityDisplay';
import { toast } from "sonner";

// Simple tooltip component
const InfoTooltip = ({ content, children }: { content: React.ReactNode, children: React.ReactNode }) => {
  const [show, setShow] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  return (
    <div 
      className="relative inline-block cursor-help" 
      onMouseEnter={() => setShow(true)} 
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div 
          ref={tooltipRef}
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 bg-black/90 dark:bg-gray-700 text-white dark:text-gray-100 text-xs rounded px-2 py-1 mb-1 max-w-xs z-50"
        >
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-t-4 border-r-4 border-l-4 border-t-black/90 dark:border-t-gray-700 border-r-transparent border-l-transparent"></div>
        </div>
      )}
    </div>
  );
};

export default function VoteGravityCalculatorPage() {
  const [mounted, setMounted] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showCalculationDetails, setShowCalculationDetails] = useState(false);
  const [traders, setTraders] = useState<Trader[]>([
    { name: "Trader 1", sentiment: "yes", smartScore: 75, dollarPosition: 1000 },
    { name: "Trader 2", sentiment: "no", smartScore: 60, dollarPosition: 500 },
  ]);

  const [result, setResult] = useState<GravityResult | null>(null);
  const [marketPrice, setMarketPrice] = useState<number>(50);
  const [bankroll, setBankroll] = useState<number>(100);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && traders.length > 0) {
      const calculation = calculateSmartGravity(traders, marketPrice, bankroll);
      setResult(calculation);
    }
  }, [traders, mounted, marketPrice, bankroll]);

  const addTrader = () => {
    setTraders([...traders, { sentiment: "yes", smartScore: 0, dollarPosition: 0 }]);
  };

  const removeTrader = (index: number) => {
    setTraders(traders.filter((_, i) => i !== index));
  };

  const removeZeroScoreTraders = () => {
    const filteredTraders = traders.filter(trader => trader.smartScore !== 0);
    if (traders.length === filteredTraders.length) {
      toast.info("No traders with zero smart scores found");
      return;
    }
    const removedCount = traders.length - filteredTraders.length;
    setTraders(filteredTraders);
    toast.success(`Removed ${removedCount} trader${removedCount > 1 ? 's' : ''} with zero smart scores`);
  };

  const updateTrader = (index: number, field: keyof Trader, value: string | number) => {
    const updated = [...traders];
    updated[index] = {
      ...updated[index],
      [field]: field === 'smartScore' || field === 'dollarPosition' ? Number(value) : value
    };
    setTraders(updated);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, sentiment: 'yes' | 'no') => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log(`Processing ${sentiment} sentiment file:`, file.name);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        console.log('File content:', content);
        
        const parsedTraders = await parseTraderCSV(content, sentiment);
        console.log('Parsed traders:', parsedTraders);
        
        // Remove existing traders with the same sentiment
        const filteredTraders = traders.filter(t => t.sentiment !== sentiment);
        console.log('Filtered traders:', filteredTraders);
        
        // Add new traders
        const newTraders = [...filteredTraders, ...parsedTraders];
        console.log('New traders array:', newTraders);
        
        setTraders(newTraders);
        toast.success(`${sentiment.toUpperCase()} sentiment CSV file uploaded successfully`);
      } catch (error) {
        console.error('Error processing file:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to parse CSV file');
      }
    };
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      toast.error('Error reading file');
    };
    reader.readAsText(file);
  };

  const handleDownload = (sentiment: 'yes' | 'no') => {
    const filteredTraders = traders.filter(t => t.sentiment === sentiment);
    const csvContent = generateTraderCSV(filteredTraders);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sentiment}-traders.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadResults = () => {
    if (!result) return;
    
    // Create CSV content
    const lines = [
      // Headers
      'Calculation Results,Value',
      `Gravity Score,${result.gravityScore.toFixed(4)}`,
      `Confidence Level,${result.confidenceLevel}`,
      `Average Smart Score,${result.avgSmartScore.toFixed(2)}`,
      `Raw Yes Probability,${(result.rawYesProb * 100).toFixed(2)}%`,
      `Calibrated Yes Probability,${(result.calibratedYesProb * 100).toFixed(2)}%`,
      `Probability Range,${(result.probabilityRange.lower * 100).toFixed(2)}% - ${(result.probabilityRange.upper * 100).toFixed(2)}%`,
      '',
      'Trader Influence Breakdown',
      'Trader,Smart Score,Dollar Position,Sentiment,Weight,Influence %'
    ];
    
    // Add trader data
    result.traderInfluences.forEach(trader => {
      lines.push(`${trader.name},${trader.smartScore},${trader.dollarPosition.toFixed(2)},${trader.sentiment},${trader.weight.toFixed(4)},${trader.influencePercent.toFixed(2)}%`);
    });
    
    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gravity-calculation-results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Calculation results downloaded successfully');
  };

  // Update the confidence level display
  const getNumericConfidence = (confidenceLevel: string): number => {
    if (confidenceLevel.includes("High")) return 85;
    if (confidenceLevel.includes("Medium")) return 55;
    return 25;
  };

  // Add this function to format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Add a color function for edge display
  const getEdgeColor = (edge: number): string => {
    if (edge > 0) return 'text-green-600 dark:text-green-400';
    if (edge < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  if (!mounted) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Head>
        <title>Smart Score Vote Gravity Calculator</title>
      </Head>
      <h1 className="text-3xl font-bold mb-6 text-center">Smart Score Vote Gravity Calculator</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6 text-center">
        Calculate weighted consensus based on trader sentiment, smart scores, and shares
      </p>

      <Card className="mb-6 shadow-lg">
        <CardHeader className="cursor-pointer" onClick={() => setShowHowItWorks(!showHowItWorks)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">How It Works</CardTitle>
            <Button variant="ghost" size="icon">
              {showHowItWorks ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </div>
        </CardHeader>
        {showHowItWorks && (
          <CardContent className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
            <p>
              This calculator estimates market consensus by analyzing trader sentiment, smart scores, and dollar positions.
              Smart scores range from -100 to +100, representing trader performance and reliability.
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Mathematical Formulas:</h3>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md space-y-3">
                  <div>
                    <p className="font-mono text-sm mb-1">1. Score Scaling:</p>
                    <p className="text-sm">scoreScale = 0.5 + 0.5 × tanh(Smart Score/scaleFactor)</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      <li>• scaleFactor = max(40, 95th percentile of |Smart Scores|)</li>
                      <li>• Quantile-based dynamic scaling for data adaptability</li>
                      <li>• Maps scores to [0,1] range with better differentiation</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-mono text-sm mb-1">2. Raw Weight Calculation:</p>
                    <p className="text-sm">Raw Weight = Sentiment × scoreScale × ln(Dollar Position + 1)</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      <li>• Sentiment: +1 (yes) or -1 (no)</li>
                      <li>• ln(): Natural logarithm for stronger position compression</li>
                      <li>• Dollar Position: Actual money at risk (shares × price)</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-mono text-sm mb-1">3. Influence Normalization:</p>
                    <p className="text-sm">influence = softmax(|Raw Weights|, T) × sign(Raw Weights)</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      <li>• T = Temperature based on entropy and group size</li>
                      <li>• Ensures no trader exceeds ~12% of total influence</li>
                      <li>• Higher entropy → higher temperature → more uniform weights</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-mono text-sm mb-1">4. Gravity Score:</p>
                    <p className="text-sm">Gravity Score = Sum of all Normalized Influences</p>
                  </div>
                  <div>
                    <p className="font-mono text-sm mb-1">5. Raw Probability:</p>
                    <p className="text-sm">Raw Yes Probability = (Gravity Score + 1) / 2</p>
                  </div>
                  <div>
                    <p className="font-mono text-sm mb-1">6. Calibrated Probability:</p>
                    <p className="text-sm">Calibrated Yes Probability = 0.5 + (Raw Yes Probability - 0.5) × Confidence Factor</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      <li>• Confidence Factor: Based on weighted avg score and variance</li>
                      <li>• Higher confidence with stronger scores, lower variance</li>
                      <li>• Automatically shrinks with disagreement</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-mono text-sm mb-1">7. Uncertainty Band:</p>
                    <p className="text-sm">Probability Range = Wilson Score Interval ± Variance Adjustment</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      <li>• Uses Wilson score for statistical rigor</li>
                      <li>• Adjusts for sample size and probability magnitude</li>
                      <li>• Expands with higher score variance</li>
                      <li>• Capped at ±20% maximum uncertainty</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Statistical Improvements:</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>MAD-based dispersion (robust to outliers)</li>
                  <li>Softmax normalization with dynamic temperature</li>
                  <li>Balanced influence distribution (no trader &gt; 12%)</li>
                  <li>Dynamic confidence based on data quality</li>
                  <li>Error margins reflecting statistical uncertainty</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Gravity Score Explained:</h3>
                <p className="mb-2">
                  The gravity score ranges from -1 to +1 and represents the weighted consensus of all traders:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>+1.0 to +0.7:</strong> Strong bullish consensus with high confidence</li>
                  <li><strong>+0.7 to +0.3:</strong> Moderate bullish sentiment</li>
                  <li><strong>+0.3 to -0.3:</strong> Neutral or uncertain market sentiment</li>
                  <li><strong>-0.3 to -0.7:</strong> Moderate bearish sentiment</li>
                  <li><strong>-0.7 to -1.0:</strong> Strong bearish consensus with high confidence</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Confidence Levels:</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>High (✅):</strong> Average smart score ≥ 70</li>
                  <li><strong>Medium (⚠️):</strong> Average smart score between 40-69</li>
                  <li><strong>Low (❗):</strong> Average smart score &lt; 40</li>
                </ul>
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  Unlike the original model, confidence is now based on average smart score strength rather than the gravity score magnitude, 
                  providing a more accurate assessment of prediction reliability.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Key Features:</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Balance of Power:</strong> No single trader can dominate the consensus</li>
                  <li><strong>Smart Score Impact:</strong> Higher scores still have more influence</li>
                  <li><strong>Dollar Position Scaling:</strong> Logarithmic scaling for fair weighting</li>
                  <li><strong>Uncertainty Quantification:</strong> Probability ranges show confidence</li>
                  <li><strong>Robust Statistics:</strong> Resistant to outliers and manipulation</li>
                </ul>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Trader Input</CardTitle>
          <CardDescription>Enter trader details, sentiment, smart scores, and shares</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="text-sm font-medium mb-2">YES Sentiment Traders</h3>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="yes-csv-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 p-2 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
                      <Upload className="h-4 w-4" />
                      <span>Upload YES CSV</span>
                    </div>
                  </Label>
                  <Input
                    id="yes-csv-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'yes')}
                  />
                </div>
                <Button onClick={() => handleDownload('yes')} variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">NO Sentiment Traders</h3>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="no-csv-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 p-2 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
                      <Upload className="h-4 w-4" />
                      <span>Upload NO CSV</span>
                    </div>
                  </Label>
                  <Input
                    id="no-csv-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'no')}
                  />
                </div>
                <Button onClick={() => handleDownload('no')} variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name (Optional)</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Smart Score (-100 to +100)</TableHead>
                <TableHead>Dollar Position ($)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {traders.map((trader, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      type="text"
                      placeholder="e.g., Trader 1"
                      value={trader.name || ''}
                      onChange={(e) => updateTrader(index, 'name', e.target.value)}
                      className="w-[150px]"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={trader.sentiment}
                      onValueChange={(value: 'yes' | 'no') => updateTrader(index, 'sentiment', value)}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">YES</SelectItem>
                        <SelectItem value="no">NO</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={-100}
                      max={100}
                      value={trader.smartScore}
                      onChange={(e) => updateTrader(index, 'smartScore', e.target.value)}
                      className="w-[150px]"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={trader.dollarPosition}
                      onChange={(e) => updateTrader(index, 'dollarPosition', e.target.value)}
                      className="w-[150px]"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTrader(index)}
                      disabled={traders.length <= 1}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex gap-2">
            <Button onClick={addTrader}>
              Add Trader
            </Button>
            <Button 
              variant="outline" 
              onClick={removeZeroScoreTraders}
              className="text-orange-500 border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20"
            >
              Remove Zero Scores
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Market Settings</CardTitle>
          <CardDescription>Enter current market price and your bankroll</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="market-price">Market Price (¢)</Label>
              <div className="flex items-center mt-1">
                <Input
                  id="market-price"
                  type="number"
                  min={1}
                  max={99}
                  value={marketPrice}
                  onChange={(e) => setMarketPrice(Number(e.target.value))}
                  className="w-full"
                />
                <span className="ml-2 text-sm text-gray-500">¢</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Current price of the YES shares (1-99)
              </p>
            </div>
            <div>
              <Label htmlFor="bankroll">Bankroll</Label>
              <div className="flex items-center mt-1">
                <span className="mr-2 text-sm text-gray-500">$</span>
                <Input
                  id="bankroll"
                  type="number"
                  min={1}
                  value={bankroll}
                  onChange={(e) => setBankroll(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Your total trading capital
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Calculation Results</CardTitle>
                <CardDescription>Based on the entered trader data</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleDownloadResults}
                  title="Download results as CSV"
                >
                  <FileDown className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowCalculationDetails(!showCalculationDetails)}
                  title={showCalculationDetails ? "Minimize" : "Expand"}
                >
                  {showCalculationDetails ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {/* Summary always visible */}
            <div className="mt-4">
              <p className={`text-2xl font-bold p-3 rounded-md ${
                result.gravityScore > 0 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                  : result.gravityScore < 0 
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}>
                Gravity Score: {result.gravityScore.toFixed(4)}
              </p>
              
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  <p className="text-sm text-gray-500">Confidence</p>
                  <p className="text-xl font-semibold flex items-center gap-2">
                    {result.confidenceLevel}
                    <span className="text-sm text-gray-500">
                      ({getNumericConfidence(result.confidenceLevel)}/100)
                    </span>
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  <p className="text-sm text-gray-500">Yes Probability</p>
                  <p className="text-xl font-semibold">{(result.calibratedYesProb * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </CardHeader>
          
          {/* Detailed content only visible when expanded */}
          {showCalculationDetails && (
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Individual Trader Weights:</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b dark:border-gray-700">
                          <th className="text-left py-2 px-4 dark:text-gray-300">Trader</th>
                          <th className="text-left py-2 px-4 dark:text-gray-300">Smart Score</th>
                          <th className="text-left py-2 px-4 dark:text-gray-300">Dollar Position</th>
                          <th className="text-left py-2 px-4 dark:text-gray-300">Sentiment</th>
                          <th className="text-left py-2 px-4 dark:text-gray-300">Raw Weight</th>
                          <th className="text-left py-2 px-4 dark:text-gray-300">Influence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.traderInfluences.map((trader, index) => (
                          <tr key={index} className={`border-b dark:border-gray-700 ${trader.signError ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                            <td className="py-2 px-4 dark:text-gray-200 flex items-center gap-1">
                              {trader.name}
                              {trader.signError && (
                                <InfoTooltip content="Sign error detected: This trader's influence direction doesn't match their sentiment">
                                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                                </InfoTooltip>
                              )}
                            </td>
                            <td className="py-2 px-4 dark:text-gray-200">{trader.smartScore}</td>
                            <td className="py-2 px-4 dark:text-gray-200">${trader.dollarPosition.toFixed(2)}</td>
                            <td className="py-2 px-4 dark:text-gray-200">
                              <span className={`flex items-center gap-1 ${trader.sentiment === 'yes' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {trader.sentiment === 'yes' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                {trader.sentiment.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-2 px-4 dark:text-gray-200">{trader.weight.toFixed(4)}</td>
                            <td className="py-2 px-4 dark:text-gray-200">
                              <div className="flex items-center gap-2">
                                <span className={trader.weight > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                  {trader.weight > 0 ? '+' : ''}{trader.influencePercent.toFixed(1)}%
                                </span>
                                <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${trader.weight > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                                    style={{ width: `${Math.abs(trader.influencePercent)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    <span className="font-medium">Note:</span> Influence is calculated based on normalized dollar positions and smart scores. Higher influence indicates greater impact on the final probability.
                    {result.signAccuracy && result.signAccuracy < 1 && (
                      <span className="text-amber-500 ml-1">
                        Sign accuracy: {(result.signAccuracy * 100).toFixed(1)}% 
                        ({Math.round(result.signAccuracy * result.traderInfluences.length)}/{result.traderInfluences.length} correct)
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold">Detailed Results:</h3>
                  <div className="space-y-2 mt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                        <p className="text-sm text-gray-500">Confidence Level</p>
                        <p className="text-xl font-semibold">{result.confidenceLevel}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                        <p className="text-sm text-gray-500">Number of Traders</p>
                        <p className="text-xl font-semibold">{traders.length}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                        <p className="text-sm text-gray-500">Raw Yes Probability</p>
                        <p className="text-xl font-semibold">{(result.rawYesProb * 100).toFixed(1)}%</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                        <p className="text-sm text-gray-500">Calibrated Yes Probability</p>
                        <p className="text-xl font-semibold">{(result.calibratedYesProb * 100).toFixed(1)}%</p>
                        <InfoTooltip content="95% Wilson score interval adjusted for trader variance, capped at ±20%">
                          <p className="text-xs text-gray-500 mt-1">
                            Estimated Range: {(result.probabilityRange.lower * 100).toFixed(1)}% – {(result.probabilityRange.upper * 100).toFixed(1)}%
                          </p>
                        </InfoTooltip>
                        <p className="text-xs text-gray-500 mt-1">
                          Adjusted for confidence level and sample size
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                        <p className="text-sm text-gray-500">Average Smart Score</p>
                        <p className="text-xl font-semibold">{result.avgSmartScore.toFixed(1)}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                        <InfoTooltip content="Higher variance indicates more disagreement among traders">
                          <p className="text-sm text-gray-500">Score Variance</p>
                        </InfoTooltip>
                        <p className="text-xl font-semibold">
                          {(result.weightedVariance || 0).toFixed(1)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {result && result.kellyBetting && (
        <div className="mt-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 shadow-md">
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <span className="mr-2">Optimal Strategy Framework</span>
              {result.optimalStrategy?.shouldBet ? (
                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs px-2 py-1 rounded-full">
                  Bet Recommended
                </span>
              ) : (
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
                  No Bet
                </span>
              )}
            </h3>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
              <div>
                <p className="text-sm text-gray-500">Market Price</p>
                <p className="text-xl font-semibold">{marketPrice}¢</p>
                <p className="text-xs text-gray-500">({(result.kellyBetting.marketProbability * 100).toFixed(1)}% probability)</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Calibrated Probability</p>
                <p className="text-xl font-semibold">{(result.calibratedYesProb * 100).toFixed(1)}%</p>
                <p className="text-xs text-gray-500">
                  Range: {(result.probabilityRange.lower * 100).toFixed(1)}% – {(result.probabilityRange.upper * 100).toFixed(1)}%
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Edge</p>
                <p className={`text-xl font-semibold ${getEdgeColor(result.kellyBetting.edge)}`}>
                  {result.kellyBetting.edge > 0 ? '+' : ''}{(result.kellyBetting.edge * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  {result.kellyBetting.edge > 0 ? 'Bet YES' : result.kellyBetting.edge < 0 ? 'Bet NO' : 'No Edge'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Recommended Bet</p>
                <p className={`text-xl font-semibold ${result.kellyBetting.recommendedBetSize > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {formatCurrency(result.kellyBetting.recommendedBetSize)}
                </p>
                <p className="text-xs text-gray-500">
                  {result.kellyBetting.recommendedBetSize > 0 
                    ? `${(result.kellyBetting.recommendedBetSize / bankroll * 100).toFixed(1)}% of bankroll` 
                    : 'No bet recommended'}
                </p>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-900 rounded-md p-3 shadow-sm">
              <div className="flex items-center mb-2">
                <h4 className="font-semibold text-sm">Strategy Details</h4>
                <InfoTooltip content="Based on Kelly criterion, adjusted for confidence level and uncertainty">
                  <Info className="h-4 w-4 ml-1 text-gray-400" />
                </InfoTooltip>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>Quarter Kelly Fraction:</span>
                  <span className="font-mono">{(result.kellyBetting.safeKellyFraction * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Maximum Allowed Risk:</span>
                  <span className="font-mono">{(result.optimalStrategy?.maximumRisk ?? 0) * 100}% of bankroll</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Minimum Edge Required:</span>
                  <span className="font-mono">{(result.optimalStrategy?.edgeThreshold ?? 0) * 100}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Daily Stop-Loss:</span>
                  <span className="font-mono">{formatCurrency(bankroll * (result.optimalStrategy?.stopLossThreshold ?? 0))}</span>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <span className="font-semibold">Reasoning:</span>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    {result.optimalStrategy?.reasoning ?? result.kellyBetting.betReasoning}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-xs text-gray-500">
              <p><strong>Note:</strong> This betting strategy uses Quarter Kelly (25% of optimal) to significantly reduce volatility while maintaining growth.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 