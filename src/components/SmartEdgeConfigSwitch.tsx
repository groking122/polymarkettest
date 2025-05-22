"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  setCalculationMode, 
  activeConfig, 
  defaultClassicConfig, 
  defaultAdvancedConfig 
} from "@/utils/smartEdgeConfig";

export default function SmartEdgeConfigSwitch() {
  const [useAdvancedMode, setUseAdvancedMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Initialize with the default setting from activeConfig
    setUseAdvancedMode(activeConfig.useAdvancedMode);
  }, []);

  // Add effect to keep state in sync with activeConfig
  useEffect(() => {
    if (mounted) {
      setUseAdvancedMode(activeConfig.useAdvancedMode);
    }
  }, [activeConfig.useAdvancedMode, mounted]);

  const handleToggleMode = (checked: boolean) => {
    setUseAdvancedMode(checked);
    setCalculationMode(checked);
    console.log(`Switched to ${checked ? 'advanced' : 'classic'} mode`);
  };

  if (!mounted) return null;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-md font-medium">Smart Edge Calculation Mode</CardTitle>
        <CardDescription>
          Choose between classic formulas or advanced calculations with improved weighting
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <Label htmlFor="calculation-mode" className="text-base">
              {useAdvancedMode ? "Advanced Mode ✨" : "Classic Mode"}
            </Label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {useAdvancedMode 
                ? "Enhanced formulas with improved scaling and robustness" 
                : "Original calculation with exponential weighting"}
            </p>
            <div className="mt-1 text-xs border-l-2 border-blue-400 pl-2 text-blue-600 dark:text-blue-400">
              {useAdvancedMode 
                ? "Advanced Mode uses logarithmic scaling and prevents overbetting on small edges. Best for markets with high-stakes traders or extreme score values." 
                : "Classic Mode uses the original exponential weighting system. Reliable for most standard prediction markets."}
            </div>
          </div>
          <Switch
            id="calculation-mode"
            checked={useAdvancedMode}
            onCheckedChange={handleToggleMode}
          />
        </div>
      </CardContent>
      <CardFooter className="pt-1 text-xs text-gray-500 dark:text-gray-400">
        {useAdvancedMode 
          ? "Advanced mode: Log-scaling, clamped entry advantage, smooth edge transition" 
          : "Classic mode: Exponential score emphasis, standard Kelly, hard edge thresholds"}
      </CardFooter>
    </Card>
  );
} 