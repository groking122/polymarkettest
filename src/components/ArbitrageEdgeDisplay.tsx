import React from 'react';
import { Card } from "@/components/ui/card";
import { ArbitrageEdgeResult } from '@/utils/calculateSmartEdge';

interface ArbitrageEdgeDisplayProps {
  arbitrageEdge: ArbitrageEdgeResult;
  marketPrice: number;
  formatCurrency: (amount: number) => string;
}

const ArbitrageEdgeDisplay: React.FC<ArbitrageEdgeDisplayProps> = ({
  arbitrageEdge,
  marketPrice,
  formatCurrency,
}) => {
  const getEdgeColor = (edge: number): string => {
    if (edge > 0) return 'text-green-600 dark:text-green-400';
    if (edge < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getConfidenceLevel = (): string => {
    const absEdge = Math.abs(arbitrageEdge.edge);
    if (absEdge > 0.1) return 'High';
    if (absEdge > 0.05) return 'Medium';
    if (absEdge > 0.02) return 'Low';
    return 'Very Low';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h3 className="text-lg font-medium flex items-center">
          <span className="mr-2">💸</span> Arbitrage Edge Assessment
        </h3>
        {arbitrageEdge.hasEdge && (
          <div className="text-sm px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full">
            Price-based opportunity
          </div>
        )}
      </div>

      <Card className="p-4 border border-gray-200 dark:border-gray-800">
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Market Price:</div>
              <div className="font-medium">{marketPrice}% YES</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Smart Estimate:</div>
              <div className="font-medium">{(arbitrageEdge.smartYesProb * 100).toFixed(1)}% YES</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Edge:</div>
              <div className={`font-medium ${getEdgeColor(arbitrageEdge.edge)}`}>
                {arbitrageEdge.edge > 0 
                  ? `+${(arbitrageEdge.edge * 100).toFixed(1)}% (${arbitrageEdge.betDirection.toUpperCase()})`
                  : '0% (None)'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Confidence:</div>
              <div className="font-medium">{getConfidenceLevel()}</div>
            </div>
          </div>

          {arbitrageEdge.hasEdge && (
            <>
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <div className="font-medium">Bet Recommendation:</div>
                  <div className={`font-medium ${
                    arbitrageEdge.betDirection === 'yes' 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {arbitrageEdge.betDirection === 'yes' ? 'Bet YES' : 'Bet NO'}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm">Recommended Size:</div>
                <div className="font-medium">
                  {formatCurrency(arbitrageEdge.stake)} ({arbitrageEdge.bankrollPercentage.toFixed(1)}% of bankroll)
                </div>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400 italic mt-2">
                This is a pricing-based opportunity that exists regardless of prediction confidence.
              </div>
            </>
          )}
          
          {!arbitrageEdge.hasEdge && (
            <div className="text-sm text-gray-600 dark:text-gray-400 italic mt-2">
              No significant arbitrage edge detected. The market price is fairly aligned with the expected value.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ArbitrageEdgeDisplay; 