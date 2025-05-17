import { getCrowdProbabilities } from '@/utils/getCrowdProbabilities';

export function CrowdProbabilityDisplay({ gravityScore }: { gravityScore: number }) {
  const { yes, no } = getCrowdProbabilities(gravityScore);

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
      <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
        Based on the weighted inputs from selected voters, these are the crowd's implied probabilities for each outcome.
      </p>
    </div>
  );
} 