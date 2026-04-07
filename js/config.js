// ===== Apps Script Web App URL =====
const API_URL =
  'https://script.google.com/macros/s/AKfycbw0KMz57TYUhBX4xmC9T-I8dZ5z8MuWF3HiFaTjDLJ_tgiwnaO_8Si7R3fCdY7UitvE/exec';

// ===== JSONP helper（唯一安全版）=====
function callApi(params, callback) {
  const session = JSON.parse(localStorage.getItem('session_user') || '{}');
  const token = session.token || '';

  // ✅ 一律用 URLSearchParams（避免 &amp;）
  const qs = new URLSearchParams(params);
  qs.set('token', token);

  const cbName = 'cb_' + Date.now();
  qs.set('callback', cbName);

  window[cbName] = function (res) {
    try {
      callback(res);
    } finally {
      delete window[cbName];
      script.remove();
    }
  };

  const script = document.createElement('script');
  script.src = API_URL + '?' + qs.toString();

  script.onerror = function () {
    console.error('JSONP load failed:', script.src);
  };

  document.body.appendChild(script);
}
