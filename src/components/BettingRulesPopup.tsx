"use client";

import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogTrigger, 
  DialogContent,
  DialogHeader,
  DialogTitle 
} from "@/components/ui/dialog";
import { Info } from "lucide-react";

export default function BettingRulesPopup() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Info className="h-4 w-4" /> Betting Rules
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl text-left dark:border-gray-700 dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold mb-2 dark:text-gray-100">📘 Betting Rules Summary</DialogTitle>
        </DialogHeader>
        <ul className="list-disc pl-5 space-y-4 mt-4">
          <li className="dark:text-gray-200">
            <strong className="dark:text-white">When to Bet:</strong><br />
            The calculator identifies a betting opportunity when there is a <em className="dark:text-blue-300">positive mathematical edge</em>. Only consider betting if the calculated <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded font-mono text-sm">&gt; 0%</code>.
          </li>
          <li className="dark:text-gray-200">
            <strong className="dark:text-white">Edge Calculation:</strong><br />
            <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded font-mono text-sm">Edge = (p × b) – (1 – p)</code><br />
            Where:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><code className="bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded font-mono text-sm">p</code> = Your estimated probability of the event occurring (normalized and adjusted for YES/NO bet).</li>
              <li><code className="bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded font-mono text-sm">b</code> = Payout odds ratio = (1 – effective_market_price) / effective_market_price.</li>
            </ul>
          </li>
          <li className="dark:text-gray-200">
            <strong className="dark:text-white">Recommended Bet Size (Safe Kelly Fraction):</strong><br />
            The calculator uses a cautious approach: <br />
            <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded font-mono text-sm">Safe Bet % = Min(0.25 × Full Kelly %, 5%)</code> of your bankroll.<br />
            This means it takes 25% of the full Kelly stake (quarter Kelly), and further caps the bet at 5% of your total bankroll.
          </li>
          <li className="dark:text-gray-200">
            <strong className="dark:text-white">Full Kelly Formula (Basis):</strong><br />
            <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded font-mono text-sm">Full Kelly % = Edge / b</code><br />
            This is the theoretical optimal bet size, but the calculator recommends a fraction for safety.
          </li>
          <li className="dark:text-gray-200">
            <strong className="dark:text-white">Configurable Risk Controls:</strong>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>The recommended bet already incorporates a cap (max 5% of bankroll per trade via Safe Kelly).</li>
              <li>Daily Stop-Loss: You can set a max daily loss (e.g., 10% of bankroll) in <code className="bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded font-mono text-sm">Settings</code>. If hit, the calculator will recommend $0 bets.</li>
            </ul>
          </li>
        </ul>
        
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-md">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Pro Tip:</strong> Use the Simulator tool to test how your settings would perform over time with different market conditions and win rates.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
} 