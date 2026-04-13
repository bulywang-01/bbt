// ===== Apps Script Web App URL =====
const API_URL =
  'https://script.google.com/macros/s/AKfycbyPEqvuUZQgrbI4UlgYmSPLTOo8CtAg8i5Zfl-pjNxLj_zC3p0_AFazlycjZ4Q2NDYxXg/exec';

// ===== JSONP helper（唯一安全版）=====
function callApi(params, callback) {
  const cbname = 'cb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  const qs = new URLSearchParams(params);
  qs.set('callback', cbname);

  const script = document.createElement('script');
  script.src = API_URL + '?' + qs.toString();

  let finished = false;

  window[cbname] = function (res) {
    if (finished) return;
    finished = true;
    try {
      callback(res);
    } finally {
      delete window[cbname];
      script.remove();
    }
  };

  // ✅ 登入 / 裁判頁：錯誤只清理，不 callback 假結果
  script.onerror = function () {
    console.warn('JSONP load warning:', script.src);
    if (callback) {
      callback({ result: 'error', message: 'JSONP load failed' });
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
