let adminSession = {};
let currentGameId = '';
let currentRole = '';

document.addEventListener('DOMContentLoaded', () => {
  adminSession = JSON.parse(localStorage.getItem('session_user') || '{}');

  if (!adminSession.user_id) {
    alert('尚未登入，請重新登入');
    location.replace('login.html');
    return; // ✅ 關鍵：不要再往下跑
  }

  loadAdminGames(); // ✅ 只在 session OK 時才打 API
});

function loadAdminGames() {
  callApi({
    action:'getRecordGamesWithAssignments_admin'
  }, res=>{
    if (!res || res.result!=='ok') return alert('載入失敗');
    renderAdminGames(res.games);
  });
}

//✅ 前端 grouping（admin.js 新增 / 取代原本 render）
//✅ 1️⃣ 先把 games 分組（日期 → 組別 → 排時間）
function groupAdminGames(games) {
  const map = {};

  games.forEach(g => {
    const d = g.date;        // 已經是 yyyy/MM/dd
    const c = g.category;    // 組別

    if (!map[d]) map[d] = {};
    if (!map[d][c]) map[d][c] = [];

    map[d][c].push(g);
  });

  // ✅ 每個組別裡依時間排序
  Object.values(map).forEach(catMap => {
    Object.values(catMap).forEach(list => {
      list.sort((a, b) => a.time.localeCompare(b.time));
    });
  });

  return map;
}

function renderAdminGames(games) {
  const root = document.getElementById('content');
  root.innerHTML = '';

  const grouped = groupAdminGames(games);

  Object.keys(grouped).sort().forEach(date => {
    const dateBlock = document.createElement('div');
    dateBlock.className = 'panel';
    dateBlock.innerHTML = `<h2>${date}</h2>`;

    const categories = grouped[date];
    Object.keys(categories).forEach(cat => {
      const catBlock = document.createElement('div');
      catBlock.innerHTML = `<h3 style="margin-top:12px;">${cat}</h3>`;

      categories[cat].forEach(g => {
        catBlock.appendChild(buildGameCard(g));
      });

      dateBlock.appendChild(catBlock);
    });

    root.appendChild(dateBlock);
  });
}

function buildGameCard(g) {
  const div = document.createElement('div');
  div.className = 'game-card';

  div.innerHTML = `
    <div class="game-header">
      ${g.time}｜${g.away_team} vs ${g.home_team}（${g.field}）
    </div>
    <div class="pos-grid">
      ${renderPos(g, 'REC_MAIN', '記錄員')}
      ${renderPos(g, 'REC_TRAINEE', '見習記錄員')}
      ${renderPos(g, 'REC_VIDEO', '影像記錄員')}
    </div>
  `;
  return div;
}

function renderPos(g, role, label) {
  const assign = g.record_assignments?.[role];
  const signups = g.record_signups?.[role] || [];

  // ✅ 有指派（最高優先）
  if (assign) {
    return `
      <div class="pos-cell assigned">
        <div class="role">${label}</div>
        <div class="signup-name assigned">${assign.name}</div>
        <button class="btn-change"
          onclick="openRecordModal('${g.game_id}','${role}')">
          變更
        </button>
      </div>
    `;
  }

  // ✅ 尚未指派，但有人報名
  const signupNames = signups.map(s => s.name).join('、');
  return `
    <div class="pos-cell">
      <div class="role">${label}</div>
      ${
        signupNames
          ? `<div class="signup-name signup">${signupNames}</div>`
          : ''
      }
      <button class="btn-assign"
        onclick="openRecordModal('${g.game_id}','${role}')">
        指派
      </button>
    </div>
  `;
}


/* ===== Modal ===== */

function openRecordModal(gameId, role) {
  currentGameId = gameId;
  currentRole = role;
  callApi({ action:'getRecordCandidates', game_id:gameId, record_role:role }, res=>{
    const list = document.getElementById('recordList');
    list.innerHTML='';
    res.records.forEach(r=>{
      const div = document.createElement('div');
      div.className='record-card';
      div.textContent = r.name;
      div.onclick = ()=>assignRecord(r.user_id);
      list.appendChild(div);
    });
  });
  document.getElementById('recordModal').classList.remove('hidden');
}

function closeRecordModal() {
  document.getElementById('recordModal').classList.add('hidden');
}

function assignRecord(userId) {
  showToast('指派中…');

  callApi({
    action: 'assignRecord_admin',   // ✅ 注意這裡是 action 名稱
    game_id: currentGameId,
    record_role: currentRole,
    user_id: userId,
    assigned_by: adminSession.user_id
  }, res => {
    if (res && res.result === 'ok') {
      closeRecordModal();
      showToast('指派完成', 'success');
      loadAdminGames();
    } else {
      showToast(res?.message || '指派失敗', 'error');
    }
  });
}
