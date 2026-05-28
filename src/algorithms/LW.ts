const VISUAL_SIMILAR: Record<string, string[]> = {
  '0': ['o', 'O'],
  '1': ['l', 'i', 'I'],
  '2': ['z', 'Z'],
  '3': ['e', 'E'],
  '4': ['a', 'A'],
  '5': ['s', 'S'],
  '6': ['g', 'G'],
  '7': ['t', 'T'],
  '8': ['b', 'B'],
  '9': ['g', 'G', 'q', 'Q'],
  'α': ['a', 'A'],
  '@': ['a', 'A'],
  '$': ['s', 'S'],
  '|': ['l', 'L'],
  '!': ['i', 'I', 'l', 'L'],
  '€': ['e', 'E'],
  '£': ['l', 'L']
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

export const weightedLevenshtein = (a: string, b: string, maxDistance = Infinity): WeightedResult => {
  const A = a || '';
  const B = b || '';
  const n = A.length;
  const m = B.length;

  if (maxDistance !== Infinity && Math.abs(n - m) > maxDistance) {
    return { distance: maxDistance + 1, comparisons: 0 };
  }

  let prev = new Array(m + 1).fill(0);
  let curr = new Array(m + 1).fill(0);
  for (let j = 0; j <= m; j++) prev[j] = j;

  let comparisons = 0;
  for (let i = 1; i <= n; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= m; j++) {
      comparisons++;
      const ca = A[i - 1];
      const cb = B[j - 1];
      let subCost = 0;
      if (ca === cb) subCost = 0;
      else if (areVisuallySimilar(ca, cb)) subCost = 0.3;
      else subCost = 1;

      const del = prev[j] + 1; // deletion
      const ins = curr[j - 1] + 1; // insertion
      const sub = prev[j - 1] + subCost; // substitution

      curr[j] = Math.min(del, ins, sub);
      if (curr[j] < rowMin) rowMin = curr[j];
    }

    if (maxDistance !== Infinity && rowMin > maxDistance) {
      return { distance: maxDistance + 1, comparisons };
    }

    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return { distance: prev[m], comparisons };
};

export const isFuzzyMatch = (token: string, keyword: string, maxDistanceOrRatio: number): { matched: boolean; distance: number } => {
  const threshold = maxDistanceOrRatio <= 1 ? Math.max(1, Math.floor(keyword.length * maxDistanceOrRatio)) : maxDistanceOrRatio;
  const res = weightedLevenshtein(token, keyword, threshold);
  return { matched: res.distance <= threshold, distance: res.distance };
};

export default weightedLevenshtein;
