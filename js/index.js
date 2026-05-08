/**
 * index.js – 首頁「我的班表」
 *
 * ✅ 設計原則（非常重要）：
 * 1. 裁判 / 紀錄 都是「個人最終結果視角」
 * 2. 同一場比賽：
 *    - 若有指派（Assignment）→ 以指派為準
 *    - 再補報名（Signup）
 * 3. 同一場比賽，裁判 + 紀錄 → 合併成「一張卡片」
 * 4. 週期定義：週一～週日
 */

/* =========================
 * 全域狀態
 * ========================= */
let judgeGames = [];    // 裁判資料（已合併指派＋報名）
let recordGames = [];   // 紀錄資料（已合併指派＋報名）
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

  /* ===== 裁判班表 ===== */
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

  /* ===== 紀錄班表 ===== */
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
 * 週期切換（HTML tab 會呼叫）
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
 * Render 主入口
 * ========================= */
function renderSchedule() {
  console.log('🔥 renderSchedule()', {
    judgeGames: judgeGames.length,
    recordGames: recordGames.length
  });

  const container = document.getElementById('schedule-list');
  const loading = document.getElementById('schedule-loading');
  const noBlock = document.getElementById('no-schedule');

  if (loading) loading.style.display = 'none';
  if (container) container.innerHTML = '';
  if (noBlock) noBlock.style.display = 'none';

  /* ✅ 依你定義的規則，先合併裁判 + 紀錄 */
  const merged = mergeMySchedules(judgeGames, recordGames);

  /* ✅ 再依「本週 / 下週 / 本月」過濾 */
  const { start, end } = getPeriodRange(currentRange);
  const filtered = merged.filter(g => {
    const t = new Date(`${g.date} ${formatTimeOnly(g.time)}`);
    return t >= start && t <= end;
  });

  if (!filtered.length) {
    if (noBlock) {
      noBlock.textContent = '此期間尚無班表';
      noBlock.style.display = 'block';
    }
    return;
  }

  renderMergedScheduleCards('schedule-list', filtered);
}

/* =========================
 * 合併裁判＋紀錄（同一場一張）
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
        roles: []   // [{ type:'judge', role }, { type:'record', role }]
      };
    }
    return map[g.game_id];
  }

  // 裁判
  judgeGames.forEach(g => {
    const game = ensure(g);
    game.roles.push({
      type: 'judge',
      role: g.role || null   // null = 尚未指派
    });
  });

  // 紀錄
  recordGames.forEach(g => {
    const game = ensure(g);
    game.roles.push({
      type: 'record',
      role: g.record_role || null
    });
  });

  return Object.values(map);
}

/* =========================
 * 合併後卡片 render
 * ========================= */
function renderMergedScheduleCards(containerId, games) {
  const box = document.getElementById(containerId);
  if (!box) return;

  games
    .sort((a, b) => {
      if (a.date === b.date) {
        return formatTimeOnly(a.time).localeCompare(formatTimeOnly(b.time));
      }
      return a.date.localeCompare(b.date);
    })
    .forEach(g => {
      const card = document.createElement('div');
      card.className = 'schedule-card';

      const roleLines = g.roles.map(r => {
        if (r.type === 'judge') {
          const JUDGE_ROLE = { PU:'主審', U1:'一壘', U2:'二壘', U3:'三壘' };
          return `🧑‍⚖️ 裁判｜${JUDGE_ROLE[r.role] || '待指派'}`;
        }
        if (r.type === 'record') {
          const RECORD_ROLE = {
            REC_MAIN:'主紀錄',
            REC_TRAINEE:'見習紀錄',
            REC_VIDEO:'影像紀錄'
          };
          return `📝 紀錄｜${RECORD_ROLE[r.role] || '待指派'}`;
        }
      }).join('<br>');

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
 * 週期計算（週一～週日）
 * ========================= */
function getPeriodRange(range) {
  const today = new Date();
  today.setHours(0,0,0,0);

  let start, end;

  if (range === 'week') {
    const day = today.getDay(); // 0=日
    const diffToMon = day === 0 ? -6 : 1 - day;
    start = new Date(today);
    start.setDate(today.getDate() + diffToMon);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  }

  if (range === 'next') {
    const day = today.getDay();
    const diffToNextMon = day === 0 ? 1 : 8 - day;
    start = new Date(today);
    start.setDate(today.getDate() + diffToNextMon);
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
 * Helper：時間顯示（解 1899-12-30）
 * ========================= */
function formatTimeOnly(t) {
  if (!t) return '';
  if (typeof t === 'string' && /^\d{1,2}:\d{2}$/.test(t)) return t;

  const d = new Date(t);
  if (isNaN(d)) return String(t);

  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/* =========================
 * Helper：日期顯示（05/10（日））
 * ========================= */
function formatZhDate(dateStr) {
  const d = new Date(dateStr.replace(/\//g, '-'));
  const w = ['日','一','二','三','四','五','六'];
  return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}（${w[d.getDay()]}）`;
}
