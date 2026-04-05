// ===== Apps Script Web App URL（務必確認正確）=====
const API_URL='https://script.google.com/macros/s/AKfycbxelLea75yy-DLk88HTG1huP-r9-yVFebl20NRTH6im45xMC9nPRJUsiBq7inb22iQa/exec';

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
