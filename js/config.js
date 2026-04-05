// ===== Apps Script Web App URL =====
const API_URL =
  'https://script.google.com/macros/s/AKfycbxGboInXgBK7qxTkrumArINT9q4F3Dej72tHt_Ohd9xqGr4H0FhiTCrC0dCniCZQp5M/exec';

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
