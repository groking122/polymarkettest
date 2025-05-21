'use client';

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { BarChart, TrendingUp, TrendingDown, AlertTriangle, Target, Ban, AlertCircle } from "lucide-react";

interface ArbitrageStrategyCardProps {
  strategy: {
    direction: 'YES' | 'NO' | 'NONE';
    edge: number;
    confidence: number;
    stake: number;
    strategy: 'conservative' | 'standard' | 'aggressive';
    takeProfitTarget: number;
    stopLossLimit: number;
  };
  marketPrice: number;
  bankroll: number;
  onStrategyChange?: (strategy: 'conservative' | 'standard' | 'aggressive') => void;
}

export default function ArbitrageStrategyCard({ 
  strategy, 
  marketPrice, 
  bankroll,
  onStrategyChange 
}: ArbitrageStrategyCardProps) {
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const getDirectionColor = (direction: string) => {
    if (direction === 'YES') return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    if (direction === 'NO') return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  };

  const getStrategyColor = (strategyType: string) => {
    if (strategyType === 'aggressive') return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    if (strategyType === 'standard') return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
  };

  const getEdgeIndicator = () => {
    if (strategy.direction === 'NONE') return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    if (strategy.edge < 0.05) return <TrendingUp className="h-5 w-5 text-blue-500" />;
    if (strategy.edge < 0.10) return <TrendingUp className="h-5 w-5 text-green-500" />;
    return <TrendingUp className="h-5 w-5 text-green-600 font-bold" />;
  };

  const getDirectionIcon = () => {
    if (strategy.direction === 'YES') return <TrendingUp className="h-5 w-5 text-green-500" />;
    if (strategy.direction === 'NO') return <TrendingDown className="h-5 w-5 text-red-500" />;
    return <Ban className="h-5 w-5 text-gray-500" />;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <CardTitle className="text-lg">Arbitrage Strategy</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={getDirectionColor(strategy.direction)}>
              {strategy.direction !== 'NONE' 
                ? `${strategy.direction} @ ${strategy.direction === 'YES' 
                  ? formatPercent(marketPrice/100) 
                  : formatPercent(1 - marketPrice/100)}`
                : 'NO POSITION'}
            </Badge>
            <Badge variant="outline" className={getStrategyColor(strategy.strategy)}>
              {strategy.strategy.charAt(0).toUpperCase() + strategy.strategy.slice(1)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {strategy.direction !== 'NONE' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {getEdgeIndicator()}
                    <span className="font-medium">Edge:</span>
                  </div>
                  <span className="font-bold">{formatPercent(strategy.edge)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <BarChart className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Stake:</span>
                  </div>
                  <span className="font-bold">{formatCurrency(strategy.stake)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-purple-500" />
                    <span className="font-medium">Confidence:</span>
                  </div>
                  <span className="font-bold">{formatPercent(strategy.confidence)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Take Profit:</span>
                  </div>
                  <span className="font-bold">{formatPercent(strategy.takeProfitTarget)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span className="font-medium">Stop Loss:</span>
                  </div>
                  <span className="font-bold">{formatPercent(strategy.stopLossLimit)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {getDirectionIcon()}
                    <span className="font-medium">Direction:</span>
                  </div>
                  <span className="font-bold">{strategy.direction}</span>
                </div>
              </div>
            </div>

            {onStrategyChange && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="space-y-2">
                  <Label htmlFor="strategy-select">Risk Strategy</Label>
                  <Select 
                    value={strategy.strategy} 
                    onValueChange={(value: 'conservative' | 'standard' | 'aggressive') => onStrategyChange(value)}
                  >
                    <SelectTrigger id="strategy-select" className="w-full">
                      <SelectValue placeholder="Select a strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative (25% Kelly)</SelectItem>
                      <SelectItem value="standard">Standard (50% Kelly)</SelectItem>
                      <SelectItem value="aggressive">Aggressive (Full Kelly)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800 dark:text-yellow-400">No Arbitrage Opportunity</h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-500 mt-1">
                  Either the edge ({formatPercent(Math.abs(strategy.edge))}) is too small or confidence ({formatPercent(strategy.confidence)}) is too low to recommend a trade.
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-500 mt-1">
                  We recommend an edge of at least 2% and confidence of at least 20% before placing trades.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 