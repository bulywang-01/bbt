// ===== Apps Script Web App URL =====
const API_URL =
  'https://script.google.com/macros/s/AKfycbwDhkwpFPOjMCBGb-Cdna15Ui8-BCfpu6wNnxjFtUYF4FtdW3vfFMZvlvsptJX-LYKX/exec';

// ===== JSONP helper（唯一安全版）=====
function callApi(params, callback) {

  const cbname = 'cb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  const qs = new URLSearchParams(params);
  qs.set('callback', cbname);

  const script = document.createElement('script');
  script.src = API_URL + '?' + qs.toString();

  let called = false;

  window[cbname] = function (res) {
    called = true;
    try {
      callback(res);
    } finally {
      delete window[cbname];
      script.remove();
    }
  };

  script.onerror = function () {
    console.warn('JSONP load warning:', script.src);

    // ✅ 核心：一定要呼叫 callback
    if (!called) {
      called = true;
      callback({
        result: 'error',
        message: 'jsonp_load_failed'
      });
    }

    delete window[cbname];
    script.remove();
  };

  document.head.appendChild(script);
}

function jsonOutput(obj, callback) {
  if (!callback) {
    throw new Error('Missing JSONP callback');
  }

  return ContentService
    .createTextOutput(`${callback}(${JSON.stringify(obj)})`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
