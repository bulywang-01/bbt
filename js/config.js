// ===== Apps Script Web App URL =====
const API_URL =
  'https://script.google.com/macros/s/AKfycbzSP3a9LK-eYtqgxQeHpiHPf9gddc34NIRJ-cC515b1PdEyAb5qE9mKhrQCfPXM3uzQ/exec';

// ===== JSONP helper（封版唯一安全版）=====
function callApi(params, callback) {
  const cbname = 'cb_' + Date.now() + '_' + Math.random().toString(36).slice(2);

  const qs = new URLSearchParams(params);
  qs.set('callback', cbname);

  const script = document.createElement('script');
  script.src = API_URL + '?' + qs.toString();

  let finished = false;   // ✅ 成功旗標（關鍵）

  // ✅ JSONP 成功回傳
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

  // ✅ JSONP 失敗（只在「真的沒成功過」時才回報）
  script.onerror = function () {
    console.warn('JSONP load warning:', script.src);

    if (!finished && callback) {   // ✅ 關鍵判斷
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
