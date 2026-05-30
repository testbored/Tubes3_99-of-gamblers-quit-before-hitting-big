document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('rescan');
  const status = document.getElementById('status');
  btn.addEventListener('click', () => {
    status.textContent = 'Requesting rescan...';
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (!tabs || tabs.length === 0) {
        status.textContent = 'No active tab';
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, {type: 'rescan'}, (resp) => {
        status.textContent = resp && resp.status ? resp.status : 'rescan sent';
      });
    });
  });
});
