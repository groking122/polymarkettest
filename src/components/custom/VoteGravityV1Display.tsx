"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Upload, Download, ChevronDown, ChevronUp, FileDown, Minimize2, Maximize2, ArrowUp, ArrowDown, AlertTriangle, Info, PlusCircle } from "lucide-react";
import { calculateSmartGravity, getConfidenceLevel, type Trader, type GravityResult } from "@/utils/calculateSmartGravity";
import { parseTraderCSV, generateTraderCSV } from "@/utils/csvParser";
import Head from 'next/head';
import { CrowdProbabilityDisplay } from '@/components/CrowdProbabilityDisplay';
import { toast } from "sonner";

// Simple tooltip component (kept local for now)
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

export default function VoteGravityV1Display() {
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
    } else if (mounted && traders.length === 0) {
      // Handle case with no traders if necessary, e.g., set result to a default state or null
      setResult(null); 
    }
  }, [traders, mounted, marketPrice, bankroll]);

  // Listen for trader updates from V2 calculator
  useEffect(() => {
    const handleV2TradersUpdate = (event: any) => {
      if (event.detail && event.detail.traders) {
        setTraders(event.detail.traders);
      }
    };
    
    window.addEventListener('v2-traders-updated', handleV2TradersUpdate);
    
    return () => {
      window.removeEventListener('v2-traders-updated', handleV2TradersUpdate);
    };
  }, []);

  const addTrader = () => {
    const newTrader: Trader = { 
      name: `Trader ${traders.length + 1}`, 
      sentiment: "yes", 
      smartScore: 0, 
      dollarPosition: 0 
    };
    const newTraders = [...traders, newTrader];
    setTraders(newTraders);
    syncTradersToV2(newTraders);
  };

  const removeTrader = (index: number) => {
    const newTraders = traders.filter((_, i) => i !== index);
    setTraders(newTraders);
    syncTradersToV2(newTraders);
  };

  const removeZeroScoreTraders = () => {
    const filteredTraders = traders.filter(trader => trader.smartScore !== 0);
    if (traders.length === filteredTraders.length) {
      toast.info("No traders with zero smart scores found");
      return;
    }
    const removedCount = traders.length - filteredTraders.length;
    setTraders(filteredTraders);
    syncTradersToV2(filteredTraders);
    toast.success(`Removed ${removedCount} trader${removedCount > 1 ? 's' : ''} with zero smart scores`);
  };

  const updateTrader = (index: number, field: keyof Trader, value: string | number) => {
    const updated = [...traders];
    // Ensure correct typing for value based on field
    let processedValue = value;
    if ((field === 'smartScore' || field === 'dollarPosition') && typeof value === 'string') {
        processedValue = parseFloat(value) || 0; // Ensure it's a number, default to 0 if parse fails
    } else if (field === 'sentiment' && typeof value !== 'string') {
        // This case should ideally not happen if using Select, but as a safeguard
        processedValue = String(value) as 'yes' | 'no'; 
    }
    
    updated[index] = {
      ...updated[index],
      [field]: processedValue
    };
    setTraders(updated);
    syncTradersToV2(updated);
  };

  // Helper function to sync traders to V2 calculator
  const syncTradersToV2 = (traderList: Trader[]) => {
    const customEvent = new CustomEvent('v1-traders-updated', { 
      detail: { traders: traderList } 
    });
    window.dispatchEvent(customEvent);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, sentiment: 'yes' | 'no') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsedTraders = await parseTraderCSV(content, sentiment);
        
        // Option 1: Replace only traders of the specified sentiment
        // const filteredTraders = traders.filter(t => t.sentiment !== sentiment);
        // const newTraders = [...filteredTraders, ...parsedTraders];
        
        // Option 2: Append new traders, potentially creating duplicates or mixing sentiments if not careful
        // For simplicity and to match "upload YES" and "upload NO" usually implying replacement of that segment:
        const otherSentimentTraders = traders.filter(t => t.sentiment !== sentiment);
        const newTradersList = [...otherSentimentTraders, ...parsedTraders];

        setTraders(newTradersList);
        
        // Dispatch custom event to notify other components about new traders
        syncTradersToV2(newTradersList);
        
        toast.success(`${sentiment.toUpperCase()} sentiment CSV file uploaded and traders updated.`);
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
    if (filteredTraders.length === 0) {
      toast.info(`No traders with '${sentiment.toUpperCase()}' sentiment to download.`);
      return;
    }
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
    if (!result) {
      toast.error("No results to download.");
      return;
    }
    
    const lines = [
      'Calculation Results,Value',
      `Gravity Score,${result.gravityScore.toFixed(4)}`,
      `Confidence Level,${result.confidenceLevel}`,
      `Average Smart Score,${result.avgSmartScore.toFixed(2)}`,
      `Raw Yes Probability,${(result.rawYesProb * 100).toFixed(2)}%`,
      `Calibrated Yes Probability,${(result.calibratedYesProb * 100).toFixed(2)}%`,
      `Probability Range,${(result.probabilityRange.lower * 100).toFixed(2)}% - ${(result.probabilityRange.upper * 100).toFixed(2)}%`,
      '',
      'Trader Influence Breakdown',
      'Trader Name,Smart Score,Dollar Position,Sentiment,Weight,Influence %'
    ];
    
    result.traderInfluences.forEach(trader => {
      lines.push([
        trader.name || `Trader ${result.traderInfluences.indexOf(trader) + 1}`,
        trader.smartScore,
        trader.dollarPosition.toFixed(2),
        trader.sentiment,
        trader.weight.toFixed(4),
        `${trader.influencePercent.toFixed(2)}%`
      ].join(','));
    });
    
    const csvContent = lines.join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vote-gravity-v1-results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('V1 Calculation results downloaded successfully');
  };

  const getNumericConfidence = (confidenceLevel: string): number => {
    if (!confidenceLevel) return 0;
    if (confidenceLevel.includes("High")) return 85;
    if (confidenceLevel.includes("Medium")) return 55;
    if (confidenceLevel.includes("Low")) return 25; // Assuming "Low" if not High/Medium
    return 25; // Default
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getEdgeColor = (edge: number): string => {
    if (edge > 0.001) return 'text-green-600 dark:text-green-400'; // Adjusted for floating point
    if (edge < -0.001) return 'text-red-600 dark:text-red-400';  // Adjusted for floating point
    return 'text-gray-600 dark:text-gray-400';
  };

  // For now, we return a placeholder to make the component valid.
  return (
    <div className="p-4 border rounded-lg h-full flex flex-col" suppressHydrationWarning={true}>
      <Head>
        <title>V1: Smart Score Vote Gravity</title>
      </Head>
      <h2 className="text-xl font-semibold mb-4 text-center">Vote Gravity Calculator (V1)</h2>

      {/* Market Parameters & Global Actions */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Market & Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="v1MarketPrice">Market Price (%)</Label>
              <Input 
                id="v1MarketPrice" 
                type="number" 
                value={marketPrice} 
                onChange={(e) => setMarketPrice(Number(e.target.value))} 
                placeholder="e.g., 50"
              />
            </div>
            <div>
              <Label htmlFor="v1Bankroll">Bankroll ($)</Label>
              <Input 
                id="v1Bankroll" 
                type="number" 
                value={bankroll} 
                onChange={(e) => setBankroll(Number(e.target.value))} 
                placeholder="e.g., 100"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={addTrader} size="sm"><PlusCircle className="mr-2 h-4 w-4"/>Add Trader</Button>
            <Button onClick={removeZeroScoreTraders} variant="outline" size="sm"><Trash2 className="mr-2 h-4 w-4"/>Remove Zero Scores</Button>
            <Button onClick={handleDownloadResults} variant="outline" size="sm"><FileDown className="mr-2 h-4 w-4"/>Download Results</Button>
          </div>
        </CardContent>
      </Card>

      {/* Trader Management */}
      <Card className="mb-4 flex-grow flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg">Trader Data ({traders.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col space-y-3">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label htmlFor="uploadYesCsv" className="mb-1 block text-sm font-medium">Upload YES Traders CSV</Label>
              <div className="flex items-center">
                <Input id="uploadYesCsv" type="file" accept=".csv" onChange={(e) => handleFileUpload(e, 'yes')} className="text-xs p-1 h-auto"/>
                <Button onClick={() => handleDownload('yes')} variant="ghost" size="icon" title="Download YES Traders CSV">
                  <Download className="h-4 w-4"/>
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="uploadNoCsv" className="mb-1 block text-sm font-medium">Upload NO Traders CSV</Label>
              <div className="flex items-center">
                <Input id="uploadNoCsv" type="file" accept=".csv" onChange={(e) => handleFileUpload(e, 'no')} className="text-xs p-1 h-auto"/>
                <Button onClick={() => handleDownload('no')} variant="ghost" size="icon" title="Download NO Traders CSV">
                  <Download className="h-4 w-4"/>
                </Button>
              </div>
            </div>
          </div>
          
          <div className="overflow-auto flex-grow" style={{maxHeight: '300px'}}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead>Smart Score</TableHead>
                  <TableHead>Dollar Pos.</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {traders.map((trader, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        type="text" 
                        value={trader.name || ''} 
                        onChange={(e) => updateTrader(index, 'name', e.target.value)} 
                        placeholder="Trader Name"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={trader.sentiment}
                        onValueChange={(value) => updateTrader(index, 'sentiment', value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select"></SelectValue>
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
                        min="0"
                        max="100"
                        value={trader.smartScore || 0}
                        onChange={(e) => updateTrader(index, 'smartScore', e.target.value)}
                        placeholder="0-100"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={trader.dollarPosition || 0}
                        onChange={(e) => updateTrader(index, 'dollarPosition', e.target.value)}
                        placeholder="0"
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTrader(index)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Results Display */}
      {result && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">Calculation Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Gravity Score</p>
                <p className="text-2xl font-bold">{result.gravityScore.toFixed(4)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Confidence Level</p>
                <p className="text-lg">{result.confidenceLevel}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Raw YES Probability</p>
                <p className="text-xl">{(result.rawYesProb * 100).toFixed(2)}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Calibrated YES Probability</p>
                <p className="text-xl font-semibold">{(result.calibratedYesProb * 100).toFixed(2)}%</p>
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium">Probability Range</p>
              <p className="text-lg">
                {(result.probabilityRange.lower * 100).toFixed(2)}% - {(result.probabilityRange.upper * 100).toFixed(2)}%
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Kelly Edge</p>
              <p className={`text-lg ${getEdgeColor(result.kellyBetting?.edge || 0)}`}>
                {((result.kellyBetting?.edge || 0) * 100).toFixed(2)}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}