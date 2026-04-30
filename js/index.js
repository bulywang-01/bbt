/**
 * index.js
 * 首頁附加邏輯：
 * - 依身份顯示裁判 / 紀錄員班表
 * - 支援雙重身份
 */

document.addEventListener('DOMContentLoaded', () => {
  const session = JSON.parse(localStorage.getItem('session_user') || '{}');
  if (!session || !session.user_id) return;

  /**
   * ✅ roles 建議格式：
   * roles: ['judge', 'record']
   */
  const roles = session.roles || [];

  const isJudge  = roles.includes('judge');
  const isRecord = roles.includes('record');

  /* =========================
   * 裁判班表
   * ========================= */
  if (isJudge) {
    const judgePanel = document.getElementById('upcoming-panel');
    if (judgePanel) {
      judgePanel.style.display = 'block';
      // ✅ 原本 index.html 已有這支
      if (typeof loadUpcomingGames === 'function') {
        loadUpcomingGames();
      }
    }
  }

  /* =========================
   * 紀錄員班表
   * ========================= */
  if (isRecord) {
    const recordPanel = document.getElementById('record-upcoming-panel');
    if (recordPanel) {
      recordPanel.style.display = 'block';
      loadRecordUpcomingGames();
    }
  }
});

/* =========================
 * 紀錄員：近期賽事
 * ========================= */
function loadRecordUpcomingGames() {
  const session = JSON.parse(localStorage.getItem('session_user') || '{}');
  if (!session.user_id) return;

  const loading = document.getElementById('recordUpcomingLoading');
  const weekSection = document.getElementById('record-week-section');
  const otherSection = document.getElementById('record-other-section');
  const noDuty = document.getElementById('record-no-duty');

  if (loading) loading.style.display = 'block';
  if (weekSection) weekSection.style.display = 'none';
  if (otherSection) otherSection.style.display = 'none';
  if (noDuty) noDuty.style.display = 'none';

  callApi(
    {
      action: 'getMyRecordUpcomingGames',
      user_id: session.user_id
    },
    res => {
      if (loading) loading.style.display = 'none';
      if (!res || res.result !== 'ok' || !Array.isArray(res.games)) {
        if (noDuty) noDuty.style.display = 'block';
        return;
      }

      const weekGames = res.games.filter(g => isThisWeek(g.date));
      const monthGames = res.games.filter(
        g => isThisMonth(g.date) && !isThisWeek(g.date)
      );

      if (weekGames.length > 0) {
        weekSection.style.display = 'block';
        renderDutyList('record-week-list', weekGames);
      }

      if (monthGames.length > 0) {
        otherSection.style.display = 'block';
        renderDutyList('record-other-list', monthGames);
      }

      if (weekGames.length === 0 && monthGames.length === 0) {
        if (noDuty) noDuty.style.display = 'block';
      }
    }
  );
}
