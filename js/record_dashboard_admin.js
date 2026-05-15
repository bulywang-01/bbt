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

  const modal = document.getElementById('recordModal');
  const list = document.getElementById('recordList');

  list.innerHTML = `
    <div class="empty">⏳ 載入紀錄名單中...</div>
  `;

  modal.classList.remove('hidden');

callApi({
  action: 'getRecordCandidates',
  game_id: gameId,
  record_role: role
}, res => {

  list.innerHTML = '';

  if (!res || res.result !== 'ok' || !Array.isArray(res.records)) {
    list.innerHTML = `<div class="empty">目前無可指派紀錄員</div>`;
    return;
  }

  /* ✅ 姓名排序（中文排序） */
  const sorted = res.records.sort((a, b) => {
    return a.name.localeCompare(b.name, 'zh-Hant');
  });

  /* ✅ 建立卡片 */
  sorted.forEach(r => {
    const div = document.createElement('div');
    div.className = 'record-card';
    div.textContent = r.name;

    div.onclick = () => assignRecord(r.user_id);

    list.appendChild(div);
  });

  if (!list.children.length) {
    list.innerHTML = `<div class="empty">目前無可指派紀錄員</div>`;
  }
});
}


function closeRecordModal() {
  document.getElementById('recordModal').classList.add('hidden');
}

function assignRecord(userId) {
  const modal = document.getElementById('recordModal');
  const loading = document.getElementById('recordLoading');

  // ✅ UX：立即回饋
  showAssignMessage('⏳ 指派中，請稍候…');

  modal.style.pointerEvents = 'none';
  if (loading) loading.style.display = 'block';

  callApi({
    action: 'assignRecord_admin',
    game_id: currentGameId,
    record_role: currentRole,
    user_id: userId,
    assigned_by: adminSession.user_id
  
  }, res => {
  
    modal.style.pointerEvents = 'auto';
    if (loading) loading.style.display = 'none';
  
    /* ❌ 明確錯誤（這一段保留） */
    if (!res || res.result !== 'ok') {
      showAssignMessage(
        `❌ ${res?.message || '指派失敗（系統回應異常）'}`
      );
      return;
    }
  
    /* ✅ 只有 ok 才成功 */
    showAssignMessage('✅ 指派完成');
    closeRecordModal();
    loadAdminGames();
  });
}

// 排序用，依姓名筆劃
function getStrokeCount(char) {
  const map = {
    '一':1,'乙':1,'二':2,'十':2,'丁':2,
    '三':3,'上':3,'下':3,'小':3,
    '王':4,'天':4,'木':4,'水':4,
    '林':8,'張':11,'陳':16,'黃':12
  };

  // 👉 若沒有定義 → fallback 用字碼順序（不會壞）
  return map[char] || char.charCodeAt(0);
}

function showAssignMessage(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;

  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.background = '#333';
  toast.style.color = '#fff';
  toast.style.padding = '10px 16px';
  toast.style.borderRadius = '6px';
  toast.style.zIndex = '9999';
  toast.style.fontSize = '14px';

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2000);
}
