"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ImageUploader from "@/components/ImageUploader";
import ResultsExporter from "@/components/ResultsExporter";

function computeTrustFactor(profit: number) {
  return profit >= 0 ? 1 : -1;
}

function computeVolumeMultiplier(volume: number) {
  return volume >= 10000 && volume <= 1000000 ? 1 : 0.5;
}

interface Voter {
  name: string;
  sentiment: "yes" | "no";
  shares: number;
  profit: number;
  volume: number;
}

interface VoteCalculation {
  name: string;
  shares: number;
  trustFactor: number;
  volumeMultiplier: number;
  sentiment: string;
  weight: number;
}

function computeVoteWeight(voter: Voter) {
  const trust = computeTrustFactor(voter.profit);
  const volumeMultiplier = computeVolumeMultiplier(voter.volume);
  return voter.shares * trust * volumeMultiplier * (voter.sentiment === "yes" ? 1 : -1);
}

export default function VoteGravityApp() {
  // Using client-side only rendering to avoid hydration errors
  const [mounted, setMounted] = useState(false);
  const [voters, setVoters] = useState<Voter[]>([
    { name: "userx", sentiment: "yes", shares: 150, profit: 1000, volume: 15000 },
    { name: "usery", sentiment: "no", shares: 10, profit: 4000, volume: 3000 },
  ]);

  const [result, setResult] = useState<number | null>(null);
  const [calculations, setCalculations] = useState<VoteCalculation[]>([]);

  // Only render the component after it has mounted on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  function calculateGravity() {
    if (voters.length === 0) return;
    
    const voteCalculations: VoteCalculation[] = voters.map(voter => {
      const trustFactor = computeTrustFactor(voter.profit);
      const volumeMultiplier = computeVolumeMultiplier(voter.volume);
      const weight = voter.shares * trustFactor * volumeMultiplier * (voter.sentiment === "yes" ? 1 : -1);
      
      return {
        name: voter.name,
        shares: voter.shares,
        trustFactor,
        volumeMultiplier,
        sentiment: voter.sentiment,
        weight
      };
    });
    
    const totalWeight = voteCalculations.reduce((sum, calc) => sum + calc.weight, 0);
    const finalScore = totalWeight / voters.length;
    
    setCalculations(voteCalculations);
    setResult(parseFloat(Math.max(-1, Math.min(1, finalScore)).toFixed(4)));
  }

  if (!mounted) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Automated Vote Gravity Calculator</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6 text-center">
        Calculate the weighted consensus based on shares, profit/loss, and trading volume
      </p>
      
      <div className="grid gap-6">
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <ImageUploader 
              onVotersExtracted={(extractedVoters) => {
                setVoters([...voters, ...extractedVoters]);
              }} 
            />
          </CardContent>
        </Card>
        
        {voters.map((voter, i) => (
          <Card key={i} className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Voter {i + 1}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-4 items-start pt-0">
              <div className="space-y-2">
                <Label htmlFor={`name-${i}`}>Name</Label>
                <Input
                  id={`name-${i}`}
                  type="text"
                  value={voter.name}
                  onChange={(e) => {
                    const updated = [...voters];
                    updated[i].name = e.target.value;
                    setVoters(updated);
                  }}
                  placeholder="Name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`sentiment-${i}`}>Sentiment</Label>
                <select
                  id={`sentiment-${i}`}
                  value={voter.sentiment}
                  onChange={(e) => {
                    const updated = [...voters];
                    updated[i].sentiment = e.target.value as "yes" | "no";
                    setVoters(updated);
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`shares-${i}`}>Shares</Label>
                <Input
                  id={`shares-${i}`}
                  type="number"
                  value={voter.shares}
                  onChange={(e) => {
                    const updated = [...voters];
                    updated[i].shares = parseInt(e.target.value) || 0;
                    setVoters(updated);
                  }}
                  placeholder="Shares"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`profit-${i}`}>Profit/Loss ($)</Label>
                <Input
                  id={`profit-${i}`}
                  type="number"
                  value={voter.profit}
                  onChange={(e) => {
                    const updated = [...voters];
                    updated[i].profit = parseFloat(e.target.value) || 0;
                    setVoters(updated);
                  }}
                  placeholder="Profit/Loss ($)"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`volume-${i}`}>Volume ($)</Label>
                <Input
                  id={`volume-${i}`}
                  type="number"
                  value={voter.volume}
                  onChange={(e) => {
                    const updated = [...voters];
                    updated[i].volume = parseInt(e.target.value) || 0;
                    setVoters(updated);
                  }}
                  placeholder="Volume ($)"
                />
              </div>
              
              <div className="flex items-end">
                <Button
                  variant="destructive"
                  onClick={() => {
                    const updated = voters.filter((_, idx) => idx !== i);
                    setVoters(updated);
                  }}
                  className="w-full"
                >
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            className="w-full"
            variant="outline"
            onClick={() =>
              setVoters([
                ...voters,
                { name: "", sentiment: "yes", shares: 0, profit: 0, volume: 0 },
              ])
            }
          >
            Add Voter
          </Button>
          
          <Button className="w-full" onClick={calculateGravity}>
            Calculate Final Score
          </Button>
        </div>
        
        {result !== null && (
          <Card className="mt-6 bg-slate-50 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Calculation Results</CardTitle>
              <ResultsExporter voters={voters} result={result} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-xl font-bold text-center">
                Final Vote Score: <span className="text-blue-600 dark:text-blue-400">{result}</span>
                <span className="text-sm block font-normal text-gray-500">(Range -1 to +1)</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Name</th>
                      <th className="text-left py-2 px-4">Shares</th>
                      <th className="text-left py-2 px-4">Trust Factor</th>
                      <th className="text-left py-2 px-4">Volume Multiplier</th>
                      <th className="text-left py-2 px-4">Sentiment</th>
                      <th className="text-left py-2 px-4">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculations.map((calc, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-2 px-4">{calc.name || `Voter ${i+1}`}</td>
                        <td className="py-2 px-4">{calc.shares}</td>
                        <td className="py-2 px-4">{calc.trustFactor}</td>
                        <td className="py-2 px-4">{calc.volumeMultiplier}</td>
                        <td className="py-2 px-4">{calc.sentiment}</td>
                        <td className="py-2 px-4">{calc.weight.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5} className="text-right font-bold py-2 px-4">Average:</td>
                      <td className="py-2 px-4 font-bold">{calculations.length > 0 ? 
                        (calculations.reduce((sum, calc) => sum + calc.weight, 0) / calculations.length).toFixed(2) : 0}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 