import { BM } from '../algorithms/BM';
import { KMP } from '../algorithms/KMP';
import { isFuzzyMatch } from '../algorithms/LW';
import { RegEx, getCodeMatch } from '../algorithms/Regex';

type Algo = 'regex' | 'exact' | 'fuzzy';

type Hit = {
  start: number;
  end: number;
  text: string;
  title?: string;
  keyword: string;
  algo: Algo;
  key: string;
};

type MatchBatch = {
  hits: Hit[];
  time: number;
};

type ScanStats = {
  counts: Map<string, number>;
  times: Record<Algo, number>;
};

const scanStats: ScanStats = {
  counts: new Map<string, number>(),
  times: { regex: 0, exact: 0, fuzzy: 0 }
};

const tip = document.createElement('div');
tip.style.cssText = [
  'position:fixed',
  'z-index:2147483647',
  'display:none',
  'max-width:280px',
  'padding:8px 10px',
  'border-radius:8px',
  'background:rgba(20,20,20,.96)',
  'color:#fff',
  'font:12px/1.4 sans-serif',
  'box-shadow:0 8px 24px rgba(0,0,0,.25)',
  'pointer-events:none',
  'white-space:pre-wrap'
].join(';');
document.documentElement.appendChild(tip);

function setTip(node: HTMLElement, x: number, y: number) {
  const keyword = node.dataset.keyword || '';
  const algo = node.dataset.algo || '';
  const count = node.dataset.count || '0';
  const time = node.dataset.time || '0';
  tip.textContent = [
    `Keyword: ${keyword}`,
    `Algorithm: ${algo}`,
    `Occurrences: ${count}`,
    `Execution time: ${time} ms`
  ].join('\n');
  tip.style.left = `${Math.min(x + 12, window.innerWidth - 300)}px`;
  tip.style.top = `${Math.min(y + 12, window.innerHeight - 120)}px`;
  tip.style.display = 'block';
}

document.addEventListener('mouseover', (event) => {
  const el = (event.target as HTMLElement | null)?.closest?.('.judol-highlight') as HTMLElement | null;
  if (!el) return;
  setTip(el, event.clientX, event.clientY);
});

document.addEventListener('mousemove', (event) => {
  const el = (event.target as HTMLElement | null)?.closest?.('.judol-highlight') as HTMLElement | null;
  if (!el) return;
  setTip(el, event.clientX, event.clientY);
});

document.addEventListener('mouseout', (event) => {
  const el = event.target as HTMLElement | null;
  if (el && el.closest && el.closest('.judol-highlight')) {
    tip.style.display = 'none';
  }
});

async function loadKw(): Promise<string[]> {
  const url = chrome.runtime.getURL('keywords/keywords.txt');
  try {
    const res = await fetch(url);
    const text = await res.text();
    return text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  } catch {
    const resp = await new Promise<any>((resolve) => chrome.runtime.sendMessage({ type: 'getKeywords' }, resolve));
    if (resp && resp.status === 'ok' && resp.text) {
      return resp.text.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);
    }
    return [];
  }
}

function mkSpan(text: string, title?: string) {
  const span = document.createElement('span');
  span.className = 'judol-highlight';
  span.textContent = text;
  if (title) span.title = title;
  return span;
}

function isOneOf(value: string, list: string[]): boolean {
  for (let i = 0; i < list.length; i++) {
    if (list[i] === value) return true;
  }
  return false;
}

