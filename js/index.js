/**
 * index.js – 首頁「我的班表」
 * ✅ 穩定版（避免 Date parsing 地雷）
 * ✅ 合併裁判＋紀錄
 * ✅ 正確處理 本週 / 下週 / 本月
 * ✅ 查看完整班表可用
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

  const isJudge = roles.includes('judge') || roles.includes('chief_judge') || roles.includes('admin');
  const isRecord = roles.includes('record') || roles.includes('record_chief') || roles.includes('admin');

  document.getElementById('schedule-loading')?.style.setProperty('display', 'block');

  if (isJudge) {
    callApi(
      { action: 'getMyUpcomingGames', user_id: session.user_id },
      res => {
        judgeGames = (res && res.result === 'ok' && Array.isArray(res.games)) ? res.games : [];
        renderSchedule();
      }
    );
  }

  if (isRecord) {
    callApi(
      { action: 'getMyRecordUpcomingGames', user_id: session.user_id },
      res => {
        recordGames = (res && res.result === 'ok' && Array.isArray(res.games)) ? res.games : [];
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

  box.innerHTML = '';
  noBlock.style.display = 'none';

  const merged = mergeMySchedules(judgeGames, recordGames);

  // ✅ 只用「日期」做週期過濾（不碰時間）
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

  judgeGames.forEach(g => {
    ensure(g).roles.push({ type: 'judge', role: g.role || null });
  });

  recordGames.forEach(g => {
    ensure(g).roles.push({ type: 'record', role: g.record_role || null });
  });

  return Object.values(map);
}

/* =========================
 * 合併卡片 render
 * ========================= */
function renderMergedCards(games) {
  const box = document.getElementById('schedule-list');

  const JUDGE_ROLE = { PU:'主審', U1:'一壘', U2:'二壘', U3:'三壘' };
  const RECORD_ROLE = { REC_MAIN:'主紀錄', REC_TRAINEE:'見習紀錄', REC_VIDEO:'影像紀錄' };

  games
    .sort((a,b) => a.date.localeCompare(b.date))
    .forEach(g => {
      const roleLines = g.roles.map(r => {
        if (r.type === 'judge') {
          return `🧑‍⚖️ 裁判｜${JUDGE_ROLE[r.role] || '待指派'}`;
        }
        if (r.type === 'record') {
          return `📝 紀錄｜${RECORD_ROLE[r.role] || '待指派'}`;
        }
      }).join('<br>');

      const card = document.createElement('div');
      card.className = 'schedule-card';
      card.innerHTML = `
        <div class="card-date">${formatZhDate(g.date)}</div>
        <div class="card-line">⏰ ${formatTimeOnly(g.time)}</div>
        <div class="card-line">📍 ${g.field || ''}</div>
        <div class="card-line">${roleLines}</div>
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
 * 查看完整班表（終於不是廢的）
 * ========================= */
function setupViewFullSchedule(session) {
  const link = document.getElementById('view-full-schedule');
  if (!link) return;

  const roles = (session.role || '').split(',').map(r => r.trim());

  link.onclick = () => {
    const hasJudge = roles.some(r => ['judge','chief_judge','admin'].includes(r));
    const hasRecord = roles.some(r => ['record','record_chief','admin'].includes(r));

    if (hasJudge && hasRecord) {
      // ✅ 雙重身份，跳選擇
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
  return isNaN(d) ? String(t) : `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function formatZhDate(dateStr) {
  const d = new Date(dateStr.replace(/\//g,'-'));
  const w = ['日','一','二','三','四','五','六'];
  return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}（${w[d.getDay()]}）`;
}
