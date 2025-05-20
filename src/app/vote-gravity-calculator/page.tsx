"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Upload, Download, ChevronDown, ChevronUp } from "lucide-react";
import { calculateSmartGravity, getConfidenceLevel, type Trader, type GravityResult } from "@/utils/calculateSmartGravity";
import { parseTraderCSV, generateTraderCSV } from "@/utils/csvParser";
import Head from 'next/head';
import { CrowdProbabilityDisplay } from '@/components/CrowdProbabilityDisplay';
import { toast } from "sonner";

export default function VoteGravityCalculatorPage() {
  const [mounted, setMounted] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [traders, setTraders] = useState<Trader[]>([
    { name: "Trader 1", sentiment: "yes", smartScore: 75, dollarPosition: 1000 },
    { name: "Trader 2", sentiment: "no", smartScore: 60, dollarPosition: 500 },
  ]);

  const [result, setResult] = useState<GravityResult | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && traders.length > 0) {
      const calculation = calculateSmartGravity(traders);
      setResult(calculation);
    }
  }, [traders, mounted]);

  const addTrader = () => {
    setTraders([...traders, { sentiment: "yes", smartScore: 0, dollarPosition: 0 }]);
  };

  const removeTrader = (index: number) => {
    setTraders(traders.filter((_, i) => i !== index));
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
                    <p className="text-sm">scoreScale = 0.5 + 0.5 × tanh(Smart Score/40)</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      <li>• Maps scores to [0,1] range with better differentiation</li>
                      <li>• Higher stretching for more extreme scores</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-mono text-sm mb-1">2. Raw Weight Calculation:</p>
                    <p className="text-sm">Raw Weight = Sentiment × scoreScale × log2(Dollar Position + 1)</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      <li>• Sentiment: +1 (yes) or -1 (no)</li>
                      <li>• log2(): Logarithmic scaling prevents large positions from dominating</li>
                      <li>• Dollar Position: Actual money at risk (shares × price)</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-mono text-sm mb-1">3. Influence Normalization:</p>
                    <p className="text-sm">influence = softmax(|Raw Weights|, T) × sign(Raw Weights)</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      <li>• T = Temperature factor adapting to group size and dispersion</li>
                      <li>• Ensures no trader exceeds ~12% of total influence</li>
                      <li>• Larger groups get higher temperature (more uniform weights)</li>
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
                      <li>• Confidence Factor: Based on weighted average smart score</li>
                      <li>• Higher confidence with stronger average scores</li>
                      <li>• Adjusts dynamically based on score strength & dispersion</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-mono text-sm mb-1">7. Uncertainty Band:</p>
                    <p className="text-sm">Probability Range = Calibrated Probability ± Error Margin</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      <li>• Error Margin: Scales with trader count and score variance</li>
                      <li>• Wider bands with fewer traders or high dispersion</li>
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
          <Button onClick={addTrader} className="mt-4">
            Add Trader
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Calculation Results</CardTitle>
            <CardDescription>Based on the entered trader data</CardDescription>
          </CardHeader>
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
                        <th className="text-left py-2 px-4 dark:text-gray-300">Weight</th>
                        <th className="text-left py-2 px-4 dark:text-gray-300">Influence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.traderInfluences.map((trader, index) => (
                        <tr key={index} className="border-b dark:border-gray-700">
                          <td className="py-2 px-4 dark:text-gray-200">{trader.name}</td>
                          <td className="py-2 px-4 dark:text-gray-200">{trader.smartScore}</td>
                          <td className="py-2 px-4 dark:text-gray-200">${trader.dollarPosition.toFixed(2)}</td>
                          <td className="py-2 px-4 dark:text-gray-200">
                            <span className={trader.sentiment === 'yes' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                              {trader.sentiment.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2 px-4 dark:text-gray-200">{trader.weight.toFixed(4)}</td>
                          <td className="py-2 px-4 dark:text-gray-200">
                            <div className="flex items-center gap-2">
                              <span>{trader.influencePercent.toFixed(1)}%</span>
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
                  Note: Influence is calculated based on normalized dollar positions and smart scores. Higher influence indicates greater impact on the final probability.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold">Final Results:</h3>
                <div className="space-y-2 mt-2">
                  <p className={`text-2xl font-bold p-3 rounded-md ${
                    result.gravityScore > 0 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                      : result.gravityScore < 0 
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}>
                    Gravity Score: {result.gravityScore.toFixed(4)}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                      <p className="text-sm text-gray-500">Confidence Level</p>
                      <p className="text-xl font-semibold">{result.confidenceLevel}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Based on average smart score: {result.avgSmartScore.toFixed(1)}
                      </p>
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
                      <p className="text-xs text-gray-500 mt-1">
                        Estimated Range: {(result.probabilityRange.lower * 100).toFixed(1)}% – {(result.probabilityRange.upper * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Adjusted for confidence level and sample size
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 