function skipNode(node: Text): boolean {
  let current: HTMLElement | null = node.parentElement;
  while (current) {
    const tag = current.tagName;
    if (isOneOf(tag, ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'OPTION'])) {
      return true;
    }
    const role = current.getAttribute('role');
    if (role === 'search' || role === 'searchbox' || role === 'combobox') {
      return true;
    }
    if (current.isContentEditable) {
      return true;
    }
    if (tag === 'FORM' || tag === 'HEADER' || tag === 'NAV') {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

function markNode(node: Text, matches: Hit[]) {
  if (!matches || matches.length === 0) return;
  matches = matches.slice().sort((a,b) => a.start - b.start || a.end - b.end);

  const parent = node.parentNode;
  if (!parent) return;

  const frag = document.createDocumentFragment();
  let lastIndex = 0;
  const textContent = node.nodeValue || '';

  for (const m of matches) {
    const { start, end, title, key, algo, keyword } = m;
    if (start > lastIndex) {
      frag.appendChild(document.createTextNode(textContent.slice(lastIndex, start)));
    }
    const span = mkSpan(textContent.slice(start, end), title);
    span.dataset.key = key;
    span.dataset.algo = algo;
    span.dataset.keyword = keyword;
    frag.appendChild(span);
    lastIndex = Math.max(lastIndex, end);
  }

  if (lastIndex < textContent.length) {
    frag.appendChild(document.createTextNode(textContent.slice(lastIndex)));
  }

  parent.replaceChild(frag, node);
}

function sameEdge(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a[0] === b[0] && a[a.length - 1] === b[b.length - 1];
}

function hasObfuscation(text: string): boolean {
  return /[0-9@#$!|€£α]/.test(text) || /[A-Z]/.test(text) || /[^a-z0-9\s]/i.test(text);
}

function addCount(key: string): void {
  scanStats.counts.set(key, (scanStats.counts.get(key) || 0) + 1);
}

function collectRegexMatches(text: string): MatchBatch {
  const started = performance.now();
  const hits: Hit[] = [];
  const match = getCodeMatch(text);
  if (match) {
    const index = RegEx(text);
    if (index >= 0) {
      const key = `regex:${match.toLowerCase()}`;
      addCount(key);
      hits.push({ start: index, end: index + match.length, text: match, title: 'regex', keyword: match, algo: 'regex', key });
    }
  }
  return { hits, time: performance.now() - started };
}

function collectExactMatches(text: string, textLC: string, keywords: string[], keywordsLC: string[]): MatchBatch {
  const started = performance.now();
  const hits: Hit[] = [];
  for (let i = 0; i < keywordsLC.length; i++) {
    const kw = keywords[i];
    const kwLC = keywordsLC[i];
    let offset = 0;
    while (offset <= text.length - kw.length) {
      const sliceLC = textLC.substring(offset);
      const pos = kwLC.length > 3 ? BM(kwLC, sliceLC) : KMP(sliceLC, kwLC);
      if (pos === -1) break;
      const start = offset + pos;
      const key = `exact:${kwLC}`;
      addCount(key);
      hits.push({start, end: start + kw.length, text: text.substring(start, start+kw.length), title: 'exact:'+kw, keyword: kw, algo: 'exact', key});
      offset = start + kw.length;
    }
  }
  return { hits, time: performance.now() - started };
}

function collectFuzzyMatches(text: string, keywords: string[], keywordsLC: string[], fuzzyBuckets: Map<number, Array<{ kw: string; kwLC: string }>>): MatchBatch {
  const started = performance.now();
  const hits: Hit[] = [];
  const tokens = text.split(/(\W+)/);
  let idx = 0;
  for (const tok of tokens) {
    if (!tok || /\W+/.test(tok)) { idx += tok.length; continue; }
    const tokLC = tok.toLowerCase();
    const tokLen = tok.length;
    if (tokLen < 6) { idx += tok.length; continue; }
    if (!hasObfuscation(tok)) { idx += tok.length; continue; }
    const minLen = Math.max(5, tokLen - 1);
    const maxLen = tokLen + 1;

    for (let len = minLen; len <= maxLen; len++) {
      const bucket = fuzzyBuckets.get(len);
      if (!bucket) continue;

      for (const item of bucket) {
        if (item.kwLC.length < 6 || tokLen < 6) continue;
        if (Math.abs(tokLen - item.kwLC.length) > 1) continue;
        if (!sameEdge(tokLC, item.kwLC)) continue;
        if (!hasObfuscation(item.kw)) continue;

        const threshold = 1;
        const res = isFuzzyMatch(tokLC, item.kwLC, threshold);
        if (res.matched) {
          const key = `fuzzy:${item.kwLC}`;
          addCount(key);
          hits.push({start: idx, end: idx + tokLen, text: tok, title: 'fuzzy:'+item.kw+':d='+res.distance, keyword: item.kw, algo: 'fuzzy', key});
        }
      }
    }
    idx += tok.length;
  }
  return { hits, time: performance.now() - started };
}

function syncTooltipMeta(): void {
  document.querySelectorAll<HTMLElement>('.judol-highlight').forEach((el) => {
    const key = el.dataset.key || '';
    const algo = el.dataset.algo || '';
    const keyword = el.dataset.keyword || '';
    const count = scanStats.counts.get(key) || 0;
    const time = scanStats.times[algo as Algo] || 0;
    el.dataset.count = String(count);
    el.dataset.time = time.toFixed(2);
    if (!el.dataset.keyword) el.dataset.keyword = keyword;
    if (!el.dataset.algo) el.dataset.algo = algo;
  });
}

async function scan() {
  const keywords = await loadKw();
  if (!keywords.length) return;

  scanStats.counts.clear();
  scanStats.times.regex = 0;
  scanStats.times.exact = 0;
  scanStats.times.fuzzy = 0;

  const keywordsLC = keywords.map(k => k.toLowerCase());
  const fuzzyBuckets = new Map<number, Array<{ kw: string; kwLC: string }>>();
  for (let i = 0; i < keywords.length; i++) {
    const kw = keywords[i];
    const kwLC = keywordsLC[i];
    const bucket = fuzzyBuckets.get(kw.length) || [];
    bucket.push({ kw, kwLC });
    fuzzyBuckets.set(kw.length, bucket);
  }

  let counts = { regex: 0, exact: 0, fuzzy: 0 };

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node){
        if(!node.parentNode) return NodeFilter.FILTER_REJECT;
        if (skipNode(node as Text)) return NodeFilter.FILTER_REJECT;
        if(!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const nodes: Text[] = [];
  while(walker.nextNode()) nodes.push(walker.currentNode as Text);

  for (const node of nodes) {
    const text = node.nodeValue || '';
    const textLC = text.toLowerCase();
    const [regexMatches, exactMatches, fuzzyMatches] = await Promise.all([
      Promise.resolve(collectRegexMatches(text)),
      Promise.resolve(collectExactMatches(text, textLC, keywords, keywordsLC)),
      Promise.resolve(collectFuzzyMatches(text, keywords, keywordsLC, fuzzyBuckets)),
    ]);

    scanStats.times.regex += regexMatches.time;
    scanStats.times.exact += exactMatches.time;
    scanStats.times.fuzzy += fuzzyMatches.time;

    counts.regex += regexMatches.hits.length;
    counts.exact += exactMatches.hits.length;
    counts.fuzzy += fuzzyMatches.hits.length;

    const matches: Hit[] = [
      ...regexMatches.hits,
      ...exactMatches.hits,
      ...fuzzyMatches.hits,
    ];

    if (matches.length) {
      const unique: typeof matches = [];
      matches.sort((a,b)=>a.start - b.start || b.end - a.end);
      for (const mm of matches) {
        if (unique.length === 0) unique.push(mm);
        else {
          const last = unique[unique.length-1];
          if (mm.start < last.end) { last.end = Math.max(last.end, mm.end); }
          else unique.push(mm);
        }
      }
      markNode(node, unique);
    }
  }

  syncTooltipMeta();
}

function clearMarks() {
  document.querySelectorAll('.judol-highlight').forEach(el=>{
    const txt = document.createTextNode(el.textContent || '');
    el.parentNode?.replaceChild(txt, el);
  });
  tip.style.display = 'none';
}

async function rescan() {
  clearMarks();
  await scan();
}

chrome.runtime.onMessage.addListener((msg: any, sender: any, sendResponse: any) => {
  if (!msg) return;
  if (msg.type === 'rescan') {
    rescan().then(()=> sendResponse({status: 'rescanned'})).catch((err:any)=> sendResponse({status: 'error', error: String(err)}));
    return true;
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { rescan(); }, { once: true });
} else {
  rescan();
}
