// ===== Apps Script Web App URL =====
const API_BASE =
  'https://script.google.com/macros/s/AKfycbxIfvUScuS33u6_lQfE-MExUj1Jj5ueAjN4WwRtCmb3QrcyoMV0h6aOp7LEJFXkTemK/exec';

// ===== JSONP helper（封版唯一安全版）=====
function callApi(params, callback) {

  const cbName = 'cb_' + Date.now() + '_' + Math.floor(Math.random()*1000);

  // ✅ 組 URL
  const query = Object.keys(params)
    .map(k => `${k}=${encodeURIComponent(params[k])}`)
    .join('&');

  const url = `${API_BASE}?${query}&callback=${cbName}`;

  const script = document.createElement('script');

  let timeout = setTimeout(() => {
    console.error('JSONP timeout:', url);
    callback && callback(null);
    cleanup();
  }, 8000);

  function cleanup(){
    delete window[cbName];
    script.remove();
    clearTimeout(timeout);
  }

  // ✅ ✅ ✅ 關鍵：callback 必須掛在 window
  window[cbName] = function(res){
    cleanup();

    try {
      callback && callback(res);
    } catch(e){
      console.error('callback error:', e);
      callback(null);
    }
  };

  script.onerror = function(){
    console.error('JSONP load failed:', url);
    callback && callback(null);
    cleanup();
  };

  script.src = url;

  document.body.appendChild(script);
}


function jsonOutput(obj, callback) {
  if (!callback) {
    throw new Error('Missing JSONP callback');
  }

  return ContentService
    .createTextOutput(`${callback}(${JSON.stringify(obj)})`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/* =========================
 * Period / Date Utilities
 * 定義全系統共用時間週期規則
 * 週期：星期一 → 星期日
 * ========================= */

// ✅ 取得「星期一～星期日」的週期
function getWeekRange(baseDate = new Date()) {
  const d = new Date(baseDate);
  d.setHours(0, 0, 0, 0);

  const day = d.getDay() === 0 ? 7 : d.getDay(); // Sunday = 7
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

// ✅ 本週
function getThisWeek() {
  return getWeekRange(new Date());
}

// ✅ 下週
function getNextWeek() {
  const next = new Date();
  next.setDate(next.getDate() + 7);
  return getWeekRange(next);
}

// ✅ 本月
function getThisMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

// ✅ 統一依 range 取得期間
// ✅ 期間計算（本週 / 下週 / 本月）
function getPeriodRange(range) {
  switch (range) {
    case 'week':
      return getThisWeek();
    case 'next':
      return getNextWeek();
    case 'month':
      return getThisMonth();
    default:
      return getThisWeek();
  }
}
