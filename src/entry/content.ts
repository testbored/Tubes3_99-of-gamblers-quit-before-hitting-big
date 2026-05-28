import { BM } from '../algorithms/BM';
import { KMP } from '../algorithms/KMP';
import { isFuzzyMatch } from '../algorithms/LW';
import { RegEx, getCodeMatch } from '../algorithms/Regex';

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

function skipNode(node: Text): boolean {
  let current: HTMLElement | null = node.parentElement;
  while (current) {
    const tag = current.tagName;
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'OPTION'].includes(tag)) {
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

function markNode(node: Text, matches: Array<{start:number,end:number,text:string,title?:string}>) {
  if (!matches || matches.length === 0) return;
  matches = matches.slice().sort((a,b) => a.start - b.start || a.end - b.end);

  const parent = node.parentNode;
  if (!parent) return;

  const frag = document.createDocumentFragment();
  let lastIndex = 0;
  const textContent = node.nodeValue || '';

  for (const m of matches) {
    const { start, end, title } = m;
    if (start > lastIndex) {
      frag.appendChild(document.createTextNode(textContent.slice(lastIndex, start)));
    }
    const span = mkSpan(textContent.slice(start, end), title);
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

function collectRegexMatches(text: string): Array<{start:number,end:number,text:string,title?:string}> {
  const match = getCodeMatch(text);
  if (!match) return [];
  const index = RegEx(text);
  if (index < 0) return [];
  return [{ start: index, end: index + match.length, text: match, title: 'regex' }];
}

function collectExactMatches(text: string, textLC: string, keywords: string[], keywordsLC: string[]): Array<{start:number,end:number,text:string,title?:string}> {
  const matches: Array<{start:number,end:number,text:string,title?:string}> = [];
  for (let i = 0; i < keywordsLC.length; i++) {
    const kw = keywords[i];
    const kwLC = keywordsLC[i];
    let offset = 0;
    while (offset <= text.length - kw.length) {
      const sliceLC = textLC.substring(offset);
      const pos = kwLC.length > 3 ? BM(kwLC, sliceLC) : KMP(sliceLC, kwLC);
      if (pos === -1) break;
      const start = offset + pos;
      matches.push({start, end: start + kw.length, text: text.substring(start, start+kw.length), title: 'exact:'+kw});
      offset = start + kw.length;
    }
  }
  return matches;
}

function collectFuzzyMatches(text: string, keywords: string[], keywordsLC: string[], fuzzyBuckets: Map<number, Array<{ kw: string; kwLC: string }>>): Array<{start:number,end:number,text:string,title?:string}> {
  const matches: Array<{start:number,end:number,text:string,title?:string}> = [];
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
          matches.push({start: idx, end: idx + tokLen, text: tok, title: 'fuzzy:'+item.kw+':d='+res.distance});
        }
      }
    }
    idx += tok.length;
  }
  return matches;
}

async function scan() {
  const keywords = await loadKw();
  if (!keywords.length) return;

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

    counts.regex += regexMatches.length;
    counts.exact += exactMatches.length;
    counts.fuzzy += fuzzyMatches.length;

    const matches: Array<{start:number,end:number,text:string,title?:string}> = [
      ...regexMatches,
      ...exactMatches,
      ...fuzzyMatches,
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
      markNode(node, unique.map(u=>({start:u.start, end:u.end, text:text.substring(u.start,u.end), title:u.title})));
    }
  }
}

function clearMarks() {
  document.querySelectorAll('.judol-highlight').forEach(el=>{
    const txt = document.createTextNode(el.textContent || '');
    el.parentNode?.replaceChild(txt, el);
  });
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
