/**
 * index.js – 首頁班表 Dashboard（最終定案版）
 * 規則：
 * - admin = 最大權限，可看裁判 + 紀錄
 * - chief_judge = judge
 * - record_chief = record
 * - 個人班表共用 API，不另生 API
 */

/* =========================
 * 全域狀態
 * ========================= */
let judgeGames = [];
let recordGames = [];
let currentRange = 'week';

/* =========================
 * 初始化
 * ========================= */
document.addEventListener('DOMContentLoaded', () => {
  const raw = localStorage.getItem('session_user');
  if (!raw) return;

  let session;
  try {
    session = JSON.parse(raw);
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
    roles.includes('record_chief') ||
    roles.includes('admin');

  const loading = document.getElementById('schedule-loading');
  if (loading) loading.style.display = 'block';

  // ===== 裁判班表 =====
  if (isJudge) {
    callApi(
      { action: 'getMyUpcomingGames', user_id: session.user_id },
      res => {
        console.log('🧑‍⚖️ judge API response =', res);
        judgeGames =
          res && res.result === 'ok' && Array.isArray(res.games)
            ? res.games
            : [];
        renderSchedule();
      }
    );
  }

  // ===== 紀錄班表 =====
  if (isRecord) {
    callApi(
      { action: 'getMyRecordUpcomingGames', user_id: session.user_id },
      res => {
        console.log('📝 record API response =', res);
        recordGames =
          res && res.result === 'ok' && Array.isArray(res.games)
            ? res.games
            : [];
        renderSchedule();
      }
    );
  }
});

/* =========================
 * Tab 切換（HTML 呼叫）
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
 * Render（先不做期間過濾，確保一定顯示）
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
