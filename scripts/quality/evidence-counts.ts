export interface CommandCounts {
  tests_passed: number;
  tests_failed: number;
  tests_skipped: number;
  scenarios_passed: number;
  scenarios_failed: number;
  steps_passed: number;
  steps_failed: number;
}

function largestMatch(text: string, patterns: RegExp[]): number {
  let largest = 0;
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const captured = match.slice(1).findLast((value) => value !== undefined);
      largest = Math.max(largest, Number(captured ?? 0));
    }
  }
  return largest;
}

export function parseCommandCounts(output: string): CommandCounts {
  const scenariosPassed = largestMatch(output, [
    /(\d+)\s+scenarios?\s+\([^)]*?(\d+)\s+passed/giu,
  ]);
  const scenariosFailed = largestMatch(output, [
    /(\d+)\s+scenarios?\s+\([^)]*?(\d+)\s+failed/giu,
  ]);
  const stepsPassed = largestMatch(output, [
    /(\d+)\s+steps?\s+\([^)]*?(\d+)\s+passed/giu,
  ]);
  const stepsFailed = largestMatch(output, [
    /(\d+)\s+steps?\s+\([^)]*?(\d+)\s+failed/giu,
  ]);

  return {
    tests_passed: largestMatch(output, [
      /^\s*Tests?\s+.*?(\d+)\s+passed\b/gimu,
      /^\s*(\d+)\s+pass(?:ed)?(?:\s|\(|$)/gimu,
    ]),
    tests_failed: largestMatch(output, [
      /^\s*Tests?\s+.*?(\d+)\s+failed\b/gimu,
      /^\s*(\d+)\s+fail(?:ed)?(?:\s|\(|$)/gimu,
      /^\s*(\d+)\s+tests?\s+failed\b/gimu,
    ]),
    tests_skipped: largestMatch(output, [
      /^\s*Tests?\s+.*?(\d+)\s+skipped\b/gimu,
      /^\s*(\d+)\s+skip(?:ped)?(?:\s|\(|$)/gimu,
    ]),
    scenarios_passed: scenariosPassed,
    scenarios_failed: scenariosFailed,
    steps_passed: stepsPassed,
    steps_failed: stepsFailed,
  };
}
