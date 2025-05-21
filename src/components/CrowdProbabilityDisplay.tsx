import { getCrowdProbabilities } from '@/utils/getCrowdProbabilities';

interface CrowdProbabilityDisplayProps {
  gravityScore?: number;
  percentage?: number;
  probabilityRange?: {
    lower: number;
    upper: number;
  };
}

export function CrowdProbabilityDisplay({ 
  gravityScore, 
  percentage, 
  probabilityRange 
}: CrowdProbabilityDisplayProps) {
  // Support both the new and old APIs
  let yes: number, no: number;
  
  if (percentage !== undefined) {
    // New API with direct percentage
    yes = percentage / 100;
    no = 1 - yes;
  } else if (gravityScore !== undefined) {
    // Old API with gravity score
    const result = getCrowdProbabilities(gravityScore);
    yes = result.yes;
    no = result.no;
  } else {
    // Default fallback
    yes = 0.5;
    no = 0.5;
  }

  return (
    <div className="flex flex-col gap-1 text-sm mt-4">
      <div className="flex justify-between">
        <span>🧠 Crowd Belief in YES:</span>
        <strong className="text-green-500">{(yes * 100).toFixed(2)}%</strong>
      </div>
      <div className="flex justify-between">
        <span>🧠 Crowd Belief in NO:</span>
        <strong className="text-red-500">{(no * 100).toFixed(2)}%</strong>
      </div>
      
      {probabilityRange && (
        <div className="flex justify-between mt-1">
          <span>Confidence Interval:</span>
          <span className="text-blue-500">
            [{probabilityRange.lower.toFixed(1)}% - {probabilityRange.upper.toFixed(1)}%]
          </span>
        </div>
      )}
      
      <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
        Based on the weighted inputs from selected traders, these are the smart-weighted probabilities for each outcome.
      </p>
    </div>
  );
} 