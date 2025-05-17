'use client';

import { calculateVoteWeight } from '@/utils/calculateVoteWeight';
import { normalizeFinalScore } from '@/utils/normalizeFinalScore';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Head from 'next/head';
import { Trash2 } from 'lucide-react'; // Icon for delete button
import ImageUploader from "@/components/ImageUploader"; // Added ImageUploader import
import { ChevronDown, ChevronRight } from 'lucide-react'; // Added Chevron icons
import { CrowdProbabilityDisplay } from '@/components/CrowdProbabilityDisplay'; // Added import

interface VoterData {
  id: string; // Added for unique key
  name?: string; // Added optional name
  shares: number | ''; // Allow empty string for input initialization
  sentiment: 'yes' | 'no';
  pnl: number | ''; // Allow empty string for input initialization
  volume: number | ''; // Allow empty string for input initialization
}

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

const createNewVoter = (name: string = '', shares: number | '' = '', sentiment: 'yes' | 'no' = 'yes', pnl: number | '' = '', volume: number | '' = ''): VoterData => ({
  id: generateId(),
  name: name, // Initialize name
  shares: shares,
  sentiment: sentiment,
  pnl: pnl,
  volume: volume,
});

export default function VoteGravityCalculatorPage() {
  const [voters, setVoters] = useState<VoterData[]>([]); // Initialize with empty array
  const [weights, setWeights] = useState<number[]>([]);
  const [normalizedScore, setNormalizedScore] = useState<number>(0);
  const [isImageUploaderOpen, setIsImageUploaderOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // Added mounted state

  useEffect(() => {
    setMounted(true);
    setVoters([createNewVoter()]); // Add initial voter row on client side
  }, []); // Empty dependency array ensures this runs once on mount

  useEffect(() => {
    if (!mounted) return; // Ensure this runs only after mount and voters initialization

    const validVoters = voters.filter(
      v => typeof v.shares === 'number' && v.shares > 0 &&
           typeof v.pnl === 'number' &&
           typeof v.volume === 'number' && v.volume >= 0
    );
    if (validVoters.length > 0) {
      const calculatedWeights = validVoters.map(voter => 
        calculateVoteWeight({
          shares: voter.shares as number,
          sentiment: voter.sentiment,
          pnl: voter.pnl as number,
          volume: voter.volume as number,
        })
      );
      const score = normalizeFinalScore(calculatedWeights);
      setWeights(calculatedWeights);
      setNormalizedScore(score);
    } else {
      setWeights([]);
      setNormalizedScore(0);
    }
  }, [voters]);

  const addVoterRow = () => {
    setVoters([...voters, createNewVoter()]);
  };

  const removeVoterRow = (id: string) => {
    setVoters(voters.filter(voter => voter.id !== id));
  };

  const handleVoterInputChange = (id: string, field: keyof Omit<VoterData, 'id' | 'sentiment'>, value: string) => {
    setVoters(voters.map(voter =>
      voter.id === id ? { ...voter, [field]: (field === 'shares' || field === 'pnl' || field === 'volume') ? (value === '' ? '' : parseFloat(value)) : value } : voter
    ));
  };

  const handleSentimentChange = (id: string, value: 'yes' | 'no') => {
    setVoters(voters.map(voter => 
      voter.id === id ? { ...voter, sentiment: value } : voter
    ));
  };

  const handleVotersExtracted = (extractedVoters: Array<{ name: string; shares: number; sentiment: "yes" | "no"; profit: number; volume: number }>) => {
    const newVoters = extractedVoters.map(v => createNewVoter(
      v.name,
      v.shares,
      v.sentiment,
      v.profit, // Map profit to pnl
      v.volume
    ));
    // Filter out the initial empty voter if it's still empty and new voters are added
    setVoters(prevVoters => {
      const currentVoters = prevVoters.length === 1 && prevVoters[0].shares === '' && prevVoters[0].pnl === '' && prevVoters[0].volume === '' && !prevVoters[0].name
        ? []
        : prevVoters;
      return [...currentVoters, ...newVoters];
    });
  };

  if (!mounted) { // If not mounted, return null or a loader
    return null; 
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Head>
        <title>Vote Gravity Calculator</title>
      </Head>
      <h1 className="text-3xl font-bold mb-6 text-center">Vote Gravity Calculator</h1>

      <Card className="mb-6 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">What This Calculator Does</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
          <p>
            This Vote Gravity Calculator estimates the market consensus for a prediction market event (like on Polymarket) by analyzing the behavior of top traders.
          </p>
          <p>
            Each voter&apos;s influence is calculated based on:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Shares they hold (log-scaled to prevent whales from dominating)</li>
            <li>Sentiment (yes = +1, no = –1)</li>
            <li>Profit/Loss (PnL) to reward accuracy</li>
            <li>Trading Volume, downweighted if too low or suspiciously high</li>
          </ul>
          <p>
            All these factors are combined into a weighted vote score. The final result is a number between –1 (strong no consensus) and +1 (strong yes consensus), showing how much the most committed and successful traders lean toward a specific outcome.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6 shadow-lg">
        <CardHeader>
          <CardTitle>Voter Data Input</CardTitle>
          <CardDescription>Enter the data for each voter. Rows with incomplete or invalid data (e.g., non-numeric shares, PnL, volume) will be excluded from calculation.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name (Optional)</TableHead>
                <TableHead>Shares</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>PnL ($)</TableHead>
                <TableHead>Volume ($)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {voters.map((voter, index) => (
                <TableRow key={voter.id}>
                  <TableCell>
                    <Input
                      type="text"
                      placeholder="e.g., Trader1"
                      value={voter.name || ''}
                      onChange={(e) => handleVoterInputChange(voter.id, 'name', e.target.value)}
                      className="min-w-[100px] dark:bg-gray-800 dark:text-gray-100"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number"
                      placeholder="e.g., 10000"
                      value={voter.shares}
                      onChange={(e) => handleVoterInputChange(voter.id, 'shares', e.target.value)}
                      className="min-w-[100px] dark:bg-gray-800 dark:text-gray-100"
                    />
                  </TableCell>
                  <TableCell>
                    <Select value={voter.sentiment} onValueChange={(value: 'yes' | 'no') => handleSentimentChange(voter.id, value)}>
                      <SelectTrigger className="min-w-[80px] dark:bg-gray-800 dark:text-gray-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-800 dark:text-gray-100">
                        <SelectItem value="yes">YES</SelectItem>
                        <SelectItem value="no">NO</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number"
                      placeholder="e.g., 5000"
                      value={voter.pnl}
                      onChange={(e) => handleVoterInputChange(voter.id, 'pnl', e.target.value)}
                      className="min-w-[100px] dark:bg-gray-800 dark:text-gray-100"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number"
                      placeholder="e.g., 100000"
                      value={voter.volume}
                      onChange={(e) => handleVoterInputChange(voter.id, 'volume', e.target.value)}
                      className="min-w-[120px] dark:bg-gray-800 dark:text-gray-100"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => removeVoterRow(voter.id)} disabled={voters.length <= 1}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button onClick={addVoterRow} className="mt-4">Add Voter Row</Button>
        </CardContent>
      </Card>

      <Card className="mb-6 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between cursor-pointer" onClick={() => setIsImageUploaderOpen(!isImageUploaderOpen)}>
          <CardTitle className="text-xl flex items-center">
            {isImageUploaderOpen ? <ChevronDown className="mr-2 h-5 w-5" /> : <ChevronRight className="mr-2 h-5 w-5" />}
            Upload Image with AI Help
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setIsImageUploaderOpen(!isImageUploaderOpen); }}>
            {isImageUploaderOpen ? "Collapse" : "Expand"}
          </Button>
        </CardHeader>
        {isImageUploaderOpen && (
          <CardContent className="pt-6">
            <ImageUploader onVotersExtracted={handleVotersExtracted} />
          </CardContent>
        )}
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Calculation Results</CardTitle>
          <CardDescription>Based on the entered voter data. Ensure all required fields are filled correctly for accurate results.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {weights.length > 0 ? (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Individual Voter Weights:</h3>
                  <ul className="list-decimal pl-5 space-y-1 text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                    {weights.map((weight, index) => (
                      <li key={index} className="font-mono">Voter {index + 1}: {weight.toFixed(4)}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Normalized Final Score:</h3>
                  <p className={`text-2xl font-bold p-3 rounded-md ${normalizedScore > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : normalizedScore < 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                    {normalizedScore.toFixed(4)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    (Score ranges from -1, strong NO consensus, to +1, strong YES consensus)
                  </p>
                  <CrowdProbabilityDisplay gravityScore={normalizedScore} />
                </div>
              </>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">Enter valid voter data above to see results.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 