// ===============================
// 找全部的裁判
// ===============================
let allJudges = [];   // ✅ 全部裁判

function countJudgeAssignedOnDate(judgeId, date) {
  return allGames.filter(g =>
    g.date === date &&
    Object.values(g.positions).some(
      p => p.assigned && String(p.assigned.judge_id) === String(judgeId)
    )
  ).length;
}

// ===============================
// 裁判長排班頁（修正完成版）
// ===============================

let allGames = [];

/* ===== 訊息 ===== */
function showMessage(msg) {
  document.getElementById('overlay-text').textContent = msg;
  document.getElementById('overlay').style.display = 'flex';
}

function hideMessage() {
  document.getElementById('overlay').style.display = 'none';
}
 
/* ===== 格式化 ===== */
function formatDate(d) {
  if (!d) return '';
  // 處理 ISO 或 Date 物件
  const dateObj = new Date(d);
  if (isNaN(dateObj)) return String(d);
  return (
    dateObj.getFullYear() + '/' +
    String(dateObj.getMonth() + 1).padStart(2, '0') + '/' +
    String(dateObj.getDate()).padStart(2, '0')
  );
}

// Google Sheets time → HH:mm
function formatSheetTime(t) {
  if (!t) return '';
  const d = new Date(t);
  if (isNaN(d)) return '';
  return (
    String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0')
  );
}

/* ===== 載入排班資料 ===== */
function loadGames() {
  callApi(
    { action: 'getGamesWithAssignments_admin' },
    res => {
      if (!res || res.result !== 'ok') {
        showMessage('載入失敗');
        return;
      }
      allGames = res.games || [];
      allJudges = res.judges || [];   // ✅ 關鍵這一行
      render();
    }
  );
}

/* ===== 桌機 render ===== */
function render() {
  const box = document.getElementById('content');
  box.innerHTML = '';

  allGames.forEach(game => {
    const panel = document.createElement('div');
    panel.className = 'panel';

    panel.innerHTML = `
      <div class="game-header">
        ${formatDate(game.date)} ${formatSheetTime(game.time)}
        ｜ ${game.away_team} vs ${game.home_team}
      </div>

      <div class="pos-grid">
        ${['PU','U1','U2','U3'].map(role => renderPosCell(game, role)).join('')}
      </div>
    `;

    box.appendChild(panel);
  });
}

function renderPosCell(game, role) {
  const pos = game.positions[role];

  if (pos.assigned) {
    return `
      <div class="pos-cell assigned">
        <div class="role">${role}</div>
        <div class="judge">${pos.assigned.name}</div>
        <button class="btn-change"
          onclick="openAssignJudge('${game.game_id}','${role}')">
          更換
        </button>
      </div>
    `;
  }

  const preferred = (pos.preferred || []).map(j => j.name || j).join('、');

  return `
    <div class="pos-cell">
      <div class="role">${role}</div>
      <div class="judge">—</div>
      <div class="judge preferred">${preferred ? '報名：' + preferred : ''}</div>
      <button class="btn-assign"
        onclick="openAssignJudge('${game.game_id}','${role}')">
        指派
      </button>
    </div>
  `;
}

/* ===== 站位 ===== */
function renderPos(game, role) {
  const pos = game.positions[role];

  if (pos.assigned) {
    return `
      <div class="assign-row assigned">
        <span class="role-label">${role}</span>
        <span class="judge-name">${pos.assigned.name}</span>
        <button class="btn btn-change"
          onclick="openAssignJudge('${game.game_id}','${role}')">更換</button>
        <button class="btn btn-cancel"
          onclick="unassignJudge('${game.game_id}','${role}')">取消</button>
      </div>
    `;
  }

  return `
    <div class="assign-row">
      <span class="role-label">${role}</span>
      <span class="empty">—</span>
      <button class="btn btn-assign"
        onclick="openAssignJudge('${game.game_id}','${role}')">指派</button>
    </div>
  `;
}

/* ===== ✅ 修正完成的指派功能（重點） ===== */
/* ===== ✅ 修正完成的指派功能（正確版） ===== */
function openAssignJudge(gameId, role) {
  const currentGame = allGames.find(
    g => String(g.game_id) === String(gameId)
  );
  if (!currentGame) {
    showMessage('找不到賽事資料');
    return;
  }

  openSelectJudge(currentGame, role, (judgeId, judgeName) => {

    // ✅ 同時段衝突檢查（跨場）
    const clash = allGames.find(g =>
      g.date === currentGame.date &&
      g.time === currentGame.time &&
      Object.values(g.positions).some(
        p => p.assigned && String(p.assigned.judge_id) === String(judgeId)
      )
    );

    if (clash) {
      showMessage(`⚠️ ${judgeName} 同時間已有其他場次`);
      return;
    }

    // ✅ 直接寫入
    callApi(
      {
        action: 'assignJudgeToPosition_admin',
        game_id: currentGame.game_id,
        role,
        judge_id: judgeId
      },
      () => loadGames()
    );
  });
}

/* ===== 取消指派 ===== */
function unassignJudge(gameId, role) {
  if (!confirm('確定取消這個站位？')) return;

  callApi(
    {
      action: 'unassignJudge_admin',
      game_id: gameId,
      role: role
    },
    () => loadGames()
  );
}

/**
 * 裁判選擇器（暫行版）
 * 後續可以換成 modal / 下拉 / 搜尋式 UI
 */
let _judgeSelectCallback = null;

function openSelectJudge(game, role, callback) {
  _judgeSelectCallback = callback;

  const modal = document.getElementById('judgeModal');
  const list = document.getElementById('judgeList');
  const title = document.getElementById('judgeModalTitle');

  title.textContent = `選擇裁判（${role}）`;
  list.innerHTML = '';

  // ✅ 本場已指派的裁判（禁止再選）
  const assignedInGame = new Set();
  Object.values(game.positions).forEach(p => {
    if (p.assigned) assignedInGame.add(String(p.assigned.judge_id));
  });

  // ✅ 全部裁判清單
  const availableJudges = allJudges.filter(j =>
    !assignedInGame.has(String(j.judge_id))
  );

  if (availableJudges.length === 0) {
    list.innerHTML = '<div>已無可指派裁判</div>';
    modal.classList.remove('hidden');
    return;
  }

  availableJudges.forEach(j => {
    const count = countJudgeAssignedOnDate(j.judge_id, game.date);

    const div = document.createElement('div');
    div.className = 'judge-card';
    div.innerHTML = `
      <div>${j.name}</div>
      <div style="font-size:12px;color:#666;">
        ${count > 0 ? `今日已排 ${count} 場` : '今日未排班'}
      </div>
    `;
    div.onclick = () => {
      if (typeof _judgeSelectCallback === 'function') {
        _judgeSelectCallback(j.judge_id, j.name);
      }
      closeJudgeModal();
    };
    list.appendChild(div);
  });

  modal.classList.remove('hidden');
}

function closeJudgeModal() {
  document.getElementById('judgeModal').classList.add('hidden');
  _judgeSelectCallback = null;
}

/* ===== 啟動 ===== */
loadGames();

