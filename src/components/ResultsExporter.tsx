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
    
    const container = exportContainerRef.current;
    const originalDisplay = container.style.display;
    // Store original inline styles of potentially modified elements
    const elementsToRestore: Array<{element: HTMLElement, originalCSSText: string}> = [];

    try {
      setIsGenerating(true);
      
      // Make the element visible
      container.style.display = 'block';

      // Apply simpler styles for html2canvas rendering
      // Override specific Tailwind classes known or suspected to use oklch with their hex/simple equivalents
      const selectorsAndOverrides = [
        { selector: '.text-blue-600', style: { color: '#2563eb' } }, // Tailwind blue-600
        { selector: '.text-gray-500', style: { color: '#6b7280' } }, // Tailwind gray-500
        { selector: '.text-green-600', style: { color: '#16a34a' } },// Tailwind green-600
        { selector: '.text-red-600', style: { color: '#dc2626' } },  // Tailwind red-600
        { selector: '.bg-gray-100', style: { backgroundColor: '#f3f4f6' } }, // Tailwind gray-100
        { selector: '.bg-gray-50', style: { backgroundColor: '#f9fafb' } },   // Tailwind gray-50
        { selector: '.border-gray-200', style: { borderColor: '#e5e7eb' } }, // Tailwind gray-200
        { selector: '.border-gray-300', style: { borderColor: '#d1d5db' } }  // Tailwind gray-300
      ];

      selectorsAndOverrides.forEach(item => {
        container.querySelectorAll(item.selector).forEach(el => {
          const htmlEl = el as HTMLElement;
          elementsToRestore.push({ element: htmlEl, originalCSSText: htmlEl.style.cssText });
          Object.assign(htmlEl.style, item.style);
        });
      });
      
      // Create the image
      const canvas = await html2canvas(container, {
        scale: 2, // Higher quality
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });
      
      // Reset display and styles
      container.style.display = originalDisplay;
      elementsToRestore.forEach(item => {
        item.element.style.cssText = item.originalCSSText;
      });
      
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
      // Ensure styles are reset even if an error occurs before explicit reset
      if (container.style.display !== originalDisplay) {
        container.style.display = originalDisplay;
      }
      elementsToRestore.forEach(item => {
        // Check if style is still applied, to avoid errors if already reset
        // This is a bit broad; ideally, check if specific override styles are present
        // For simplicity, just re-apply original, assuming it won't hurt.
        item.element.style.cssText = item.originalCSSText;
      });
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