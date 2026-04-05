// ===== Apps Script Web App URL =====
const API_URL =
  'https://script.google.com/macros/s/AKfycbw5Df7cr0OD2-L2D76eajM1mi11ODYma7u54JfM5kidi-BlYXUTsgxc9pCKV4jAFHTG/exec';

// ===== JSONP helper（全站共用）=====
function callApi(query, callback) {
  const session = JSON.parse(localStorage.getItem('session_user') || '{}');
  const token = session.token || '';

  const cb = 'cb_' + Date.now();
  window[cb] = r => {
    delete window[cb];
    callback(r);
    script.remove();
  };

  const script = document.createElement('script');
  script.src =
    API_URL +
    '?' + query +
    '&token=' + encodeURIComponent(token) +
    '&callback=' + cb;

  document.body.appendChild(script);
}
