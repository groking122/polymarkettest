"use client";

import React from 'react';
import { useState } from "react";
import { 
  Dialog, 
  DialogTrigger, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface BettingSettingsProps {
  kellyFraction: number;
  setKellyFraction: (value: number) => void;
  maxLossPercentage: number;
  setMaxLossPercentage: (value: number) => void;
  maxBetPercentage: number;
  setMaxBetPercentage: (value: number) => void;
  minEdgeThreshold?: number;
  setMinEdgeThreshold?: (value: number) => void;
  minBetSize?: number;
  setMinBetSize?: (value: number) => void;
}

export default function BettingSettings({
  kellyFraction,
  setKellyFraction,
  maxLossPercentage,
  setMaxLossPercentage,
  maxBetPercentage,
  setMaxBetPercentage,
  minEdgeThreshold = 1.0,
  setMinEdgeThreshold = () => {},
  minBetSize = 0.5,
  setMinBetSize = () => {}
}: BettingSettingsProps) {
  const [tempKellyFraction, setTempKellyFraction] = useState(kellyFraction.toString());
  const [tempMaxLossPercentage, setTempMaxLossPercentage] = useState(maxLossPercentage.toString());
  const [tempMaxBetPercentage, setTempMaxBetPercentage] = useState(maxBetPercentage.toString());
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    const newKellyFraction = parseFloat(tempKellyFraction);
    const newMaxLossPercentage = parseFloat(tempMaxLossPercentage);
    const newMaxBetPercentage = parseFloat(tempMaxBetPercentage);

    if (!isNaN(newKellyFraction) && newKellyFraction > 0 && newKellyFraction <= 1) {
      setKellyFraction(newKellyFraction);
    }

    if (!isNaN(newMaxLossPercentage) && newMaxLossPercentage > 0 && newMaxLossPercentage <= 100) {
      setMaxLossPercentage(newMaxLossPercentage);
    }

    if (!isNaN(newMaxBetPercentage) && newMaxBetPercentage > 0 && newMaxBetPercentage <= 100) {
      setMaxBetPercentage(newMaxBetPercentage);
    }

    setOpen(false);
  };

  const handleOpen = (value: boolean) => {
    if (value) {
      // Reset temp values to current values when opening
      setTempKellyFraction(kellyFraction.toString());
      setTempMaxLossPercentage(maxLossPercentage.toString());
      setTempMaxBetPercentage(maxBetPercentage.toString());
    }
    setOpen(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Betting Settings</DialogTitle>
          <DialogDescription>
            Adjust how the calculator computes optimal bet sizes and risk management
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="kelly-fraction">
              Kelly Fraction <span className="text-sm text-gray-500">(0-1)</span>
            </Label>
            <Input
              id="kelly-fraction"
              type="text"
              inputMode="decimal"
              value={tempKellyFraction}
              onChange={(e) => setTempKellyFraction(e.target.value)}
              placeholder="e.g. 0.25 for quarter Kelly"
              className="dark:bg-gray-800"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Fraction of Kelly to use (default: 0.25 = quarter Kelly, recommended for volatile markets)
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="max-loss-percentage">
              Max Daily Loss <span className="text-sm text-gray-500">(%)</span>
            </Label>
            <Input
              id="max-loss-percentage"
              type="text"
              inputMode="decimal"
              value={tempMaxLossPercentage}
              onChange={(e) => setTempMaxLossPercentage(e.target.value)}
              placeholder="e.g. 10 for 10%"
              className="dark:bg-gray-800"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Maximum percentage of bankroll you're willing to lose in one day
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="max-bet-percentage">
              Max Bet Size <span className="text-sm text-gray-500">(%)</span>
            </Label>
            <Input
              id="max-bet-percentage"
              type="text"
              inputMode="decimal"
              value={tempMaxBetPercentage}
              onChange={(e) => setTempMaxBetPercentage(e.target.value)}
              placeholder="e.g. 5 for 5%"
              className="dark:bg-gray-800"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Maximum percentage of bankroll for any single bet (capped at 5% for safety)
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="min-edge" className="text-sm font-medium">
              Minimum Edge: {minEdgeThreshold.toFixed(1)}%
            </label>
            <p className="text-xs text-gray-500">
              Only bet when edge exceeds this threshold
            </p>
            <Slider
              id="min-edge"
              min={0.1}
              max={5.0}
              step={0.1}
              value={[minEdgeThreshold]}
              onValueChange={(value) => setMinEdgeThreshold(value[0])}
              className="w-full"
            />
          </div>
          
          <div className="space-y-1">
            <label htmlFor="min-bet" className="text-sm font-medium">
              Minimum Bet Size: {minBetSize.toFixed(1)}%
            </label>
            <p className="text-xs text-gray-500">
              Skip bets smaller than this percentage of bankroll
            </p>
            <Slider
              id="min-bet"
              min={0.1}
              max={2.0}
              step={0.1}
              value={[minBetSize]}
              onValueChange={(value) => setMinBetSize(value[0])}
              className="w-full"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 