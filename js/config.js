// ===== Apps Script Web App URL（務必確認正確）=====
const API_URL='https://script.google.com/macros/s/AKfycbzqocrhzWj7MlJvuHvhex5OCW_FLQ0pgcEyTS54y8oo89Ml7qbfeZrogomUReX6WMFC/exec';

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
    API_URL + '?' + query +
    '&token=' + encodeURIComponent(token) +
    '&callback=' + cbName;

  script.onerror = function () {
    console.error('API 載入失敗：', script.src);
  };

  document.body.appendChild(script);
}
