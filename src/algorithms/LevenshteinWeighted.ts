const VISUAL_SIMILAR: Record<string, string[]> = {
  '0': ['o', 'O'],
  '1': ['l', 'i', 'I'],
  '3': ['e', 'E'],
  '4': ['a', 'A'],
  '5': ['s', 'S'],
  '6': ['g', 'G'],
  '7': ['t', 'T'],
  '8': ['b', 'B'],
  'α': ['a', 'A'],
  '@': ['a', 'A'],
  '$': ['s', 'S'],
  '|': ['l', 'L']
};

function areVisuallySimilar(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const lowerA = a.toLowerCase();
  const lowerB = b.toLowerCase();
  if (lowerA === lowerB) return true;

  const mapA = VISUAL_SIMILAR[lowerA];
  if (mapA && mapA.includes(b)) return true;
  const mapB = VISUAL_SIMILAR[lowerB];
  if (mapB && mapB.includes(a)) return true;

  const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b' };
  if (LEET[lowerA] === lowerB || LEET[lowerB] === lowerA) return true;

  return false;
}

export interface WeightedResult {
  distance: number;
  comparisons: number;
}

export const weightedLevenshtein = (a: string, b: string): WeightedResult => {
  const A = a || '';
  const B = b || '';
  const n = A.length;
  const m = B.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i; // deletion
  for (let j = 0; j <= m; j++) dp[0][j] = j; // insertion

  let comparisons = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      comparisons++;
      const ca = A[i - 1];
      const cb = B[j - 1];
      let subCost = 0;
      if (ca === cb) subCost = 0;
      else if (areVisuallySimilar(ca, cb)) subCost = 0.3;
      else subCost = 1;

      const del = dp[i - 1][j] + 1; // deletion
      const ins = dp[i][j - 1] + 1; // insertion
      const sub = dp[i - 1][j - 1] + subCost; // substitution

      dp[i][j] = Math.min(del, ins, sub);
    }
  }

  return { distance: dp[n][m], comparisons };
};

export const isFuzzyMatch = (token: string, keyword: string, maxDistanceOrRatio: number): { matched: boolean; distance: number } => {
  const res = weightedLevenshtein(token, keyword);
  const d = res.distance;
  let matched = false;
  if (maxDistanceOrRatio <= 1) {
    matched = d <= Math.max(1, Math.floor(keyword.length * maxDistanceOrRatio));
  } else {
    matched = d <= maxDistanceOrRatio;
  }
  return { matched, distance: d };
};

export default weightedLevenshtein;
