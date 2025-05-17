export function getCrowdProbabilities(gravityScore: number) {
  const rawYesProb = (gravityScore + 1) / 2;
  const calibratedYesProb = 0.95 * rawYesProb + 0.025;

  const calibratedNoProb = 1 - calibratedYesProb;

  return {
    yes: calibratedYesProb,  // 0–1
    no: calibratedNoProb,    // 0–1
  };
} 