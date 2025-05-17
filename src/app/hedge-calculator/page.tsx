"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Head from 'next/head';
import ProfitRulePopup from '@/components/ProfitRulePopup';

interface HedgeResults {
  arbitrage: boolean;
  message: string;
  amountYES?: string;
  amountNO?: string;
  netYES?: string;
  netNO?: string;
  returnMessage?: string | null;
}

export default function HedgeCalculator() {
  const [yesPrice, setYesPrice] = useState(8);
  const [noPrice, setNoPrice] = useState(79);
  const [totalBudget, setTotalBudget] = useState(2.5);
  const [currentReturn, setCurrentReturn] = useState(0.48);
  const [invested, setInvested] = useState(2.5);

  const [results, setResults] = useState<HedgeResults | null>(null);
  const minBet = 1.0;

  function calculateHedge() {
    const yesDecimal = yesPrice / 100;
    const noDecimal = noPrice / 100;
    const totalCostPerShare = yesDecimal + noDecimal;

    if (totalCostPerShare >= 1) {
      setResults({
        arbitrage: false,
        message: "No arbitrage available. Prices add up to $1 or more.",
        returnMessage: null,
      });
      return;
    }

    const ratioYES = 1 - noDecimal;
    const ratioNO = 1 - yesDecimal;
    const sumRatios = ratioYES + ratioNO;

    let amountToBetOnYES = totalBudget * (ratioYES / sumRatios);
    let amountToBetOnNO = totalBudget * (ratioNO / sumRatios);

    if (amountToBetOnYES < minBet || amountToBetOnNO < minBet) {
      setResults({
        arbitrage: false,
        message: "⚠️ Hedge not possible: Minimum bet per side is $1.00. Try increasing your total budget or find markets with a wider spread.",
        returnMessage: null,
      });
      return;
    }

    const payoutFromYesBetIfYesWins = (amountToBetOnYES / yesDecimal);
    const payoutFromNoBetIfNoWins = (amountToBetOnNO / noDecimal);

    const netYES_userLogic = payoutFromYesBetIfYesWins - amountToBetOnNO;
    const netNO_userLogic = payoutFromNoBetIfNoWins - amountToBetOnYES;

    const actualArbProfit = Math.min(netYES_userLogic, netNO_userLogic);
    const actualArbProfitRatio = totalBudget > 0 ? actualArbProfit / totalBudget : 0;
    
    let dynamicReturnMessage: string | null = null;
    if (actualArbProfitRatio >= 0.48 && actualArbProfit < 0.20) {
        dynamicReturnMessage = "✅ Rule of Thumb: You're up ~80–90% of max return and less than $0.20 remains — consider taking profit.";
    }

    setResults({
      arbitrage: true,
      amountYES: amountToBetOnYES.toFixed(2),
      amountNO: amountToBetOnNO.toFixed(2),
      netYES: netYES_userLogic.toFixed(2),
      netNO: netNO_userLogic.toFixed(2),
      message: "Arbitrage opportunity detected! Calculated optimal hedge for guaranteed profit.",
      returnMessage: dynamicReturnMessage,
    });
  }

  return (
    <div 
      className="p-6 max-w-3xl mx-auto" 
      suppressHydrationWarning={true}
    >
      <Head>
        <title>Optimal Hedging & Arbitrage Calculator</title>
      </Head>
      <h1 className="text-2xl font-bold mb-6 text-center">Optimal Hedging & Arbitrage Calculator</h1>
      <Card className="mb-4 shadow-md dark:bg-gray-900">
        <CardContent className="grid gap-6 grid-cols-1 md:grid-cols-2 py-6">
          <div className="space-y-2">
            <label htmlFor="yes-price" className="font-semibold dark:text-gray-200">YES Price (¢)</label>
            <Input id="yes-price" type="number" value={yesPrice} onChange={(e) => setYesPrice(Number(e.target.value))} min={1} max={99} className="dark:bg-gray-800 dark:text-gray-100" />
            <p className="text-xs text-gray-500 dark:text-gray-400">Price of the YES share in cents (1-99).</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="no-price" className="font-semibold dark:text-gray-200">NO Price (¢)</label>
            <Input id="no-price" type="number" value={noPrice} onChange={(e) => setNoPrice(Number(e.target.value))} min={1} max={99} className="dark:bg-gray-800 dark:text-gray-100" />
             <p className="text-xs text-gray-500 dark:text-gray-400">Price of the NO share in cents (1-99).</p>
          </div>
          <div className="col-span-1 md:col-span-2 space-y-2">
            <label htmlFor="total-budget" className="font-semibold dark:text-gray-200">Total Hedge Budget ($)</label>
            <Input id="total-budget" type="number" value={totalBudget} onChange={(e) => setTotalBudget(Number(e.target.value))} min={2} step={0.01} className="dark:bg-gray-800 dark:text-gray-100" />
            <p className="text-xs text-gray-500 dark:text-gray-400">Total amount ($) for this hedge (min $2.00).</p>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end mt-2">
        <ProfitRulePopup />
      </div>
      <Button onClick={calculateHedge} className="w-full mb-6 text-lg py-3"><span className="text-lg">Calculate Optimal Hedge</span></Button>
      {results && (
        <Card className={`p-6 shadow-md ${results.arbitrage ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
          <h2 className={`text-xl font-semibold mb-3 ${results.arbitrage ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
            {results.arbitrage ? '✅ Arbitrage Detected!' : '⚠️ Hedge Alert'}
          </h2>
          <p className={`text-sm mb-4 ${results.arbitrage ? 'text-gray-600 dark:text-gray-300' : 'text-orange-600 dark:text-orange-400 font-medium'}`}>{results.message}</p>
          {results.arbitrage && results.amountYES && (
            <div className="space-y-3 text-gray-800 dark:text-gray-100">
              <p className="text-md"><strong className="font-medium">Invest in YES:</strong> <span className="font-bold text-blue-600 dark:text-blue-400">${results.amountYES}</span> (at {yesPrice}¢)</p>
              <p className="text-md"><strong className="font-medium">Invest in NO:</strong> <span className="font-bold text-pink-600 dark:text-pink-400">${results.amountNO}</span> (at {noPrice}¢)</p>
              <hr className="my-2 border-gray-300 dark:border-gray-600" />
              <p className="text-lg"><strong className="font-semibold">Guaranteed Profit:</strong> <span className="font-bold text-green-600 dark:text-green-400">${Math.min(parseFloat(results.netYES || '0'), parseFloat(results.netNO || '0')).toFixed(2)}</span></p>
              <p className="text-xs text-gray-500 dark:text-gray-400">(Net profit assuming one side wins, after deducting the cost of the other side. The lower of the two potential net profits is shown as guaranteed.)</p>
              {results.returnMessage && (
                <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-md">
                  {results.returnMessage}
                </p>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
} 