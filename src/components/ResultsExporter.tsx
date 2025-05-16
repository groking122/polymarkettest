"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Image } from "lucide-react";
import html2canvas from 'html2canvas';

interface Voter {
  name: string;
  sentiment: "yes" | "no";
  shares: number;
  profit: number;
  volume: number;
}

interface ResultsExporterProps {
  voters: Voter[];
  result: number | null;
}

export default function ResultsExporter({ voters, result }: ResultsExporterProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const exportContainerRef = useRef<HTMLDivElement>(null);
  
  const downloadImage = async () => {
    if (!exportContainerRef.current) return;
    
    try {
      setIsGenerating(true);
      
      // First make the element visible
      const container = exportContainerRef.current;
      const originalDisplay = container.style.display;
      container.style.display = 'block';
      
      // Create the image
      const canvas = await html2canvas(container, {
        scale: 2, // Higher quality
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });
      
      // Reset display
      container.style.display = originalDisplay;
      
      // Convert to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error("Failed to create image");
        }
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vote-gravity-results-${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (err) {
      console.error("Error generating image:", err);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-1"
        onClick={downloadImage}
        disabled={isGenerating || voters.length === 0}
      >
        {isGenerating ? (
          <>Generating...</>
        ) : (
          <>
            <Download className="h-4 w-4" /> Download Results
          </>
        )}
      </Button>
      
      {/* Hidden element that will be converted to image */}
      <div 
        ref={exportContainerRef} 
        className="p-6 bg-white text-black rounded-md shadow-md" 
        style={{ display: 'none', width: '800px' }}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Image className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold">Vote Gravity Results</h1>
          </div>
          
          <div className="grid gap-4">
            <div className="border border-gray-200 rounded-md p-4">
              <h2 className="text-xl font-semibold mb-3">Voters Data</h2>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Sentiment</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Shares</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Profit/Loss ($)</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Volume ($)</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Trust Factor</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Vol. Multiplier</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {voters.map((voter, i) => {
                    const trustFactor = voter.profit >= 0 ? 1 : -1;
                    const volumeMultiplier = (voter.volume >= 10000 && voter.volume <= 1000000) ? 1 : 0.5;
                    const weight = voter.shares * trustFactor * volumeMultiplier * (voter.sentiment === "yes" ? 1 : -1);
                    
                    return (
                      <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : ""}>
                        <td className="border border-gray-300 px-4 py-2">{voter.name || `Voter ${i+1}`}</td>
                        <td className="border border-gray-300 px-4 py-2">
                          <span className={voter.sentiment === "yes" ? "text-green-600" : "text-red-600"}>
                            {voter.sentiment}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">{voter.shares}</td>
                        <td className="border border-gray-300 px-4 py-2">${voter.profit}</td>
                        <td className="border border-gray-300 px-4 py-2">${voter.volume}</td>
                        <td className="border border-gray-300 px-4 py-2">{trustFactor}</td>
                        <td className="border border-gray-300 px-4 py-2">{volumeMultiplier}</td>
                        <td className="border border-gray-300 px-4 py-2 font-semibold">{weight.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="border border-gray-200 rounded-md p-4">
              <h2 className="text-xl font-semibold mb-2">Final Score</h2>
              <div className="flex items-center gap-4">
                <div className="text-5xl font-bold">
                  {result !== null ? result : "N/A"}
                </div>
                <div className="text-sm text-gray-500">
                  Range: -1 to +1
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 