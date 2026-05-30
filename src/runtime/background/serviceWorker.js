chrome.runtime.onInstalled.addListener(() => {
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'report') {
    sendResponse({status: 'ok'});
  }
  if (msg && msg.type === 'getKeywords') {
    const url = chrome.runtime.getURL('keywords/keywords.txt');
    fetch(url).then(r=>r.text()).then(text=> sendResponse({status:'ok', text})).catch(err=> sendResponse({status:'error', error: String(err)}));
    return true;
  }
  if (msg && msg.type === 'installPageBridge') {
    const tabId = sender.tab && sender.tab.id;
    if (!tabId) { sendResponse({status: 'error', error: 'no-tab'}); return; }
    chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        if (typeof window.judolRescan !== 'function') {
          window.judolRescan = () => {
            window.postMessage({ source: 'judol-detector', type: 'rescan' }, '*');
          };
        }
      }
    }, () => {
      const err = chrome.runtime.lastError;
      if (err) sendResponse({ status: 'error', error: String(err) });
      else sendResponse({ status: 'installed' });
    });
    return true;
  }
      if (msg && msg.type === 'injectModule') {
    const tabId = sender.tab && sender.tab.id;
    if (!tabId) { sendResponse({status: 'error', error: 'no-tab'}); return; }
    chrome.scripting.executeScript({ target: { tabId }, files: ['content/content.js'] }, () => {
      const err = chrome.runtime.lastError;
      if (err) sendResponse({ status: 'error', error: String(err) });
      else sendResponse({ status: 'injected' });
    });
    return true;
  }
  return true;
});
