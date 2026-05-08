/**
 * index.js – 首頁「我的班表」
 * 最終穩定版 ✅
 *
 * 設計原則：
 * - 個人最終結果視角（指派 > 報名）
 * - 同一場比賽可同時有裁判 + 紀錄
 * - 週期：週一～週日
 * - 避開 Date parsing 地雷
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

  const session = JSON.parse(raw);
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

  document.getElementById('schedule-loading')?.style.setProperty('display', 'block');

  if (isJudge) {
    callApi(
      { action: 'getMyUpcomingGames', user_id: session.user_id },
      res => {
        judgeGames = (res && res.result === 'ok' && Array.isArray(res.games))
          ? res.games
          : [];
        renderSchedule();
      }
    );
  }

  if (isRecord) {
    callApi(
      { action: 'getMyRecordUpcomingGames', user_id: session.user_id },
      res => {
        recordGames = (res && res.result === 'ok' && Array.isArray(res.games))
          ? res.games
          : [];
        renderSchedule();
      }
    );
  }

  setupViewFullSchedule(session);
});

/* =========================
 * 切換 本週 / 下週 / 本月
 * ========================= */
function setRange(range) {
  currentRange = range;
  document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${range}`)?.classList.add('active');
  renderSchedule();
}

/* =========================
 * 主 render
 * ========================= */
function renderSchedule() {
  const box = document.getElementById('schedule-list');
  const noBlock = document.getElementById('no-schedule');

  document.getElementById('schedule-loading')?.style.setProperty('display', 'none');
  if (!box) return;

  box.innerHTML = '';
  noBlock.style.display = 'none';

  // ✅ 合併裁判＋紀錄（同一場）
  const merged = mergeMySchedules(judgeGames, recordGames);

  // ✅ 只用日期做區間判斷（避開時間地雷）
  const { start, end } = getPeriodRange(currentRange);

  const filtered = merged.filter(g => {
    const d = new Date(g.date.replace(/\//g, '-'));
    d.setHours(0,0,0,0);
    return d >= start && d <= end;
  });

  if (!filtered.length) {
    noBlock.textContent = '此期間尚無班表';
    noBlock.style.display = 'block';
    return;
  }

  renderMergedCards(filtered);
}

/* =========================
 * 合併 裁判＋紀錄（同一場一張）
 * ========================= */
function mergeMySchedules(judgeGames, recordGames) {
  const map = {};

  function ensure(g) {
    if (!map[g.game_id]) {
      map[g.game_id] = {
        game_id: g.game_id,
        date: g.date,
        time: g.time,
        field: g.field,
        roles: []
      };
    }
    return map[g.game_id];
  }

  // ✅ 裁判（永遠 push，不覆蓋）
  judgeGames.forEach(g => {
    ensure(g).roles.push({
      type: 'judge',
      role: g.role || null
    });
  });

  // ✅ 紀錄（永遠 push，即使同一場）
  recordGames.forEach(g => {
    ensure(g).roles.push({
      type: 'record',
      role: g.record_role || null
    });
  });

  return Object.values(map);
}

/* =========================
 * 合併卡片 render（橫式）
 * ========================= */
function renderMergedCards(games) {
  const box = document.getElementById('schedule-list');

  const JUDGE_ROLE = { PU:'主審', U1:'一壘', U2:'二壘', U3:'三壘' };
  const RECORD_ROLE = {
    REC_MAIN:'主紀錄',
    REC_TRAINEE:'見習紀錄',
    REC_VIDEO:'影像紀錄'
  };

  games
    .sort((a,b) => a.date.localeCompare(b.date))
    .forEach(g => {

      const roleSpans = g.roles.map(r => {
        if (r.type === 'judge') {
          return `<span class="role role-judge">🧑‍⚖️ 裁判｜${JUDGE_ROLE[r.role] || '待指派'}</span>`;
        }
        if (r.type === 'record') {
          return `<span class="role role-record">📝 紀錄｜${RECORD_ROLE[r.role] || '待指派'}</span>`;
        }
        return '';
      }).join(' ');

      const card = document.createElement('div');
      card.className = 'schedule-card';

      card.innerHTML = `
        <div class="card-date">${formatZhDate(g.date)}</div>
        <div class="card-row">
          <span>⏰ ${formatTimeOnly(g.time)}</span>
          <span class="sep">｜</span>
          <span>📍 ${g.field || ''}</span>
          <span class="sep">｜</span>
          ${roleSpans}
        </div>
      `;

      box.appendChild(card);
    });
}

/* =========================
 * 週期（週一～週日）
 * ========================= */
function getPeriodRange(range) {
  const today = new Date();
  today.setHours(0,0,0,0);

  let start, end;

  if (range === 'week') {
    const d = today.getDay() || 7;
    start = new Date(today);
    start.setDate(today.getDate() - d + 1);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  }

  if (range === 'next') {
    const d = today.getDay() || 7;
    start = new Date(today);
    start.setDate(today.getDate() - d + 8);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  }

  if (range === 'month') {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  }

  start.setHours(0,0,0,0);
  end.setHours(23,59,59,999);
  return { start, end };
}

/* =========================
 * 查看完整班表
 * ========================= */
function setupViewFullSchedule(session) {
  const link = document.getElementById('view-full-schedule');
  if (!link) return;

  const roles = (session.role || '').split(',').map(r => r.trim());

  link.onclick = () => {
    const hasJudge = roles.some(r => ['judge','chief_judge','admin'].includes(r));
    const hasRecord = roles.some(r => ['record','record_chief','admin'].includes(r));

    if (hasJudge && hasRecord) {
      document.getElementById('fullScheduleRoleModal')?.style.setProperty('display','flex');
      return;
    }

    if (hasJudge) location.href = 'judge_dashboard.html';
    else if (hasRecord) location.href = 'record_dashboard.html';
  };
}

/* =========================
 * Helpers
 * ========================= */
function formatTimeOnly(t) {
  if (!t) return '';
  if (typeof t === 'string' && /^\d{1,2}:\d{2}$/.test(t)) return t;
  const d = new Date(t);
  return isNaN(d) ? String(t) :
    `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function formatZhDate(dateStr) {
  const d = new Date(dateStr.replace(/\//g,'-'));
  const w = ['日','一','二','三','四','五','六'];
  return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}（${w[d.getDay()]}）`;
}
