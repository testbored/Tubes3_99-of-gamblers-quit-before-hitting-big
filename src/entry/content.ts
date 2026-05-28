import { BM } from '../algorithms/BM';
import { KMP } from '../algorithms/KMP';
import weightedLevenshtein from '../algorithms/LW';
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

async function scan() {
  const keywords = await loadKw();
  if (!keywords.length) return;

  const keywordsLC = keywords.map(k => k.toLowerCase());

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
    const matches: Array<{start:number,end:number,text:string,title?:string}> = [];
    const regexMatch = getCodeMatch(text);
    if (regexMatch) {
      const regexIndex = RegEx(text);
      if (regexIndex >= 0) {
        matches.push({start: regexIndex, end: regexIndex + regexMatch.length, text: regexMatch, title: 'regex'});
        counts.regex++;
      }
    }
    // exact match
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
        counts.exact++;
        offset = start + kw.length;
      }
    }
    // fuzzy
    const tokens = text.split(/(\W+)/);
    let idx = 0;
    for (const tok of tokens) {
      if (!tok || /\W+/.test(tok)) { idx += tok.length; continue; }
      for (let i = 0; i < keywordsLC.length; i++) {
        const kw = keywords[i];
        const kwLC = keywordsLC[i];
        const res = weightedLevenshtein(tok.toLowerCase(), kwLC);
        const threshold = Math.max(1, Math.floor(kwLC.length * 0.25));
        if (res.distance <= threshold) {
          matches.push({start: idx, end: idx + tok.length, text: tok, title: 'fuzzy:'+kw+':d='+res.distance+':c='+res.comparisons});
          counts.fuzzy++;
        }
      }
      idx += tok.length;
    }

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
