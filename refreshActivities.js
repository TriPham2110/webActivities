document.addEventListener('DOMContentLoaded', function() {
    var confirmButton = document.getElementById('confirm-button');
    var cancelButton = document.getElementById('cancel-button');
  
    confirmButton.addEventListener('click', function() {
      window.close();
    });
  
    cancelButton.addEventListener('click', function() {
      chrome.storage.local.set({ ['tableData']: [] });
      window.close();
    });
  });