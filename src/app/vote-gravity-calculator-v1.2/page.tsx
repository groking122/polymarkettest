"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Upload, Download, ChevronDown, ChevronUp, FileDown, HelpCircle } from "lucide-react";
import { calculateSmartEdge, calculateArbitrageEdge, type Trader, type SmartEdgeResult, type ArbitrageEdgeResult } from "@/utils/calculateSmartEdge";
import { parseTraderCSV, generateTraderCSV, getExampleCSV } from "@/utils/csvParserV1.2";
import Head from 'next/head';
import Link from 'next/link';
import { CrowdProbabilityDisplay } from '@/components/CrowdProbabilityDisplay';
import TraderVisualization from '@/components/TraderVisualization';
import ArbitrageEdgeDisplay from '@/components/ArbitrageEdgeDisplay';
import { toast } from "sonner";
import React from "react";

export default function SmartEdgeCalculatorPage() {
  const [mounted, setMounted] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showCalculationDetails, setShowCalculationDetails] = useState(false);
  const [traders, setTraders] = useState<Trader[]>([
    { 
      name: "Trader 1", 
      sentiment: "yes", 
      smartScore: 75, 
      dollarPosition: 1000,
      entryPrice: 0.40,
      realizedPnl: 200,
      unrealizedPnl: 100,
      supplyOwnership: 0.02
    },
    { 
      name: "Trader 2", 
      sentiment: "no", 
      smartScore: 60, 
      dollarPosition: 500,
      entryPrice: 0.55,
      realizedPnl: -50,
      unrealizedPnl: 150,
      supplyOwnership: 0.01
    },
  ]);

  const [result, setResult] = useState<SmartEdgeResult | null>(null);
  const [arbitrageEdge, setArbitrageEdge] = useState<ArbitrageEdgeResult | null>(null);
  const [marketPrice, setMarketPrice] = useState<number>(50);
  const [bankroll, setBankroll] = useState<number>(100);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && traders.length > 0) {
      const calculation = calculateSmartEdge(traders, marketPrice, bankroll);
      setResult(calculation);
      
      // Calculate arbitrage edge
      const arbitrage = calculateArbitrageEdge(
        calculation.calibratedYesProb, 
        marketPrice, 
        bankroll,
        0.25 // Quarter Kelly
      );
      setArbitrageEdge(arbitrage);
    }
  }, [traders, mounted, marketPrice, bankroll]);

  const addTrader = () => {
    setTraders([...traders, { 
      sentiment: "yes", 
      smartScore: 0, 
      dollarPosition: 0,
      entryPrice: marketPrice / 100, // Default to current market price
      realizedPnl: 0,
      unrealizedPnl: 0,
      supplyOwnership: 0
    }]);
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

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsedTraders = await parseTraderCSV(content, sentiment);
        const filteredTraders = traders.filter(t => t.sentiment !== sentiment);
        const newTraders = [...filteredTraders, ...parsedTraders];
        setTraders(newTraders);
        toast.success(`${sentiment.toUpperCase()} sentiment CSV file uploaded successfully`);
      } catch (error) {
        console.error('Error processing file:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to parse CSV file');
      }
    };
    reader.onerror = () => {
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

  const handleDownloadTemplate = (sentiment: 'yes' | 'no') => {
    const csvContent = getExampleCSV(sentiment);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sentiment}-traders-template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success(`Template CSV downloaded. Use this format for your data.`);
  };

  // Helper functions for formatting
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getEdgeColor = (edge: number): string => {
    if (edge > 0) return 'text-green-600 dark:text-green-400';
    if (edge < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  if (!mounted) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Head>
        <title>Smart Edge</title>
      </Head>
      <h1 className="text-3xl font-bold mb-6 text-center">Smart Edge</h1>
      <div className="flex items-center justify-center gap-2 mb-6">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          Advanced prediction engine with conviction-aware weighted consensus
        </p>
        <Link href="/smart-edge-info" className="text-blue-500 hover:text-blue-700 flex items-center gap-1">
          <HelpCircle size={16} />
          <span>How it works</span>
        </Link>
      </div>

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
            <h3 className="text-lg font-medium mb-2">🧠 The Smart Edge Formula</h3>
            <p>
              Smart Edge identifies market advantages using trader data enhanced with performance metrics and advanced weighting techniques.
            </p>
            
            <hr className="my-4 border-gray-200 dark:border-gray-700" />
            
            <h4 className="text-md font-medium mt-4 mb-2">✅ Core Algorithm</h4>
            
            <div className="space-y-4">
              <div>
                <h5 className="font-medium">📈 Trader Selection & Weighting</h5>
                <p>
                  Instead of arbitrarily selecting equal YES/NO traders, Smart Edge:
                </p>
                <ul className="list-disc pl-6 mt-1">
                  <li>Scores all traders based on influence (smartScore × log(positionSize))</li>
                  <li>Sorts and selects the top 200 most influential traders</li>
                  <li>Applies advanced weighting based on 4 key factors:</li>
                </ul>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md mt-2 text-xs">
                  <code>
                    // Base weight from exponential score emphasis<br/>
                    scoreWeight = exp(smartScore ÷ 25)<br/><br/>
                    
                    // PnL multiplier - rewards profitable traders<br/>
                    pnlMultiplier = 1 + 0.5 × tanh(realizedPnl ÷ 1000) + 0.5 × tanh(unrealizedPnl ÷ 1000)<br/><br/>
                    
                    // Entry price advantage<br/>
                    entryAdvantage = (marketPrice - entryPrice) ÷ marketPrice<br/>
                    entryMultiplier = 1 + 0.4 × entryAdvantage<br/><br/>
                    
                    // Supply ownership bonus<br/>
                    supplyMultiplier = supplyOwnership ≥ 5% ? 1.2 : 1<br/><br/>
                    
                    // Final weighted influence<br/>
                    influence = dollarPosition × scoreWeight × pnlMultiplier × entryMultiplier × supplyMultiplier
                  </code>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium">💰 Smart Probability Calculation</h5>
                <p>
                  The raw prediction is determined by the weighted YES vs NO influence:
                </p>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md mt-2 text-xs">
                  <code>
                    // Calculate the gravity score from all weighted influences<br/>
                    sumWeights = sum of all trader influences<br/>
                    sumAbsWeights = sum of absolute values of influences<br/>
                    gravitySmart = sumWeights ÷ sumAbsWeights<br/><br/>
                    
                    // Convert to probability<br/>
                    rawYesProb = (gravitySmart + 1) ÷ 2
                  </code>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium">🔀 Multi-factor Confidence Calibration</h5>
                <p>
                  Confidence is calculated using three key metrics:
                </p>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md mt-2 text-xs">
                  <code>
                    // Smart capital imbalance<br/>
                    smartSkew = (smartYesCapital - smartNoCapital) ÷ (smartYesCapital + smartNoCapital)<br/>
                    smartSkewConfidence = min(1, |smartSkew|)<br/><br/>
                    
                    // Average smart score quality<br/>
                    scoreConfidence = min(1, avgSmartScore ÷ 100)<br/><br/>
                    
                    // Capital concentration (Herfindahl Index)<br/>
                    herfindahlIndex = sum of (trader capital ÷ total capital)²<br/>
                    concentrationConfidence = min(1, herfindahlIndex × 10)<br/><br/>
                    
                    // Combined confidence factor<br/>
                    confidenceFactor = 0.5 × smartSkewConfidence + 0.3 × scoreConfidence + 0.2 × concentrationConfidence<br/><br/>
                    
                    // Final calibrated probability<br/>
                    calibratedYesProb = 0.5 + (rawYesProb - 0.5) × confidenceFactor
                  </code>
                </div>
              </div>
            </div>
            
            <hr className="my-4 border-gray-200 dark:border-gray-700" />
            
            <h4 className="text-md font-medium mt-4 mb-2">💸 Two Types of Edge</h4>
            
            <p>
              Smart Edge calculates two distinct forms of advantage:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                <h5 className="font-medium text-blue-700 dark:text-blue-300">🎯 Prediction Edge</h5>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Based on smart trader consensus about the true outcome probability.
                </p>
                <div className="text-xs mt-2 text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/30 p-2 rounded">
                  <code>
                    edge = |calibratedYesProb - marketProb|<br/>
                    kellyBet = edge × bankroll × 0.25 × confidenceAdjustment
                  </code>
                </div>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md border border-amber-200 dark:border-amber-800">
                <h5 className="font-medium text-amber-700 dark:text-amber-300">💸 Arbitrage Edge</h5>
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  Based on mispricing between market price and fair value.
                </p>
                <div className="text-xs mt-2 text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-800/30 p-2 rounded">
                  <code>
                    yesEdge = smartYesProb - marketYesProb<br/>
                    noEdge = (1-smartYesProb) - (1-marketYesProb)<br/>
                    betDirection = max(yesEdge, noEdge) {'>'} 0.02 ? direction : none<br/>
                    stake = edge {'>'} 0 ? bankroll × edge × kellyFraction : 0
                  </code>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Trader Input</CardTitle>
          <CardDescription>Enter trader details with enhanced metrics for better prediction accuracy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <HelpCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-700 dark:text-blue-300">CSV Upload Tips</h3>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  For CSV uploads, use columns named <strong>Name</strong>, <strong>Smart Score</strong>, <strong>Dollar Position</strong>, <strong>Entry Price</strong>, <strong>Realized PnL</strong>, <strong>Unrealized PnL</strong>, <strong>Supply Ownership</strong>, and <strong>Sentiment</strong>. 
                  Download a template below to see the expected format.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="text-sm font-medium mb-2">YES Sentiment Traders</h3>
              <div className="flex flex-col gap-2">
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
                <Button 
                  onClick={() => handleDownloadTemplate('yes')} 
                  variant="ghost" 
                  size="sm"
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Download Template
                </Button>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">NO Sentiment Traders</h3>
              <div className="flex flex-col gap-2">
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
                <Button 
                  onClick={() => handleDownloadTemplate('no')} 
                  variant="ghost" 
                  size="sm"
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Download Template
                </Button>
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name (Optional)</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Smart Score<br/>(-100 to +100)</TableHead>
                <TableHead>Dollar Position ($)</TableHead>
                <TableHead>Entry Price (%)</TableHead>
                <TableHead>Advanced</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {traders.map((trader, index) => (
                <React.Fragment key={`trader-fragment-${index}`}>
                  <TableRow>
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
                        className="w-[80px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        placeholder="e.g., 1000"
                        value={trader.dollarPosition || ''}
                        onChange={(e) => updateTrader(index, 'dollarPosition', e.target.value)}
                        className="w-[100px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="e.g., 50"
                        value={trader.entryPrice !== undefined ? trader.entryPrice * 100 : ''}
                        onChange={(e) => updateTrader(index, 'entryPrice', Number(e.target.value) / 100)}
                        className="w-[80px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTraders(prevTraders => {
                            const newTraders = [...prevTraders];
                            const updatedTrader = { 
                              ...newTraders[index], 
                              showAdvanced: !newTraders[index].showAdvanced 
                            };
                            newTraders[index] = updatedTrader;
                            return newTraders;
                          });
                        }}
                      >
                        {trader.showAdvanced ? 'Hide' : 'Show'}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTrader(index)}
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  
                  {/* Advanced fields row that shows when expanded */}
                  {trader.showAdvanced && (
                    <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                      <TableCell colSpan={7} className="p-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`realized-pnl-${index}`}>Realized PnL ($)</Label>
                            <Input
                              id={`realized-pnl-${index}`}
                              type="number"
                              placeholder="e.g., 250"
                              value={trader.realizedPnl ?? ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? undefined : Number(e.target.value);
                                updateTrader(index, 'realizedPnl', value as any);
                              }}
                            />
                            <p className="text-xs text-gray-500">Trading profits already realized</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`unrealized-pnl-${index}`}>Unrealized PnL ($)</Label>
                            <Input
                              id={`unrealized-pnl-${index}`}
                              type="number"
                              placeholder="e.g., 125"
                              value={trader.unrealizedPnl ?? ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? undefined : Number(e.target.value);
                                updateTrader(index, 'unrealizedPnl', value as any);
                              }}
                            />
                            <p className="text-xs text-gray-500">Current paper profits/losses</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`supply-ownership-${index}`}>Supply Ownership (%)</Label>
                            <Input
                              id={`supply-ownership-${index}`}
                              type="number" 
                              min={0}
                              max={100}
                              step={0.1}
                              placeholder="e.g., 2.5"
                              value={trader.supplyOwnership !== undefined ? trader.supplyOwnership * 100 : ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? undefined : Number(e.target.value) / 100;
                                updateTrader(index, 'supplyOwnership', value as any);
                              }}
                            />
                            <p className="text-xs text-gray-500">Percentage of total market owned</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
              <TableRow>
                <TableCell colSpan={7}>
                  <Button onClick={addTrader} variant="outline" className="w-full py-1 h-8 mt-2">
                    + Add Trader
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Market Settings Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Market Settings</CardTitle>
          <CardDescription>Enter the current market price and your bankroll for edge calculations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="market-price">Current Market Price (0-100)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="market-price"
                  type="number"
                  min={0}
                  max={100}
                  value={marketPrice}
                  onChange={(e) => setMarketPrice(Number(e.target.value))}
                  className="w-[150px]"
                />
                <span>%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankroll">Your Bankroll</Label>
              <div className="flex items-center gap-2">
                <span>$</span>
                <Input
                  id="bankroll"
                  type="number"
                  min={1}
                  value={bankroll}
                  onChange={(e) => setBankroll(Number(e.target.value))}
                  className="w-[150px]"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      {result && (
        <>
          <Card className="mb-6 border-t-4 border-t-blue-500">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <CardTitle>Smart Edge Results</CardTitle>
                  <CardDescription>
                    {result.confidenceLevel} confidence in a {(result.calibratedYesProb * 100).toFixed(1)}% probability estimate
                  </CardDescription>
                </div>
                <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full text-sm">
                  <span className="mr-1">🎯</span> Prediction-based Edge
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left column */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Calibrated Probability</h3>
                    <CrowdProbabilityDisplay 
                      percentage={result.calibratedYesProb * 100} 
                      probabilityRange={{
                        lower: result.probabilityRange.lower * 100,
                        upper: result.probabilityRange.upper * 100
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Edge Assessment</h3>
                    <Card className="p-4 border-l-4 border-l-blue-500">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Market Price:</span>
                          <span>{marketPrice.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Smart Estimate:</span>
                          <span>{(result.calibratedYesProb * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Edge:</span>
                          <span className={getEdgeColor(result.kellyBetting?.edge || 0)}>
                            {result.kellyBetting?.edge ? `${(result.kellyBetting.edge * 100).toFixed(2)}%` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Betting Recommendation</h3>
                    <Card className={`p-4 border-l-4 ${result.kellyBetting?.shouldBet ? 'border-l-green-500' : 'border-l-red-500'}`}>
                      <div className="space-y-3">
                        <div className="font-medium text-lg">
                          {result.kellyBetting?.shouldBet 
                            ? `Bet ${result.kellyBetting.betSide.toUpperCase()}` 
                            : 'No Bet Recommended'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {result.kellyBetting?.betReasoning || 'Insufficient edge to recommend a bet.'}
                        </div>
                        {result.kellyBetting?.shouldBet && (
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center">
                              <span>Recommended Size:</span>
                              <span className="font-medium">
                                {formatCurrency(result.kellyBetting.recommendedBetSize)} 
                                ({(result.kellyBetting.safeKellyFraction * 100).toFixed(1)}% of bankroll)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Smart Money Distribution</h3>
                    <Card className="p-4 border border-gray-200 dark:border-gray-800">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-green-600 dark:text-green-400 font-medium">Smart YES Capital:</span>
                          <span>{formatCurrency(result.smartYesCapital)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-red-600 dark:text-red-400 font-medium">Smart NO Capital:</span>
                          <span>{formatCurrency(result.smartNoCapital)}</span>
                        </div>
                        <div className="flex justify-between items-center font-medium pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span>Smart Skew:</span>
                          <span 
                            className={result.smartSkew > 0 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'}
                          >
                            {(result.smartSkew * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Smart Skew</h3>
                    <Card className="p-4 border border-gray-200 dark:border-gray-800">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">Raw:</span>
                            <div className="font-medium">{(result.rawYesProb * 100).toFixed(1)}%</div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">Confidence:</span>
                            <div className="font-medium">{(result.confidenceFactor * 100).toFixed(1)}%</div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">Gravity:</span>
                            <div className="font-medium">{(result.gravitySmart * 100).toFixed(1)}%</div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">Avg. Score:</span>
                            <div className="font-medium">{result.avgSmartScore.toFixed(1)}</div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Top Influencers</h3>
                    <Card className="p-4 border border-gray-200 dark:border-gray-800">
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {result.traderInfluences.slice(0, 5).map((trader, index) => (
                          <div key={index} className="flex justify-between items-center py-1">
                            <div className="flex items-center gap-2">
                              <span className={trader.sentiment === 'yes' 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                              }>
                                {trader.sentiment.toUpperCase()}
                              </span>
                              <span className="font-medium">{trader.name}</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                (Score: {trader.smartScore})
                              </span>
                            </div>
                            <span className="font-mono">{trader.influencePercent.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Arbitrage Edge Display */}
          {arbitrageEdge && (
            <Card className="mb-6 border-t-4 border-t-amber-500">
              <CardContent className="pt-6">
                <ArbitrageEdgeDisplay 
                  arbitrageEdge={arbitrageEdge} 
                  marketPrice={marketPrice} 
                  formatCurrency={formatCurrency}
                />
              </CardContent>
            </Card>
          )}

          {/* Edge Distribution Visualization */}
          {result && result.traderInfluences.length > 0 && (
            <TraderVisualization 
              traders={traders}
              traderInfluences={result.traderInfluences}
              smartYesCapital={result.smartYesCapital}
              smartNoCapital={result.smartNoCapital}
            />
          )}

          {/* Calculation Details Card */}
          <Card className="mb-6">
            <CardHeader className="cursor-pointer" onClick={() => setShowCalculationDetails(!showCalculationDetails)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Advanced Calculation Details</CardTitle>
                <Button variant="ghost" size="icon">
                  {showCalculationDetails ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </Button>
              </div>
            </CardHeader>

            {showCalculationDetails && (
              <CardContent className="text-sm">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-2">Computed Factors</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Parameter</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>Raw YES Probability</TableCell>
                          <TableCell>{result ? (result.rawYesProb * 100).toFixed(2) : '--'}%</TableCell>
                          <TableCell>Raw weighted probability before calibration</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Calibrated YES Probability</TableCell>
                          <TableCell>{result ? (result.calibratedYesProb * 100).toFixed(2) : '--'}%</TableCell>
                          <TableCell>Final probability after confidence adjustment</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Smart Skew</TableCell>
                          <TableCell>{result ? (result.smartSkew * 100).toFixed(2) : '--'}%</TableCell>
                          <TableCell>Capital imbalance among smart traders</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Gravity Smart</TableCell>
                          <TableCell>{result ? (result.gravitySmart * 100).toFixed(2) : '--'}%</TableCell>
                          <TableCell>Normalized weighted score direction</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Confidence Factor</TableCell>
                          <TableCell>{result ? (result.confidenceFactor * 100).toFixed(2) : '--'}%</TableCell>
                          <TableCell>How confident we are in the prediction</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Edge</TableCell>
                          <TableCell className={getEdgeColor(result?.kellyBetting?.edge || 0)}>
                            {result?.kellyBetting?.edge 
                              ? `${(result.kellyBetting.edge * 100).toFixed(2)}%` 
                              : 'N/A'
                            }
                          </TableCell>
                          <TableCell>Expected value advantage vs. market price</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Top Trader Influences</h3>
                    <div className="max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Sentiment</TableHead>
                            <TableHead>Smart Score</TableHead>
                            <TableHead>Position Size</TableHead>
                            <TableHead>Entry Price</TableHead>
                            <TableHead>PnL</TableHead>
                            <TableHead>Influence %</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result?.traderInfluences.slice(0, 10).map((trader, index) => (
                            <TableRow key={index}>
                              <TableCell>{trader.name}</TableCell>
                              <TableCell>
                                <span className={trader.sentiment === 'yes' 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : 'text-red-600 dark:text-red-400'
                                }>
                                  {trader.sentiment.toUpperCase()}
                                </span>
                              </TableCell>
                              <TableCell>{trader.smartScore}</TableCell>
                              <TableCell>{formatCurrency(trader.dollarPosition)}</TableCell>
                              <TableCell>{trader.entryPrice ? `${(trader.entryPrice * 100).toFixed(1)}%` : 'N/A'}</TableCell>
                              <TableCell>
                                {trader.realizedPnl !== undefined || trader.unrealizedPnl !== undefined ? (
                                  <span className={((trader.realizedPnl || 0) + (trader.unrealizedPnl || 0)) >= 0
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                  }>
                                    {formatCurrency((trader.realizedPnl || 0) + (trader.unrealizedPnl || 0))}
                                  </span>
                                ) : 'N/A'}
                              </TableCell>
                              <TableCell>{trader.influencePercent.toFixed(2)}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  );
} 