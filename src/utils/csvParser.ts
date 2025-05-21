import { Trader } from './calculateSmartGravity';
import { analyzeCsvContent, validateCsvData } from './aiCsvAnalyzer';

// Map of possible header names to their canonical form
const HEADER_MAPPINGS: { [key: string]: string } = {
  // Smart Score variations
  'smartscore': 'smartscore',
  'smart score': 'smartscore',
  'score': 'smartscore',
  'smart': 'smartscore',
  'performance': 'smartscore',
  'performance score': 'smartscore',
  'trader score': 'smartscore',
  'trader performance': 'smartscore',
  
  // Position variations
  'position': 'position',
  'position size': 'position',
  'dollar position': 'position',
  'dollar value': 'position',
  'value': 'position',
  'amount': 'position',
  'size': 'position',
  
  // Name variations
  'name': 'name',
  'trader': 'name',
  'trader name': 'name',
  'username': 'name',
  'user': 'name',
  'id': 'name',
  'identifier': 'name',
  'trader id': 'name',
  'user id': 'name'
};

// Add this helper function for sanitizing numeric values
function sanitizeNumericValue(value: string): number {
  // Remove all non-numeric characters except the first decimal point
  let result = value.replace(/[^\d.-]/g, '');
  
  // Handle multiple decimals - keep only the first decimal point
  const firstDecimal = result.indexOf('.');
  if (firstDecimal !== -1) {
    const beforeDecimal = result.substring(0, firstDecimal + 1);
    const afterDecimal = result.substring(firstDecimal + 1).replace(/\./g, '');
    result = beforeDecimal + afterDecimal;
  }
  
  return parseFloat(result);
}

// Fallback CSV parsing without AI
function fallbackParseCSV(csvContent: string, sentiment: 'yes' | 'no'): Trader[] {
  console.log('Using fallback CSV parsing');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  const rawHeaders = lines[0].toLowerCase().split(',').map(h => h.trim());
  console.log('Raw headers:', rawHeaders);
  
  const headers = rawHeaders.map(header => {
    const normalizedHeader = HEADER_MAPPINGS[header];
    if (!normalizedHeader) {
      console.warn(`Unknown header: "${header}". Will be ignored.`);
    }
    return normalizedHeader;
  });

  // Validate required headers
  const requiredHeaders = ['smartscore', 'position'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(
      `Missing required headers: ${missingHeaders.join(', ')}.\n` +
      `Found headers: ${rawHeaders.join(', ')}.\n` +
      `Required format: Name,Smart Score,Dollar Position\n` +
      `Note: Headers are case-insensitive and can be variations like "Score" for "Smart Score" or "Position" for "Dollar Position".`
    );
  }

  return lines.slice(1).map((line, index) => {
    const values = line.split(',').map(v => v.trim());
    const trader: Trader = {
      sentiment,
      smartScore: 0,
      dollarPosition: 0
    };

    headers.forEach((header, i) => {
      if (!header) return;
      
      const value = values[i];
      switch (header) {
        case 'name':
          if (value && value.trim() !== '') {
            trader.name = value.trim();
          }
          break;
        case 'smartscore':
          const smartScore = Number(value);
          if (isNaN(smartScore) || smartScore < -100 || smartScore > 100) {
            throw new Error(`Invalid smart score in row ${index + 2}: ${value}. Must be between -100 and 100.`);
          }
          trader.smartScore = smartScore;
          break;
        case 'position':
          const position = Number(value);
          if (isNaN(position) || position < 0) {
            throw new Error(`Invalid position value in row ${index + 2}: ${value}. Must be a non-negative number.`);
          }
          trader.dollarPosition = position;
          break;
      }
    });

    return trader;
  });
}

export async function parseTraderCSV(csvContent: string, sentiment: 'yes' | 'no'): Promise<Trader[]> {
  console.log('Starting CSV parse with content:', csvContent);
  
  try {
    // Analyze CSV content
    const analysis = await analyzeCsvContent(csvContent);
    console.log('CSV Analysis:', analysis);

    if (!analysis.validation.isValid) {
      throw new Error(`CSV validation failed: ${analysis.validation.errors.join(', ')}`);
    }

    // Validate data
    const isValid = await validateCsvData(csvContent, analysis);
    if (!isValid) {
      throw new Error('CSV data validation failed. Please check the format and values.');
    }

    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }

    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(',').map(h => h.trim());
    
    const nameIndex = headers.indexOf(analysis.headers.name?.toLowerCase() || '');
    const smartScoreIndex = headers.indexOf(analysis.headers.smartScore?.toLowerCase() || '');
    const positionIndex = headers.indexOf(analysis.headers.shares?.toLowerCase() || '');

    if (smartScoreIndex === -1 || positionIndex === -1) {
      throw new Error('Required columns not found in CSV. Please include Smart Score and Dollar Position columns.');
    }

    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim());
      const trader: Trader = {
        sentiment,
        smartScore: 0,
        dollarPosition: 0
      };

      if (nameIndex !== -1) {
        const name = values[nameIndex];
        if (name && name.trim() !== '') {
          trader.name = name.trim();
        }
      }

      // Validate and sanitize smart score
      const rawSmartScore = values[smartScoreIndex];
      let smartScore: number;
      
      try {
        smartScore = sanitizeNumericValue(rawSmartScore);
        if (isNaN(smartScore)) {
          throw new Error(`Invalid smart score format: ${rawSmartScore}`);
        }
      } catch (error) {
        console.error(`Error parsing smart score '${rawSmartScore}' in row ${index + 2}, defaulting to 0`);
        smartScore = 0;
      }
      
      // Enforce limits
      smartScore = Math.max(-100, Math.min(100, smartScore));
      trader.smartScore = smartScore;

      // Validate and sanitize position
      const rawPosition = values[positionIndex];
      let position: number;
      
      try {
        position = sanitizeNumericValue(rawPosition);
        if (isNaN(position)) {
          throw new Error(`Invalid position format: ${rawPosition}`);
        }
      } catch (error) {
        console.error(`Error parsing position '${rawPosition}' in row ${index + 2}, defaulting to 0`);
        position = 0;
      }
      
      // Ensure position is non-negative
      position = Math.max(0, position);
      trader.dollarPosition = position;

      return trader;
    });
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw error;
  }
}

export function generateTraderCSV(traders: Trader[]): string {
  const headers = ['Name', 'Smart Score', 'Dollar Position'];
  const rows = traders.map(trader => [
    trader.name || '',
    trader.smartScore.toString(),
    trader.dollarPosition.toString()
  ]);
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
} 