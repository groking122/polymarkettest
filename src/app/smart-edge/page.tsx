"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Upload, Download, ChevronDown, ChevronUp, FileDown, HelpCircle, ImageIcon, FileIcon, AlertTriangle } from "lucide-react";
import { 
  calculateSmartEdge, 
  calculateArbitrageEdge, 
  type Trader, 
  type SmartEdgeResult, 
  type ArbitrageEdgeResult 
} from "@/utils/calculateSmartEdgeAdvanced";
import { setCalculationMode, activeConfig } from "@/utils/smartEdgeConfig";
import { parseTraderCSV, generateTraderCSV, getExampleCSV } from "@/utils/csvParserV1.2";
import { calculateArbitrageStrategy } from "@/utils/calculateArbitrageStrategy";
import Head from 'next/head';
import { CrowdProbabilityDisplay } from '@/components/CrowdProbabilityDisplay';
import TraderVisualization from '@/components/TraderVisualization';
import ArbitrageEdgeDisplay from '@/components/ArbitrageEdgeDisplay';
import ArbitrageStrategyCard from '@/components/ArbitrageStrategyCard';
import SmartEdgeConfigSwitch from '@/components/SmartEdgeConfigSwitch';
import { toast } from "sonner";
import React from "react";
import Link from "next/link";

