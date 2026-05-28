interface MatchResult {
  keyword: string;       
  algorithm:'KMP'|'BM'|'Regex'|'Fuzzy';
  position: number;  
  distance?: number;
  matchedText: string;
}

interface DetectionResult {
  element: Element;           
  matches: MatchResult[];     
  executionTime: number;      
  occurrences: number;        
}

interface ScanStats {
  totalKeywordsFound: number;
  executionTimePerAlgorithm: Record<string, number>; 
  matchCountPerAlgorithm: Record<string, number>;
  keywordFrequency: Record<string, number>;
}

interface TooltipData {
  keyword: string;
  algorithm: string;
  occurrences: number;
  executionTime: number;
}