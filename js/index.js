/**
 * index.js（Dashboard 版）
 * - 統一管理首頁資料
 * - 支援裁判 / 紀錄 / 雙重身份
 * - 搭配 config.js 的期間定義
 */


/* =========================
 * ✅ 定義全域資料
 * ✅ call API 把資料塞進 judgeGames
 * ✅ 決定什麼時候 render
 * ✅ 真正畫出班表（呼叫 renderScheduleCards）
 * ========================= */
let judgeGames = [];
let recordGames = [];
let currentRange = 'week';

/* =========================
 * 初始化
 * ========================= */
document.addEventListener('DOMContentLoaded', () => {
  const sessionRaw = localStorage.getItem('session_user');
  if (!sessionRaw) return;

  let session;
  try {
    session = JSON.parse(sessionRaw);
  } catch (e) {
    return;
  }
  if (!session.user_id) return;

  // ✅ 全系統統一用 role 字串
  const roles = (session.role || '').split(',').map(r => r.trim());
  
  const isJudge =
    roles.includes('judge') ||
    roles.includes('chief_judge') ||
    roles.includes('admin');   // admin 也要能看到裁判班表
  
  const isRecord =
    roles.includes('record') ||
    roles.includes('record_chief');

  // ✅ 先決定要顯示哪些區塊（畫面層）
  const judgePanel = document.getElementById('judge-schedule');
  const recordPanel = document.getElementById('record-schedule');

  if (judgePanel) judgePanel.style.display = 'none';
  if (recordPanel) recordPanel.style.display = 'none';

  // ✅ 取資料（資料層）
  loadDashboardGames(session.user_id, isJudge, isRecord);
});

/* =========================
 * 取得首頁資料（核心）
 * ========================= */
function loadDashboardGames(userId, needJudge, needRecord) {

  // ✅ 裁判
  if (needJudge) {
    callApi(
      { action: 'getMyUpcomingGames', user_id: userId },
      res => {
        console.error('🧑‍⚖️ judge API response =', res);

        if (res && res.result === 'ok' && Array.isArray(res.games)) {
          judgeGames = res.games;
        } else {
          judgeGames = [];
        }

        // ✅ 關鍵：資料一來就 render
        renderSchedule();
      }
    );
  }

  // ✅ 紀錄
  if (needRecord) {
    callApi(
      { action: 'getMyRecordUpcomingGames', user_id: userId },
      res => {
        console.error('📝 record API response =', res);

        if (res && res.result === 'ok' && Array.isArray(res.games)) {
          recordGames = res.games;
        } else {
          recordGames = [];
        }

        // ✅ 關鍵：資料一來就 render
        renderSchedule();
      }
    );
  }
}


/* =========================
 * 資料完成後 → render
 * ========================= */
/*
let renderLock = false;
function afterDataLoaded(needJudge, needRecord) {
  // ✅ 等到該來的資料都來了
  if (needJudge && judgeGames.length === 0 && needRecord) return;
  if (needRecord && recordGames.length === 0 && needJudge) return;

  if (renderLock) return;
  renderLock = true;

  // ✅ 預設本週
  if (typeof setRange === 'function') {
    setRange('week');
  } else if (typeof renderSchedule === 'function') {
    renderSchedule();
  }
}
*/

/* =========================
 * 提供給 index.html 的資料介面
 * ========================= */
function getJudgeSchedule(range) {
  
  console.error('⚠️ BYPASS period filter, judgeGames =', judgeGames.length);

  const { start, end } = getPeriodRange(range);
  return judgeGames.filter(g => {
    const t = new Date(`${g.date}T${g.time || '00:00'}`);
    return t >= start && t <= end;
  });
}

function getRecordSchedule(range) {
  
  console.error('⚠️ BYPASS period filter, recordGames =', recordGames.length);

  const { start, end } = getPeriodRange(range);
  return recordGames.filter(g => {
    const t = new Date(`${g.date}T${g.time || '00:00'}`);
    return t >= start && t <= end;
  });
}

/**/
function renderSchedule() {
  
  console.error('🔥 renderSchedule() CALLED, range =', currentRange);

  const judge = getJudgeSchedule(currentRange) || [];
  const record = getRecordSchedule(currentRange) || [];

  console.error('🧑‍⚖️ judge.len =', judge.length);
  console.error('📝 record.len =', record.length);

  const judgeBlock = document.getElementById('judge-schedule');
  const recordBlock = document.getElementById('record-schedule');
  const noBlock = document.getElementById('no-schedule');
  const loadingBlock = document.getElementById('schedule-loading');

  // 關 loading
  if (loadingBlock) loadingBlock.style.display = 'none';

  let hasAny = false;

  if (judge.length > 0) {
    judgeBlock.style.display = 'block';
    renderScheduleCards('judge-list', judge, 'judge');
    hasAny = true;
  } else {
    judgeBlock.style.display = 'none';
  }

  if (record.length > 0) {
    recordBlock.style.display = 'block';
    renderScheduleCards('record-list', record, 'record');
    hasAny = true;
  } else {
    recordBlock.style.display = 'none';
  }

  if (!hasAny) {
    noBlock.textContent = '目前此期間尚無排定班表。';
    noBlock.style.display = 'block';
  } else {
    noBlock.style.display = 'none';
  }
}


function setRange(range) {
  currentRange = range;
  renderSchedule();
}

