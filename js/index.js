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

  let judgeDone = 0, judgePending = 0, judgeCareer = 0;
  let recordDone = 0, recordPending = 0, recordCareer = 0;

  function parse(g){
    return new Date(g.date.replace(/\//g,'-'));
  }

  /* ✅ 裁判 */
  judgeGames.forEach(g => {

    if (!g.role) return;

    const d = parse(g);

    if (d < now) {
      judgeCareer++;

      if (d.getFullYear() === year) {
        judgeDone++;
      }
    } else {
      judgePending++;
    }

  });

  /* ✅ 紀錄 */
  recordGames.forEach(g => {

    if (!g.record_role) return;

    const d = parse(g);

    if (d < now) {
      recordCareer++;

      if (d.getFullYear() === year) {
        recordDone++;
      }
    } else {
      recordPending++;
    }

  });

  /* ✅ 總計 */
  const totalDone = judgeDone + recordDone;
  const totalPending = judgePending + recordPending;
  const totalCareer = judgeCareer + recordCareer;

  /* ✅ 👉 UI（橫排＋簡潔版） */

  document.getElementById('stat-judge').innerHTML = `
    <div class="stat-main">${judgeDone}</div>
    <div class="stat-line">
      <span>生涯 ${judgeCareer}</span>
      <span class="pending">預計 ${judgePending}</span>
    </div>
  `;

  document.getElementById('stat-record').innerHTML = `
    <div class="stat-main">${recordDone}</div>
    <div class="stat-line">
      <span>生涯 ${recordCareer}</span>
      <span class="pending">預計 ${recordPending}</span>
    </div>
  `;

  document.getElementById('stat-total').innerHTML = `
    <div class="stat-main">${totalDone}</div>
    <div class="stat-line">
      <span>生涯 ${totalCareer}</span>
      <span class="pending">預計 ${totalPending}</span>
    </div>
  `;
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

        // ✅ ✅ ✅ 補齊這些（關鍵）
        game_code: g.game_code,
        group: g.group,
        away: g.away,
        home: g.home,

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

    const obj = ensure(g);

    obj.roles.push(g.role);
  });

  // ✅ 紀錄
  recordGames.forEach(g => {
    if (!g.record_role) return;

    const obj = ensure(g);

    obj.roles.push(g.record_role);
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
    
      <!-- ✅ 第一列 -->
      <div class="schedule-line-1">
        ${formatZhDate(g.date)}　
        ${g.game_code} - ${g.group}　
        📍 ${g.field}
      </div>
    
      <!-- ✅ 第二列 -->
      <div class="schedule-line-2">
        ${formatTimeOnly(g.time)}　
        ${g.away} vs ${g.home}
      </div>
    
      <!-- ✅ 保留角色 -->
      <div class="schedule-role-group">
        ${roles}
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
/* 直式的格式
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
    const groupClass = getGroupClass(g.group);
    
    div.innerHTML = `
    
      <div class="game-meta-row">
        <div class="game-code">
          ${g.game_code || '-'}
        </div>
    
        <div class="game-group ${groupClass}">
          ${g.group || ''}
        </div>
      </div>
    
      <div class="match-title">
        ${g.away} vs ${g.home}
      </div>
    
      <div class="game-datetime">
        ${formatZhDate(g.date)} ${formatTimeOnly(g.time)}
      </div>
    
      <div class="game-field">
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
　*/

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
    const groupClass = getGroupClass(g.group);
    
    div.innerHTML = `
    
      <!-- ✅ 兩列資訊 -->
      <div class="game-line-1">
        <span class="date">${formatZhDate(g.date)}</span>　<span class="code">${g.game_code}</span> - <span class="group">${g.group}</span>　📍 ${g.field}
      </div>
    
      <div class="game-line-2">
        ${formatTimeOnly(g.time)}　${g.away} <span>vs</span> ${g.home}
      </div>

      <!-- ✅ 裁判+紀錄 -->
      <div class="section"><div class=" ${renderAllRolesRow(g, judges, records)}</div>
   
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

  if (count >= 1) slots.push(['PU','主審']);
  if (count >= 2) slots.push(['U1','一壘審']);
  if (count >= 4) slots.push(['U2','二壘審']);
  if (count >= 3) slots.push(['U3','三壘審']);

  return `
    <div class="grid">
      ${slots.map(([key, label]) => {

        const name = judges[key] || '';

        return `
          <div class="slot">
            <div class="role">${label}</div>
            <div class="name">${name}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
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

  return `
    <div class="grid">
      ${roles.map(([key, label]) => {

        const name = records[key] || '';

        return `
          <div class="slot">
            <div class="role">${label}</div>
            <div class="name">${name}</div>
          </div>
        `;

      }).join('')}
    </div>
  `;
}


    function getGroupClass(group) {
  
    if (!group) return '';
  
    if (group.includes('大')) return 'group-major';
    if (group.includes('小')) return 'group-minor';
  
    return '';
  }

// 裁判和紀錄合併成一列
function renderAllRolesRow(g, judges, records){

  const count = Number(g.umpire_count);

  const judgeRoles = [];
  if (count >= 1) judgeRoles.push(['PU','主審']);
  if (count >= 2) judgeRoles.push(['U1','一壘']);
  if (count >= 4) judgeRoles.push(['U2','二壘']);
  if (count >= 3) judgeRoles.push(['U3','三壘']);

  const recordRoles = [
    ['REC_MAIN','記錄'],
    ['REC_TRAINEE','見習'],
    ['REC_VIDEO','影像']
  ];

  /* ✅ ✅ ✅ 核心：把 signup 陣列轉為 map */
  const signupMap = {};
  (g.judge_signup || []).forEach(s => {
    signupMap[s.preferred_position] = s.name;
  });

  const recordSignupMap = {};
  (g.record_signup || []).forEach(s => {
    recordSignupMap[s.record_role] = s.name;
  });

  /* ✅ 判斷函式 */
  function getJudge(k){
    return judges[k] || signupMap[k] || '—';
  }

  function getRecord(k){
    return records[k] || recordSignupMap[k] || '—';
  }

  const header = [
    ...judgeRoles,
    ...recordRoles
  ].map(([k,label]) =>
    `<div class="col role">${label}</div>`
  ).join('');

  const values = [
    ...judgeRoles.map(([k]) => getJudge(k)),
    ...recordRoles.map(([k]) => getRecord(k))
  ].map(v => `<div class="col name">${v}</div>`).join('');

  return `
    <div class="row-all">
      <div class="row-inner">   <!-- ✅ 新增這層 -->
        <div class="row-line header">
          ${header}
        </div>
        <div class="row-line values">
          ${values}
        </div>
      </div>
    </div>
  `;
}
