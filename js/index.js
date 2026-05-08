/**
 * index.js – 首頁班表（最終穩定版）
 */

let judgeGames = [];
let recordGames = [];
let currentRange = 'week';

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
    roles.includes('record_chief');

  const loading = document.getElementById('schedule-loading');
  if (loading) loading.style.display = 'block';

  // ===== 裁判 =====
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

  // ===== 紀錄（依身份選 API）=====
  if (roles.includes('record')) {
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

  if (roles.includes('record_chief')) {
    callApi(
      { action: 'getMyRecordAdminUpcomingGames', user_id: session.user_id },
      res => {
        console.log('📋 record_chief API response =', res);
        recordGames =
          res && res.result === 'ok' && Array.isArray(res.games)
            ? res.games
            : [];
        renderSchedule();
      }
    );
  }
});

function setRange(range) {
  currentRange = range;
  document.querySelectorAll('.tabs button')
    .forEach(btn => btn.classList.remove('active'));
  const btn = document.getElementById(`tab-${range}`);
  if (btn) btn.classList.add('active');
  renderSchedule();
}

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
