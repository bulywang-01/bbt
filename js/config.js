// ===== Apps Script Web App URL（務必確認正確）=====
const API_URL='https://script.google.com/macros/s/AKfycbzqocrhzWj7MlJvuHvhex5OCW_FLQ0pgcEyTS54y8oo89Ml7qbfeZrogomUReX6WMFC/exec';

// ===== JSONP 呼叫工具 =====
//function callApi(query, callback) {
//  const cbName = 'cb_' + Date.now();

//  window[cbName] = function (res) {
//    try {
//      callback(res);
//    } finally {
//      delete window[cbName];
//      script.remove();
//    }
//  };

//  const script = document.createElement('script');
//  script.src = API_URL + '?' + query + '&callback=' + cbName;
//  document.body.appendChild(script);
//}
