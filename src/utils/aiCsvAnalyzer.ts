import { Trader } from './calculateSmartGravity';

interface CsvAnalysis {
  headers: {
    name?: string;
    smartScore?: string;
    shares?: string;
  };
  validation: {
    isValid: boolean;
    errors: string[];
  };
}

// Basic CSV header detection
function detectHeaders(headers: string[]): CsvAnalysis {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  // Common variations for each field
  const nameVariations = ['name', 'trader', 'username', 'user', 'id', 'identifier'];
  const scoreVariations = ['smartscore', 'smart score', 'score', 'performance', 'trader score'];
  const positionVariations = ['shares', 'position', 'amount', 'size', 'dollar', 'dollar position', 'value'];
  
  const analysis: CsvAnalysis = {
    headers: {},
    validation: {
      isValid: true,
      errors: []
    }
  };

  // Find name header
  const nameHeader = normalizedHeaders.find(h => nameVariations.some(v => h.includes(v)));
  if (nameHeader) {
    analysis.headers.name = headers[normalizedHeaders.indexOf(nameHeader)];
  }

  // Find smart score header
  const scoreHeader = normalizedHeaders.find(h => scoreVariations.some(v => h.includes(v)));
  if (scoreHeader) {
    analysis.headers.smartScore = headers[normalizedHeaders.indexOf(scoreHeader)];
  } else {
    analysis.validation.isValid = false;
    analysis.validation.errors.push('Smart Score column not found');
  }

  // Find position header
  const positionHeader = normalizedHeaders.find(h => positionVariations.some(v => h.includes(v)));
  if (positionHeader) {
    analysis.headers.shares = headers[normalizedHeaders.indexOf(positionHeader)];
  } else {
    analysis.validation.isValid = false;
    analysis.validation.errors.push('Position/Dollar Value column not found');
  }

  return analysis;
}

export async function analyzeCsvContent(csvContent: string): Promise<CsvAnalysis> {
  try {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return {
        headers: {},
        validation: {
          isValid: false,
          errors: ['CSV must contain at least a header row and one data row']
        }
      };
    }

    const headers = lines[0].split(',').map(h => h.trim());
    return detectHeaders(headers);
  } catch (error) {
    console.error('Error analyzing CSV:', error);
    return {
      headers: {},
      validation: {
        isValid: false,
        errors: ['Error analyzing CSV content']
      }
    };
  }
}

export async function validateCsvData(csvContent: string, analysis: CsvAnalysis): Promise<boolean> {
  try {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) return false;

    const headers = lines[0].split(',').map(h => h.trim());
    const dataRows = lines.slice(1);

    // Basic validation
    for (const row of dataRows) {
      const values = row.split(',').map(v => v.trim());
      
      // Check if we have enough columns
      if (values.length !== headers.length) {
        return false;
      }

      // Validate smart score
      const scoreIndex = headers.indexOf(analysis.headers.smartScore || '');
      if (scoreIndex !== -1) {
        const score = Number(values[scoreIndex]);
        if (isNaN(score) || score < -100 || score > 100) {
          return false;
        }
      }

      // Validate position value
      const positionIndex = headers.indexOf(analysis.headers.shares || '');
      if (positionIndex !== -1) {
        const position = Number(values[positionIndex]);
        if (isNaN(position) || position < 0) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error validating CSV:', error);
    return false;
  }
} 