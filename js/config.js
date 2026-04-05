// ===== Apps Script Web App URL（務必確認正確）=====
const API_URL='https://script.google.com/macros/s/AKfycbzqocrhzWj7MlJvuHvhex5OCW_FLQ0pgcEyTS54y8oo89Ml7qbfeZrogomUReX6WMFC/exec';

// ===== JSONP 呼叫工具 =====
function callApi(q, cb){
  const session = JSON.parse(localStorage.getItem('session_user') || '{}');
  const token = session.token || '';

  const f = 'cb_' + Date.now();
  window[f] = function (r) {
    delete window[f];
    cb(r);
    script.remove();
  };

  const script = document.createElement('script');
  // ✅ 關鍵在這一行：一定要用「&」，不是 &amp;
  script.src = API_URL + '?' + q + '&token=' + encodeURIComponent(token) + '&callback=' + f;

  // ✅ 防呆：如果 script 載不進來，至少知道原因
  script.onerror = function () {
    console.error('JSONP 載入失敗:', script.src);
  };

  document.body.appendChild(script);
}
