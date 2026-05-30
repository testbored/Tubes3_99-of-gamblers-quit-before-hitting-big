document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('rescan');
  const status = document.getElementById('status');
  const algoSelect = document.getElementById('algo');
  const blurToggle = document.getElementById('blurToggle');

  function sendRescan(algoExact) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (!tabs || tabs.length === 0) {
        status.textContent = 'No active tab';
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { type: 'rescan', algoExact }, (resp) => {
        const err = chrome.runtime.lastError;
        if (err) {
          status.textContent = `Rescan failed: ${err.message || err}`;
          return;
        }
        status.textContent = resp && resp.status ? resp.status : 'rescan sent';
      });
    });
  }

  if (algoSelect) {
    chrome.storage.sync.get({ algoExact: 'auto' }, (items) => {
      algoSelect.value = items.algoExact || 'auto';
    });
    algoSelect.addEventListener('change', () => {
      const val = algoSelect.value;
      chrome.storage.sync.set({ algoExact: val }, () => {
        status.textContent = 'Algorithm saved';
        sendRescan(val);
      });
    });
  }

  if (blurToggle) {
    chrome.storage.sync.get({ blurEnabled: true }, (items) => {
      blurToggle.checked = items.blurEnabled !== false;
    });
    blurToggle.addEventListener('change', () => {
      const enabled = !!blurToggle.checked;
      chrome.storage.sync.set({ blurEnabled: enabled }, () => {
        status.textContent = enabled ? 'Blur enabled' : 'Blur disabled';
        sendRescan(algoSelect ? algoSelect.value : 'auto');
      });
    });
  }
  btn.addEventListener('click', () => {
    status.textContent = 'Requesting rescan...';
    chrome.storage.sync.get({ algoExact: 'auto' }, (items) => {
      sendRescan(items.algoExact || 'auto');
    });
  });
});
