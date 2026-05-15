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
        renderStats();
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
        renderStats();
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
  renderStats();
}

/* =========================
 * 主 render
 * ========================= */
function renderSchedule() {
  const box = document.getElementById('my-schedule-list'); // ✅ 改這裡
  if (!box) return;

  box.innerHTML = '';

  const merged = mergeMySchedules(judgeGames, recordGames);

  const today = new Date();
  today.setHours(0,0,0,0);

  const filtered = merged.filter(g => {
    const d = new Date(g.date.replace(/\//g, '-'));
    d.setHours(0,0,0,0);
    return d >= today;
  });

  if (!filtered.length) {
    box.innerHTML = `<div class="empty">目前沒有未來班表</div>`;
    return;
  }

  renderMergedCards(filtered);

  // ✅ ✅ ✅ 只在這裡呼叫
  checkThisWeekNotice(filtered);
}

// 個人生涯數據資料
function computeStats(judgeGames, recordGames) {

  const now = new Date();
  const currentYear = now.getFullYear();

  let careerTotal = 0;
  let yearTotal = 0;
  let recordTotal = 0;

  let judgeYear = 0;
  let recordYear = 0;

  // ✅ 裁判
  judgeGames.forEach(g => {
    if (!g.role) return;

    careerTotal++;

    const d = new Date(g.date.replace(/\//g,'-'));
    if (d.getFullYear() === currentYear) {
      yearTotal++;
      judgeYear++;
    }
  });

  // ✅ 紀錄
  recordGames.forEach(g => {
    if (!g.record_role) return;

    careerTotal++;
    recordTotal++;

    const d = new Date(g.date.replace(/\//g,'-'));
    if (d.getFullYear() === currentYear) {
      yearTotal++;
      recordYear++;
    }
  });

  return {
    careerTotal,
    yearTotal,
    recordTotal,
    judgeYear,
    recordYear
  };
}

function renderStats() {
  const now = new Date();
  const year = now.getFullYear();

  let judgeYear = 0;
  let judgeAll = 0;

  let recordYear = 0;
  let recordAll = 0;

  // ✅ 裁判
  judgeGames.forEach(g => {
    if (!g.role) return;

    judgeAll++;

    const d = new Date(g.date.replace(/\//g,'-'));
    if (d.getFullYear() === year) judgeYear++;
  });

  // ✅ 紀錄
  recordGames.forEach(g => {
    if (!g.record_role) return;

    recordAll++;

    const d = new Date(g.date.replace(/\//g,'-'));
    if (d.getFullYear() === year) recordYear++;
  });

  // ✅ 裁判卡
  document.getElementById('stat-judge').textContent =
    `${judgeYear}`;   // ✅ 主數字 = 今年

  document.getElementById('stat-judge-sub').textContent =
    `生涯 ${judgeAll} 場`;

  // ✅ 紀錄卡
  document.getElementById('stat-record').textContent =
    `${recordYear}`;

  document.getElementById('stat-record-sub').textContent =
    `生涯 ${recordAll} 場`;

  // ✅ 總計
  const totalYear = judgeYear + recordYear;
  const totalAll = judgeAll + recordAll;

  document.getElementById('stat-total').textContent =
    `${totalYear}`;

  document.getElementById('stat-total-sub').textContent =
    `生涯 ${totalAll} 場`;
}


// 點卡片功能（未來,目前暫放）
function openStatDetail(type) {
  if (type === 'career') {
    alert('可打開生涯統計頁(尚未開放)');
  }
  if (type === 'year') {
    alert('可顯示年度詳細紀錄(尚未開放)');
  }
  if (type === 'record') {
    alert('紀錄詳細數據(尚未開放)');
  }
}

// 本週提醒判斷
function checkThisWeekNotice(list) {
  const tip = document.getElementById('schedule-tip');
  if (!tip) return;

  const today = new Date();
  today.setHours(0,0,0,0);

  const day = today.getDay() || 7;

  const start = new Date(today);
  start.setDate(today.getDate() - day + 1);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const hasThisWeek = list.some(g => {
    const d = new Date(g.date.replace(/\//g,'-'));
    return d >= start && d <= end;
  });

  tip.style.display = hasThisWeek ? 'block' : 'none';
  
  if (hasThisWeek) {
    tip.classList.add('show');   // ✅ 開啟動畫
  } else {
    tip.classList.remove('show');
  }
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

  // ✅ 裁判
  judgeGames.forEach(g => {
    if (!g.role) return;
    ensure(g).roles.push(g.role);
  });

  // ✅ 紀錄
  recordGames.forEach(g => {
    if (!g.record_role) return;
    ensure(g).roles.push(g.record_role);
  });

  return Object.values(map);
}


/* =========================
 * 合併卡片 render（橫式）
 * ========================= */
function renderMergedCards(games) {

  const box = document.getElementById('my-schedule-list'); // ✅ 這行最重要
  if (!box) return;
  
  box.innerHTML = '';

  
  const sorted = games.sort((a,b) => 
    new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time)
  );
  
  sorted.forEach(g => {
  
    const judgeMap = { PU:'主審', U1:'一壘審', U2:'二壘審', U3:'三壘審' };
    const recordMap = {
      REC_MAIN:'紀錄員',
      REC_TRAINEE:'見習紀錄',
      REC_VIDEO:'影像紀錄'
    };
  
    const roles = g.roles.map(r => {
      const isJudge = r.startsWith('U') || r === 'PU';
      const name = isJudge ? judgeMap[r] : recordMap[r];
  
      return `
        <div class="schedule-role ${isJudge ? 'judge' : 'record'}">
          ${isJudge ? '🧑‍⚖️' : '📝'} ${name}
        </div>
      `;
    }).join('');
  
    const card = document.createElement('div');
    card.className = 'schedule-card';
  
    card.innerHTML = `
      <div class="schedule-top-row">
        <div class="schedule-date-text">
          ${formatZhDate(g.date)}
        </div>
        <div class="schedule-role-group">
          ${roles}
        </div>
      </div>
  
      <div class="schedule-info-row">
        <div>⏰ ${formatTimeOnly(g.time)}</div>
        <div>📍 ${g.field}</div>
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

/* =========================
 * ✅ 本週班表（完整版修正版）
 * ========================= */

function openWeeklySchedule() {
  const modal = document.getElementById('weeklyModal');
  const content = document.getElementById('weeklyContent');
  
  document.getElementById('weekly-overlay').style.display = 'flex';

  content.innerHTML = '⏳ 載入中...';

  callApi({
    action: 'getWeeklySchedule'
  }, res => {

    if (!res || res.result !== 'ok') {
      content.innerHTML = '❌ 載入失敗';
      return;
    }

    renderWeeklySchedule(res.games || []);
  });
}

function closeWeeklyModal() {
  document.getElementById('weeklyModal').style.display = 'none';
}


/* =========================
 * ✅ Render 主畫面
 * ========================= */
function renderWeeklySchedule(games) {

  const root = document.getElementById('weeklyContent');
  root.innerHTML = '';

  if (!games.length) {
    root.innerHTML = '<div class="empty">本週沒有賽事</div>';
    return;
  }

  games.forEach(g => {

    const judges = g.judges || {};
    const records = g.records || {};

    const div = document.createElement('div');
    div.className = 'weekly-card';

    div.innerHTML = `
    
      <div class="game-meta">
        第${g.game_no || '-'}場｜${g.group || ''}
      </div>
    
      <div class="game-title">
        ${g.date} ${formatTimeOnly(g.time)}｜${g.away} vs ${g.home}
      </div>
    
      <div class="game-sub">
        📍 ${g.field || ''}
      </div>
    
      <div class="section">
        <div class="label">🧑‍⚖️ 裁判</div>
        <div class="grid">
          ${renderUmpireSlots(g, judges)}
        </div>
      </div>
    
      <div class="section">
        <div class="label">📝 紀錄</div>
        <div class="grid">
          ${renderRecordSlots(records)}
        </div>
      </div>
    `;

    root.appendChild(div);
  });
}


/* =========================
 * ✅ 裁判 slots（你規則完整版）
 * ========================= */
function renderUmpireSlots(g, judges) {

  const count = Number(g.umpire_count);
  const slots = [];

  if (count === 0) {
    return `<div class="empty">不用裁判</div>`;
  }

  if (count >= 1) slots.push(['PU', '主審']);
  if (count >= 2) slots.push(['U1', '一壘審']);
  if (count >= 4) slots.push(['U2', '二壘審']);
  if (count >= 3) slots.push(['U3', '三壘審']);

  return slots.map(([key, label]) => {
    const name = judges[key] || '';
    return `
      <div class="slot">
        <div class="role">${label}</div>
        <div class="name">${name}</div>
      </div>
    `;
  }).join('');
}


/* =========================
 * ✅ 紀錄 slots（固定3格）
 * ========================= */
function renderRecordSlots(records) {

  const roles = [
    ['REC_MAIN', '記錄員'],
    ['REC_TRAINEE', '見習'],
    ['REC_VIDEO', '影像']
  ];

  return roles.map(([key, label]) => {
    const name = records[key] || '';
    return `
      <div class="slot">
        <div class="role">${label}</div>
        <div class="name">${name}</div>
      </div>
    `;
  }).join('');
}
