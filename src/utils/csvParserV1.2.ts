import Papa from 'papaparse';
import { Trader } from './calculateSmartEdge';

interface ParseError {
  message: string;
  type: string;
  code: string;
  row?: number;
}

export async function parseTraderCSV(csvContent: string, defaultSentiment: 'yes' | 'no'): Promise<Trader[]> {
  return new Promise((resolve, reject) => {
    try {
      const result = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true
      });
      
      if (result.data.length === 0) {
        throw new Error('No data found in CSV file');
      }
      
      const traders: Trader[] = [];
      const errors: string[] = [];
      
      // First, let's detect the columns from the headers
      const firstRow = result.data[0] as Record<string, string>;
      
      // Detect column names once for all rows
      const nameColumn = findColumn(firstRow, ['name', 'trader', 'trader name', 'username', 'user']);
      const scoreColumn = findColumn(firstRow, ['smart score', 'smartscore', 'score', 'sscore', 'trader score', 'value', 'rating']);
      const dollarColumn = findColumn(firstRow, ['dollar', 'dollar position', 'dollarposition', 'amount', 'position', 'money', 'size', 'bet', 'bet size', 'bet amount', 'investment', 'stake', '$', 'usd', 'value']);
      const sentimentColumn = findColumn(firstRow, ['sentiment', 'side', 'position', 'vote', 'bet', 'direction', 'prediction']);
      
      // New columns for enhanced trader metrics
      const entryPriceColumn = findColumn(firstRow, ['entry', 'entry price', 'entryprice', 'price', 'market price', 'marketprice', 'entry point']);
      const realizedPnlColumn = findColumn(firstRow, ['realized', 'realized pnl', 'realizedpnl', 'realized profit', 'profit', 'gains', 'closed pnl']);
      const unrealizedPnlColumn = findColumn(firstRow, ['unrealized', 'unrealized pnl', 'unrealizedpnl', 'unrealized profit', 'open profit', 'open pnl', 'paper profit']);
      const supplyOwnershipColumn = findColumn(firstRow, ['supply', 'ownership', 'supply ownership', 'supplyownership', 'market share', 'share', 'percent owned', 'ownership percent', 'pct', 'percentage', 'percent']);
      
      console.log('Detected columns:', { 
        nameColumn, 
        scoreColumn, 
        dollarColumn, 
        sentimentColumn,
        entryPriceColumn,
        realizedPnlColumn,
        unrealizedPnlColumn,
        supplyOwnershipColumn
      });
      
      if (!scoreColumn) {
        throw new Error('Smart score column not found in CSV headers. Column names searched: smart score, smartscore, score, sscore, trader score, value, rating');
      }
      
      if (!dollarColumn) {
        throw new Error('Dollar position column not found in CSV headers. Column names searched: dollar, dollar position, dollarposition, amount, position, money, size, bet, bet size, bet amount, investment, stake, $, usd, value');
      }
      
      for (let i = 0; i < result.data.length; i++) {
        const row = result.data[i] as Record<string, string>;
        const lineNumber = i + 2; // +2 because of header row and 0-indexing
        
        const name = nameColumn ? row[nameColumn] : `Trader ${i + 1}`;
        const smartScoreRaw = scoreColumn ? row[scoreColumn].trim() : '';
        const dollarPositionRaw = dollarColumn ? row[dollarColumn].trim() : '';
        
        // Parse sentiment if available
        let sentiment: 'yes' | 'no' = defaultSentiment;
        if (sentimentColumn) {
          const sentimentValue = row[sentimentColumn].trim().toLowerCase();
          if (['yes', 'y', '1', 'true', 'buy', 'long', 'bullish'].includes(sentimentValue)) {
            sentiment = 'yes';
          } else if (['no', 'n', '0', 'false', 'sell', 'short', 'bearish'].includes(sentimentValue)) {
            sentiment = 'no';
          }
        }
        
        // Parse smart score
        let smartScore: number;
        try {
          smartScore = parseFloat(smartScoreRaw.replace(/[^\d.-]/g, ''));
          if (isNaN(smartScore)) {
            errors.push(`Row ${lineNumber}: Invalid smart score: ${smartScoreRaw}`);
            continue;
          }
          smartScore = Math.max(-100, Math.min(100, smartScore)); // Clamp between -100 and 100
        } catch (e: unknown) {
          errors.push(`Row ${lineNumber}: Could not parse smart score: ${smartScoreRaw}`);
          continue;
        }
        
        // Parse dollar position
        let dollarPosition: number;
        try {
          // Handle empty dollar positions
          if (!dollarPositionRaw) {
            dollarPosition = 0;
          } else {
            dollarPosition = parseFloat(dollarPositionRaw.replace(/[^\d.-]/g, ''));
            if (isNaN(dollarPosition)) {
              errors.push(`Row ${lineNumber}: Invalid dollar position: ${dollarPositionRaw}`);
              continue;
            }
            dollarPosition = Math.max(0, dollarPosition); // Ensure positive
          }
        } catch (e: unknown) {
          errors.push(`Row ${lineNumber}: Could not parse dollar position: ${dollarPositionRaw}`);
          continue;
        }
        
        // Create the trader object with required fields
        const trader: Trader = {
          name,
          sentiment,
          smartScore,
          dollarPosition
        };
        
        // Parse entry price (optional)
        if (entryPriceColumn && row[entryPriceColumn]) {
          try {
            const rawValue = row[entryPriceColumn].trim();
            let entryPrice = parseFloat(rawValue.replace(/[^\d.-]/g, ''));
            
            // If it looks like a percentage, convert to decimal
            if (rawValue.includes('%') || entryPrice > 1) {
              entryPrice = entryPrice / 100;
            }
            
            // Validate range (0-1)
            if (!isNaN(entryPrice) && entryPrice >= 0 && entryPrice <= 1) {
              trader.entryPrice = entryPrice;
            }
          } catch (e) {
            console.warn(`Row ${lineNumber}: Could not parse entry price, skipping field`);
          }
        }
        
        // Parse realized PnL (optional)
        if (realizedPnlColumn && row[realizedPnlColumn]) {
          try {
            const realizedPnl = parseFloat(row[realizedPnlColumn].replace(/[^\d.-]/g, ''));
            if (!isNaN(realizedPnl)) {
              trader.realizedPnl = realizedPnl;
            }
          } catch (e) {
            console.warn(`Row ${lineNumber}: Could not parse realized PnL, skipping field`);
          }
        }
        
        // Parse unrealized PnL (optional)
        if (unrealizedPnlColumn && row[unrealizedPnlColumn]) {
          try {
            const unrealizedPnl = parseFloat(row[unrealizedPnlColumn].replace(/[^\d.-]/g, ''));
            if (!isNaN(unrealizedPnl)) {
              trader.unrealizedPnl = unrealizedPnl;
            }
          } catch (e) {
            console.warn(`Row ${lineNumber}: Could not parse unrealized PnL, skipping field`);
          }
        }
        
        // Parse supply ownership (optional)
        if (supplyOwnershipColumn && row[supplyOwnershipColumn]) {
          try {
            const rawValue = row[supplyOwnershipColumn].trim();
            let supplyOwnership = parseFloat(rawValue.replace(/[^\d.-]/g, ''));
            
            // If it looks like a percentage, convert to decimal
            if (rawValue.includes('%') || supplyOwnership > 1) {
              supplyOwnership = supplyOwnership / 100;
            }
            
            // Validate range (0-1)
            if (!isNaN(supplyOwnership) && supplyOwnership >= 0 && supplyOwnership <= 1) {
              trader.supplyOwnership = supplyOwnership;
            }
          } catch (e) {
            console.warn(`Row ${lineNumber}: Could not parse supply ownership, skipping field`);
          }
        }
        
        traders.push(trader);
      }
      
      if (errors.length > 0) {
        // If we have errors but also some valid data, log warnings but continue
        if (traders.length > 0) {
          console.warn('CSV parse warnings:', errors);
        } else {
          throw new Error(`CSV parse errors: ${errors.join('; ')}`);
        }
      }
      
      resolve(traders);
    } catch (error: unknown) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export function generateTraderCSV(traders: Trader[]): string {
  // Define headers - use the exact same names that the parser looks for
  const headers = [
    'Name', 
    'Smart Score', 
    'Dollar Position', 
    'Entry Price (%)', 
    'Realized PnL', 
    'Unrealized PnL',
    'pct',
    'Sentiment'
  ];
  
  // Create rows
  const rows = traders.map(trader => [
    trader.name || '',
    trader.smartScore.toString(),
    trader.dollarPosition.toString(),
    trader.entryPrice !== undefined ? (trader.entryPrice * 100).toFixed(2) : '',
    trader.realizedPnl !== undefined ? trader.realizedPnl.toString() : '',
    trader.unrealizedPnl !== undefined ? trader.unrealizedPnl.toString() : '',
    trader.supplyOwnership !== undefined ? (trader.supplyOwnership * 100).toFixed(2) : '',
    trader.sentiment
  ]);
  
  // Insert headers
  rows.unshift(headers);
  
  // Generate CSV content
  return rows.map(row => row.join(',')).join('\n');
}

// Generate an example CSV template for users
export function getExampleCSV(sentiment: 'yes' | 'no'): string {
  const headers = [
    'Name', 
    'Smart Score', 
    'Dollar Position', 
    'Entry Price (%)', 
    'Realized PnL', 
    'Unrealized PnL',
    'pct (Supply Ownership)', 
    'Sentiment'
  ];
  
  const exampleData = [
    [
      `Example Trader 1`, 
      '80', 
      '1000', 
      '45.5', // Entry price as percentage
      '250', 
      '125', 
      '2.5', // Supply ownership as percentage
      sentiment
    ],
    [
      `Example Trader 2`, 
      '65', 
      '500', 
      '52.0', 
      '-50', 
      '300', 
      '1.2', 
      sentiment
    ],
    [
      `Example Trader 3`, 
      '50', 
      '250', 
      '48.3', 
      '0', 
      '-75', 
      '0.8', 
      sentiment
    ]
  ];
  
  const rows = [headers, ...exampleData];
  return rows.map(row => row.join(',')).join('\n');
}

// Helper function to find a column name in the CSV headers (case-insensitive partial matching)
function findColumn(row: Record<string, string>, possibleNames: string[]): string | null {
  // First try exact matches (except for case)
  for (const name of possibleNames) {
    for (const key of Object.keys(row)) {
      if (key.toLowerCase() === name.toLowerCase()) {
        return key;
      }
    }
  }

  // Then try partial matches
  for (const name of possibleNames) {
    for (const key of Object.keys(row)) {
      if (key.toLowerCase().includes(name.toLowerCase()) || 
          name.toLowerCase().includes(key.toLowerCase())) {
        return key;
      }
    }
  }

  return null;
} 