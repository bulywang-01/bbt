/**
 * index.js – 首頁班表（穩定版）
 * 目標：一定畫出班表，不被期間 / 初始化順序搞死
 */

/* =========================
 * 全域狀態
 * ========================= */
let judgeGames = [];
let recordGames = [];
let currentRange = 'week'; // 先保留，但暫時不做過濾

/* =========================
 * 初始化
 * ========================= */
document.addEventListener('DOMContentLoaded', () => {
  const sessionRaw = localStorage.getItem('session_user');
  if (!sessionRaw) return;

  let session;
  try {
    session = JSON.parse(sessionRaw);
  } catch {
    return;
  }
  if (!session.user_id) return;

  const roles = (session.role || '').split(',').map(r => r.trim());

  const isJudge =
    roles.includes('judge') ||
    roles.includes('chief_judge') ||
    roles.includes('admin');

  const isRecord =
    roles.includes('record') ||
    roles.includes('record_chief');

  // 預設先顯示 loading
  const loading = document.getElementById('schedule-loading');
  if (loading) loading.style.display = 'block';

  loadDashboardGames(session.user_id, isJudge, isRecord);
});

/* =========================
 * 取得資料
 * ========================= */
function loadDashboardGames(userId, needJudge, needRecord) {

  if (needJudge) {
    callApi(
      { action: 'getMyUpcomingGames', user_id: userId },
      res => {
        console.log('🧑‍⚖️ judge API response =', res);
        if (res && res.result === 'ok' && Array.isArray(res.games)) {
          judgeGames = res.games;
        } else {
          judgeGames = [];
        }
        renderSchedule();
      }
    );
  }

  if (needRecord) {
    callApi(
      { action: 'getMyRecordUpcomingGames', user_id: userId },
      res => {
        console.log('📝 record API response =', res);
        if (res && res.result === 'ok' && Array.isArray(res.games)) {
          recordGames = res.games;
        } else {
          recordGames = [];
        }
        renderSchedule();
      }
    );
  }
}

/* =========================
 * Tab 切換（HTML 會呼叫）
 * ========================= */
function setRange(range) {
  currentRange = range;

  document.querySelectorAll('.tabs button')
    .forEach(btn => btn.classList.remove('active'));

  const btn = document.getElementById(`tab-${range}`);
  if (btn) btn.classList.add('active');

  renderSchedule();
}

/* =========================
 * Render（不做期間過濾）
 * ========================= */
function renderSchedule() {
  console.log('🔥 renderSchedule()', {
    judgeGames: judgeGames.length,
    recordGames: recordGames.length
  });

  const judgeBlock = document.getElementById('judge-schedule');
  const recordBlock = document.getElementById('record-schedule');
  const noBlock = document.getElementById('no-schedule');
  const loading = document.getElementById('schedule-loading');

  if (loading) loading.style.display = 'none';
  if (judgeBlock) judgeBlock.style.display = 'none';
  if (recordBlock) recordBlock.style.display = 'none';
  if (noBlock) noBlock.style.display = 'none';

  let hasAny = false;

  if (judgeGames.length > 0 && judgeBlock) {
    judgeBlock.style.display = 'block';
    renderScheduleCards('judge-list', judgeGames, 'judge');
    hasAny = true;
  }

  if (recordGames.length > 0 && recordBlock) {
    recordBlock.style.display = 'block';
    renderScheduleCards('record-list', recordGames, 'record');
    hasAny = true;
  }

  if (!hasAny && noBlock) {
    noBlock.textContent = '目前尚未安排任何班表。';
    noBlock.style.display = 'block';
  }
}