export default function SmartEdgeCalculatorPage() {
  const [mounted, setMounted] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showCalculationDetails, setShowCalculationDetails] = useState(false);
  const [showAllTraders, setShowAllTraders] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
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
  const [arbitrageStrategyType, setArbitrageStrategyType] = useState<'conservative' | 'standard' | 'aggressive'>('conservative');
  const [arbitrageStrategy, setArbitrageStrategy] = useState<any>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && traders.length > 0) {
      try {
        // Sanitize inputs to ensure valid calculations
        const validTraders = traders.map(trader => ({
          ...trader,
          name: trader.name || `Trader ${traders.indexOf(trader) + 1}`,
          smartScore: Number(trader.smartScore) || 0,
          dollarPosition: Number(trader.dollarPosition) || 0,
          entryPrice: trader.entryPrice !== undefined ? Number(trader.entryPrice) : marketPrice / 100,
          realizedPnl: trader.realizedPnl !== undefined ? Number(trader.realizedPnl) : 0,
          unrealizedPnl: trader.unrealizedPnl !== undefined ? Number(trader.unrealizedPnl) : 0,
          supplyOwnership: trader.supplyOwnership !== undefined ? Number(trader.supplyOwnership) : 0
        }));
        
        // Perform calculations with sanitized data
        const calculation = calculateSmartEdge(validTraders, marketPrice, bankroll);
        setResult(calculation);
        
        // Calculate arbitrage edge
        if (calculation.calibratedYesProb !== undefined && !isNaN(calculation.calibratedYesProb)) {
          const arbitrage = calculateArbitrageEdge(
            calculation.calibratedYesProb, 
            marketPrice, 
            bankroll,
            0.25 // Quarter Kelly
          );
          setArbitrageEdge(arbitrage);
          
          // Recalculate arbitrage strategy
          const strategy = calculateArbitrageStrategy({
            smartYesProb: calculation.calibratedYesProb,
            marketYesPrice: marketPrice / 100,
            confidence: calculation.confidenceFactor || 0,
            bankroll: bankroll,
            strategy: arbitrageStrategyType
          });
          
          setArbitrageStrategy(strategy);
        }
      } catch (error) {
        console.error("Error in calculation useEffect:", error);
      }
    }
  }, [traders, mounted, marketPrice, bankroll, arbitrageStrategyType]);

  const addTrader = () => {
    setTraders([...traders, { 
      name: "New Trader", 
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

  const handleDownloadAsImage = async () => {
    try {
      if (!contentRef.current) return;
      
      setIsGeneratingImage(true);
      
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      toast.info("Generating image... This may take a moment for complex reports.");
      
      // Create a clone of the content to modify for export
      const clone = contentRef.current.cloneNode(true) as HTMLElement;
      
      // Apply a simple style reset to avoid color parsing issues
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(clone);
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.backgroundColor = '#ffffff';
      
      // Add custom styles to override problematic colors
      const style = document.createElement('style');
      style.textContent = `
        * {
          color-scheme: light;
          color: black !important;
          background-color: white !important;
          background: white !important;
          border-color: #ddd !important;
          box-shadow: none !important;
        }
        .text-green-600, .text-green-400 {
          color: #16a34a !important;
        }
        .text-red-600, .text-red-400 {
          color: #dc2626 !important;
        }
        .text-blue-600, .text-blue-400 {
          color: #2563eb !important;
        }
        .text-gray-600, .text-gray-400, .text-gray-500 {
          color: #4b5563 !important;
        }

        /* Hide download section and other UI elements not needed in export */
        .download-section, .mobile-menu, .hidden-in-export {
          display: none !important;
        }
      `;
      
      clone.appendChild(style);
      document.body.appendChild(tempDiv);
      
      const canvas = await html2canvas(clone, {
        scale: 2, // Higher resolution
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: "#ffffff",
        removeContainer: true
      });
      
      // Remove the temporary element
      document.body.removeChild(tempDiv);
      
      // Create download link
      const link = document.createElement('a');
      link.download = `smart-edge-results-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success("Image downloaded successfully!");
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDownloadAsPDF = async () => {
    try {
      if (!contentRef.current) return;
      
      setIsGeneratingPDF(true);
      
      // Dynamically import html2pdf
      const html2pdf = (await import('html2pdf.js')).default;
      
      toast.info("Generating PDF... This may take a moment for complex reports.");
      
      // Create a clone of the content to modify for export
      const clone = contentRef.current.cloneNode(true) as HTMLElement;
      
      // Apply a simple style reset to avoid color parsing issues
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(clone);
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.backgroundColor = '#ffffff';
      
      // Add custom styles to override problematic colors
      const style = document.createElement('style');
      style.textContent = `
        * {
          color-scheme: light;
          color: black !important;
          background-color: white !important;
          background: white !important;
          border-color: #ddd !important;
          box-shadow: none !important;
        }
        .text-green-600, .text-green-400 {
          color: #16a34a !important;
        }
        .text-red-600, .text-red-400 {
          color: #dc2626 !important;
        }
        .text-blue-600, .text-blue-400 {
          color: #2563eb !important;
        }
        .text-gray-600, .text-gray-400, .text-gray-500 {
          color: #4b5563 !important;
        }

        /* Hide download section and other UI elements not needed in export */
        .download-section, .mobile-menu, .hidden-in-export {
          display: none !important;
        }
      `;
      
      clone.appendChild(style);
      document.body.appendChild(tempDiv);
      
      const opt = {
        margin: 10,
        filename: `smart-edge-results-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as 'portrait' }
      };
      
      await html2pdf().set(opt).from(clone).save();
      
      // Remove the temporary element
      document.body.removeChild(tempDiv);
      
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Add this function to handle toggling the trader visibility
  const toggleTraderVisibility = () => {
    setShowAllTraders(prev => !prev);
  };

  // Handler to change strategy type
  const handleStrategyChange = (type: 'conservative' | 'standard' | 'aggressive') => {
    setArbitrageStrategyType(type);
  };

  if (!mounted) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto" ref={contentRef}>
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
      
      {/* Smart Edge Config Switch */}
      <div className="max-w-xl mx-auto mb-6">
        <SmartEdgeConfigSwitch />
        
        {/* Add clickable buttons to toggle modes */}
        <div className="flex justify-center mt-4 gap-4">
          <Button
            variant={activeConfig.useAdvancedMode ? "outline" : "default"}
            className="w-1/2"
            onClick={() => {
              setCalculationMode(false);
              // Recalculate with new mode
              if (traders.length > 0) {
                try {
                  // Sanitize inputs to ensure valid calculations
                  const validTraders = traders.map(trader => ({
                    ...trader,
                    name: trader.name || `Trader ${traders.indexOf(trader) + 1}`,
                    smartScore: Number(trader.smartScore) || 0,
                    dollarPosition: Number(trader.dollarPosition) || 0,
                    entryPrice: trader.entryPrice !== undefined ? Number(trader.entryPrice) : marketPrice / 100,
                    realizedPnl: trader.realizedPnl !== undefined ? Number(trader.realizedPnl) : 0,
                    unrealizedPnl: trader.unrealizedPnl !== undefined ? Number(trader.unrealizedPnl) : 0,
                    supplyOwnership: trader.supplyOwnership !== undefined ? Number(trader.supplyOwnership) : 0
                  }));
                  
                  // Perform calculations with sanitized data
                  const calculation = calculateSmartEdge(validTraders, marketPrice, bankroll);
                  setResult(calculation);
                  
                  // Calculate arbitrage edge
                  if (calculation.calibratedYesProb !== undefined && !isNaN(calculation.calibratedYesProb)) {
                    const arbitrage = calculateArbitrageEdge(
                      calculation.calibratedYesProb, 
                      marketPrice, 
                      bankroll,
                      0.25
                    );
                    setArbitrageEdge(arbitrage);
                    
                    // Recalculate arbitrage strategy
                    const strategy = calculateArbitrageStrategy({
                      smartYesProb: calculation.calibratedYesProb,
                      marketYesPrice: marketPrice / 100,
                      confidence: calculation.confidenceFactor || 0,
                      bankroll: bankroll,
                      strategy: arbitrageStrategyType
                    });
                    
                    setArbitrageStrategy(strategy);
                  }
                  
                  toast.success("Switched to Classic Mode");
                } catch (error) {
                  console.error("Error switching to Classic Mode:", error);
                  toast.error("Error switching mode: " + (error instanceof Error ? error.message : String(error)));
                }
              } else {
                toast.info("Switched to Classic Mode (no data to calculate)");
              }
            }}
          >
            Classic Mode
          </Button>
          <Button
            variant={activeConfig.useAdvancedMode ? "default" : "outline"}
            className="w-1/2"
            onClick={() => {
              setCalculationMode(true);
              // Recalculate with new mode
              if (traders.length > 0) {
                try {
                  // Sanitize inputs to ensure valid calculations
                  const validTraders = traders.map(trader => ({
                    ...trader,
                    name: trader.name || `Trader ${traders.indexOf(trader) + 1}`,
                    smartScore: Number(trader.smartScore) || 0,
                    dollarPosition: Number(trader.dollarPosition) || 0,
                    entryPrice: trader.entryPrice !== undefined ? Number(trader.entryPrice) : marketPrice / 100,
                    realizedPnl: trader.realizedPnl !== undefined ? Number(trader.realizedPnl) : 0,
                    unrealizedPnl: trader.unrealizedPnl !== undefined ? Number(trader.unrealizedPnl) : 0,
                    supplyOwnership: trader.supplyOwnership !== undefined ? Number(trader.supplyOwnership) : 0
                  }));
                  
                  // Perform calculations with sanitized data
                  const calculation = calculateSmartEdge(validTraders, marketPrice, bankroll);
                  setResult(calculation);
                  
                  // Calculate arbitrage edge
                  if (calculation.calibratedYesProb !== undefined && !isNaN(calculation.calibratedYesProb)) {
                    const arbitrage = calculateArbitrageEdge(
                      calculation.calibratedYesProb, 
                      marketPrice, 
                      bankroll,
                      0.25
                    );
                    setArbitrageEdge(arbitrage);
                    
                    // Recalculate arbitrage strategy
                    const strategy = calculateArbitrageStrategy({
                      smartYesProb: calculation.calibratedYesProb,
                      marketYesPrice: marketPrice / 100,
                      confidence: calculation.confidenceFactor || 0,
                      bankroll: bankroll,
                      strategy: arbitrageStrategyType
                    });
                    
                    setArbitrageStrategy(strategy);
                  }
                  
                  toast.success("Switched to Advanced Mode");
                } catch (error) {
                  console.error("Error switching to Advanced Mode:", error);
                  toast.error("Error switching mode: " + (error instanceof Error ? error.message : String(error)));
                }
              } else {
                toast.info("Switched to Advanced Mode (no data to calculate)");
              }
            }}
          >
            Advanced Mode ✨
          </Button>
        </div>
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

              {/* Add Advanced Mode section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-200 dark:border-blue-800">
                <h5 className="font-medium text-blue-700 dark:text-blue-300">🚀 Advanced Mode Enhancements</h5>
                <p className="text-sm mt-1 mb-2">
                  Advanced Mode implements these formula improvements:
                </p>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">1. Logarithmic Score Scaling:</span>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-md mt-1 text-xs">
                      <code>
                        // Classic: Exponential scaling (can grow too quickly)<br/>
                        scoreWeight = exp(smartScore ÷ 25)<br/><br/>
                        
                        // Advanced: Logarithmic scaling (more balanced growth)<br/>
                        scoreWeight = log(1 + smartScore) // For positive scores<br/>
                        scoreWeight = -log(1 + |smartScore|) // For negative scores
                      </code>
                    </div>
                  </div>
                  <div className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                    Handles negative scores symmetrically and prevents exponential blowout with large values.
                  </div>
                  
                  <div>
                    <span className="font-medium">2. PnL Influence Dampening:</span>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-md mt-1 text-xs">
                      <code>
                        // Classic: Hyperbolic tangent scaling<br/>
                        pnlMultiplier = 1 + 0.5 × tanh(realizedPnl ÷ 1000) + 0.5 × tanh(unrealizedPnl ÷ 1000)<br/><br/>
                        
                        // Advanced: Logarithmic PnL scaling<br/>
                        logPnl = sign(pnl) × log10(1 + |pnl| ÷ 100) ÷ 2<br/>
                        pnlMultiplier = 1 + 0.5 × logPnl(realizedPnl) + 0.5 × logPnl(unrealizedPnl)
                      </code>
                    </div>
                  </div>
                  <div className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                    Division by 2 intentionally dampens the effect to keep multipliers stable and prevent PnL from dominating.
                  </div>
                  
                  <div>
                    <span className="font-medium">3. Thresholded Entry Advantage:</span>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-md mt-1 text-xs">
                      <code>
                        // Classic: Linear scaling with wide range<br/>
                        entryMultiplier = 1 + 0.4 × max(-0.5, min(1, entryAdvantage))<br/><br/>
                        
                        // Advanced: Minimum effect threshold & tighter clamping<br/>
                        if (|entryAdvantage| &lt; 0.01) entryMultiplier = 1;<br/>
                        else entryMultiplier = 1 + 0.4 × clamp(entryAdvantage, -0.05, 0.05);
                      </code>
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-medium">4. Non-linear Confidence:</span>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-md mt-1 text-xs">
                      <code>
                        // Classic: Linear confidence factor<br/>
                        confidenceFactor = rawConfidenceFactor<br/><br/>
                        
                        // Advanced: Power scaling for better differentiation<br/>
                        confidenceFactor = Math.pow(rawConfidenceFactor, 0.6)
                      </code>
                    </div>
                  </div>
                  <div className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                    Boosts weak signals slightly while softening overconfident spikes for more balanced calibration.
                  </div>
                  
                  <div>
                    <span className="font-medium">5. Smoothed Edge Detection:</span>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-md mt-1 text-xs">
                      <code>
                        // Classic: Hard threshold cutoff<br/>
                        if (edge {'>'} THRESHOLD) bet;<br/><br/>
                        
                        // Advanced: Logistic function for smoother transition<br/>
                        logistic(x) = 1 / (1 + exp(-k × (x - threshold)))<br/>
                        scaledEdge = edge × logistic(edge, 20, THRESHOLD);
                      </code>
                    </div>
                  </div>
                  <div className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                    Uses soft thresholding with THRESHOLD (0.02) as the ramp start point for gradual transition.
                  </div>
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Trader Input</CardTitle>
              <CardDescription>Enter trader details with enhanced metrics for better prediction accuracy</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={toggleTraderVisibility}>
              {showAllTraders ? 'Show Less' : 'Show All'}
            </Button>
          </div>
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
              {/* Show first 10 traders or all if showAllTraders is true */}
              {(showAllTraders ? traders : traders.slice(0, 5)).map((trader, index) => (
                <React.Fragment key={`trader-container-${index}`}>
                  <TableRow key={`trader-${index}`}>
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
                    <TableRow key={`trader-advanced-${index}`} className="bg-gray-50 dark:bg-gray-800/50">
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
                            <div className="flex items-center gap-2">
                              <Input
                                id={`supply-ownership-${index}`}
                                type="number" 
                                min={0}
                                max={1}
                                step={0.01}
                                placeholder="e.g., 0.17"
                                value={trader.supplyOwnership !== undefined ? trader.supplyOwnership : ''}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? undefined : Number(e.target.value);
                                  updateTrader(index, 'supplyOwnership', value as any);
                                }}
                              />
                              <span>(decimal)</span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Enter as decimal: 0.17 = 17% of market owned (shown as 'pct' in CSV files)
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}

              {/* Show the "Show More/Less" button only when traders > 5 */}
              {!showAllTraders && traders.length > 5 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center p-2">
                    <Button 
                      onClick={toggleTraderVisibility} 
                      variant="ghost" 
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Show {traders.length - 5} More Traders
                    </Button>
                  </TableCell>
                </TableRow>
              )}

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
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Enter the YES probability from the market (e.g., 75 means the market thinks there's a 75% chance of YES outcome)
              </p>
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
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Your total available capital for betting. Smart Edge will calculate optimal bet sizes based on this amount.
              </p>
            </div>
          </div>

          {/* Add manual refresh button */}
          <div className="flex justify-end mt-4">
            <Button 
              onClick={() => {
                try {
                  // Force recalculation of results
                  if (traders.length > 0) {
                    // Sanitize inputs to ensure valid calculations
                    const validTraders = traders.map(trader => ({
                      ...trader,
                      smartScore: Number(trader.smartScore) || 0,
                      dollarPosition: Number(trader.dollarPosition) || 0,
                      entryPrice: trader.entryPrice !== undefined ? Number(trader.entryPrice) : marketPrice / 100,
                      realizedPnl: trader.realizedPnl !== undefined ? Number(trader.realizedPnl) : 0,
                      unrealizedPnl: trader.unrealizedPnl !== undefined ? Number(trader.unrealizedPnl) : 0,
                      supplyOwnership: trader.supplyOwnership !== undefined ? Number(trader.supplyOwnership) : 0
                    }));
                    
                    // Log sanitized data for debugging
                    console.log("Refreshing calculations with traders:", validTraders);
                    console.log("Market Price:", marketPrice);
                    console.log("Bankroll:", bankroll);
                    
                    // Perform calculations with sanitized data
                    const calculation = calculateSmartEdge(validTraders, marketPrice, bankroll);
                    setResult(calculation);
                    
                    // Calculate arbitrage edge
                    const arbitrage = calculateArbitrageEdge(
                      calculation.calibratedYesProb, 
                      marketPrice, 
                      bankroll,
                      0.25 // Quarter Kelly
                    );
                    setArbitrageEdge(arbitrage);

                    // Recalculate arbitrage strategy
                    if (calculation.calibratedYesProb !== undefined && !isNaN(calculation.calibratedYesProb)) {
                      const strategy = calculateArbitrageStrategy({
                        smartYesProb: calculation.calibratedYesProb,
                        marketYesPrice: marketPrice / 100,
                        confidence: calculation.confidenceFactor || 0,
                        bankroll: bankroll,
                        strategy: arbitrageStrategyType
                      });
                      
                      setArbitrageStrategy(strategy);
                    }
                    
                    toast.success("Calculations refreshed successfully");
                  } else {
                    toast.error("No traders to calculate. Please add trader data first.");
                  }
                } catch (error) {
                  console.error("Error refreshing calculations:", error);
                  toast.error("Failed to refresh calculations: " + (error instanceof Error ? error.message : String(error)));
                }
              }}
              className="flex items-center gap-2"
            >
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6"></path>
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                <path d="M3 12a9 9 0 0 0 6.7 15L13 21"></path>
                <path d="M13 21h8v-8"></path>
              </svg>
              Refresh Calculations
            </Button>
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
                        
                        {/* Collapsible bet sizing explanation */}
                        <details className="text-sm border border-gray-200 dark:border-gray-700 rounded-md mt-3">
                          <summary className="bg-gray-50 dark:bg-gray-800 px-4 py-2 cursor-pointer font-medium flex items-center justify-between">
                            <span>How Bet Sizing Works</span>
                            <ChevronDown className="h-4 w-4" />
                          </summary>
                          <div className="p-4 bg-white dark:bg-gray-900 space-y-2">
                            <p>Smart Edge combines Kelly criterion with confidence-based limits:</p>
                            
                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                              <h4 className="font-medium mb-1">Confidence-Based Limits:</h4>
                              <ul className="list-disc pl-5 space-y-1">
                                <li><span className="font-medium">Low Confidence:</span> Maximum 2% of bankroll</li>
                                <li><span className="font-medium">Medium Confidence:</span> Maximum 5% of bankroll</li>
                                <li><span className="font-medium">High Confidence:</span> Maximum 10% of bankroll</li>
                              </ul>
                            </div>
                            
                            <p>The final bet size is the smaller of:</p>
                            <ul className="list-disc pl-5 space-y-1">
                              <li>Quarter-Kelly bet size (conservative Kelly calculation)</li>
                              <li>The confidence-based maximum</li>
                            </ul>
                            
                            <div className="text-xs text-gray-500 mt-2">
                              <p>Advanced Mode applies additional edge scaling for small edges to prevent overbetting.</p>
                              <p>Both modes use the same confidence-based limits.</p>
                            </div>
                          </div>
                        </details>
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

          {/* Arbitrage Strategy Card */}
          <Card className="mb-6 border-4 border-purple-500 bg-purple-50 dark:bg-purple-900/20">
            <CardHeader>
              <CardTitle className="text-xl text-purple-700 dark:text-purple-300">
                Advanced Arbitrage Strategy
                {arbitrageStrategy ? (
                  <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">AVAILABLE</span>
                ) : (
                  <span className="ml-2 text-sm bg-red-100 text-red-800 px-2 py-1 rounded-full">NOT CALCULATED</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {arbitrageStrategy ? (
                <ArbitrageStrategyCard 
                  strategy={arbitrageStrategy}
                  marketPrice={marketPrice}
                  bankroll={bankroll}
                  onStrategyChange={handleStrategyChange}
                />
              ) : (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-yellow-800 dark:text-yellow-400">Strategy Not Available</h3>
                      <div className="text-sm text-yellow-700 dark:text-yellow-500 mt-1">
                        Possible causes:
                        <ul className="list-disc list-inside mt-1">
                          <li>Calculation hasn't completed yet</li>
                          <li>Edge is too small (less than 2%)</li>
                          <li>Confidence is too low (less than 20%)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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

      {/* Download section */}
      <Card className="mb-6 download-section">
        <CardHeader>
          <CardTitle>Download Results</CardTitle>
          <CardDescription>Save your Smart Edge analysis as an image or PDF document</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={handleDownloadAsImage} 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              disabled={isGeneratingImage || isGeneratingPDF}
            >
              {isGeneratingImage ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-opacity-50 border-t-transparent rounded-full mr-2" />
                  Generating Image...
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4" />
                  Download as Image
                </>
              )}
            </Button>
            <Button 
              onClick={handleDownloadAsPDF}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
              disabled={isGeneratingPDF || isGeneratingImage}
            >
              {isGeneratingPDF ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-opacity-50 border-t-transparent rounded-full mr-2" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <FileIcon className="h-4 w-4" />
                  Download as PDF
                </>
              )}
            </Button>
          </div>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <HelpCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p><strong>Tips for best results:</strong></p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Wait for all calculations to complete before downloading</li>
                  <li>Image format is best for sharing on social media</li>
                  <li>PDF format provides better quality for printing</li>
                  <li>Generation may take a few moments for detailed reports</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 