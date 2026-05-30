(async () => {
  const moduleUrl = chrome.runtime.getURL('src/entry/content.js');
  try {
    await import(moduleUrl);
  } catch (e) {
    try {
      chrome.runtime.sendMessage({ type: 'injectModule' }, (resp) => {
        void resp;
      });
    } catch (err) {
      void err;
    }
  }
})();
