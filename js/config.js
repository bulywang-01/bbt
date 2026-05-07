// ===== Apps Script Web App URL =====
const API_URL =
  'https://script.google.com/macros/s/AKfycbyWTu1t7hqy8awYpagYnvz5SUYzKLhn7Hnk8fhhlkx_j0Ee-yZP_DpjdBxVB-V2gNu0-w/exec';


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
