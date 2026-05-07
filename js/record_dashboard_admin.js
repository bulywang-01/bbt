let adminSession = {};
let currentGameId = '';
let currentRole = '';

document.addEventListener('DOMContentLoaded', () => {
  adminSession = JSON.parse(localStorage.getItem('session_user') || '{}');
  loadAdminGames();
});

function loadAdminGames() {
  callApi({
    action:'getRecordGamesWithAssignments_admin'
  }, res=>{
    if (!res || res.result!=='ok') return alert('載入失敗');
    renderAdminGames(res.games);
  });
}

function renderAdminGames(games) {
  const root = document.getElementById('content');
  root.innerHTML = '';

  games.forEach(g=>{
    const panel = document.createElement('div');
    panel.className='panel';
    panel.innerHTML = `
      <div class="game-header">
        ${g.date} ${g.time}｜${g.category}<br>
        ${g.away_team} vs ${g.home_team}（${g.field}）
      </div>
      <div class="pos-grid">
        ${renderPos(g,'REC_MAIN','記錄員')}
        ${renderPos(g,'REC_TRAINEE','見習記錄員')}
        ${renderPos(g,'REC_VIDEO','影像記錄員')}
      </div>
    `;
    root.appendChild(panel);
  });
}

function renderPos(g, role, label) {
  const assign = g.record_assignments?.[role];
  const signups = g.record_signups?.[role] || [];

  if (assign) {
    return `
      <div class="pos-cell assigned">
        <div class="role">${label}</div>
        <div class="name">${assign.name}</div>
        <button class="btn-change"
          onclick="openRecordModal('${g.game_id}','${role}')">
          變更
        </button>
      </div>
    `;
  }

  return `
    <div class="pos-cell">
      <div class="role">${label}</div>
      <button class="btn-assign"
        onclick="openRecordModal('${g.game_id}','${role}')">
        指派
      </button>
      <div class="signup-list">
        ${signups.length ? '報名：'+signups.map(s=>s.name).join('、') : ''}
      </div>
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
  callApi({
    action:'assignRecord_admin',
    game_id: currentGameId,
    record_role: currentRole,
    user_id: userId,
    assigned_by: adminSession.user_id
  }, res=>{
    if (res.result==='ok') {
      closeRecordModal();
      loadAdminGames();
    } else alert(res.message);
  });
}
