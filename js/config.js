// ===== Apps Script Web App URL =====
const API_URL =
  'https://script.google.com/macros/s/AKfycbwdIXnwBjkv2R4kUAd0I25n86dirlorVws9W9Rv_uswlGkeaGdNsl43nAJRhzqIzVBJ/exec';

// ===== JSONP helper（全站共用）=====
function callApi(query, callback) {
  const session = JSON.parse(localStorage.getItem('session_user') || '{}');
  const token = session.token || '';

  const cbName = 'cb_' + Date.now();

  window[cbName] = function (res) {
    try {
      callback(res);
    } finally {
      delete window[cbName];
      script.remove();
    }
  };

  const script = document.createElement('script');

  // ✅ 關鍵：只能用 & ，絕對不能用 &amp;
  script.src =
    API_URL +
    '?' + query +
    '&token=' + encodeURIComponent(token) +
    '&callback=' + cbName;

  script.onerror = function () {
    console.error('API 載入失敗：', script.src);
  };

  document.body.appendChild(script);
}
