// ===============================
// 裁判長排班頁（修正完成版）
// ===============================

let allGames = [];

/* ===== 訊息 ===== */
function showMessage(msg) {
  alert(msg);
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

  // 已指派
  if (pos.assigned) {
    return `
      <div class="pos-cell assigned">
        <div class="role">${role}</div>
        <div class="judge">${pos.assigned.name}</div>
        <button class="btn btn-change"
          onclick="openAssignJudge('${game.game_id}','${role}')">
          更換
        </button>
      </div>
    `;
  }

  // 未指派
  return `
    <div class="pos-cell">
      <div class="role">${role}</div>
      <div class="judge empty">—</div>
      <button class="btn btn-assign"
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

  openSelectJudge((judgeId, judgeName) => {

    // ✅ 同時段裁判衝突檢查
    const clashGame = allGames.find(g => {
      if (String(g.date) !== String(currentGame.date)) return false;
      if (String(g.time) !== String(currentGame.time)) return false;

      return Object.values(g.positions).some(
        p => p.assigned &&
             String(p.assigned.judge_id) === String(judgeId)
      );
    });

    if (clashGame) {
      showMessage(
        `⚠️ 裁判「${judgeName}」已於 ` +
        `${formatDate(clashGame.date)} ${formatSheetTime(clashGame.time)} ` +
        `排班「${clashGame.away_team} vs ${clashGame.home_team}」`
      );
      return;
    }

    // ✅ 沒衝突才真的送指派
    callApi(
      {
        action: 'assignJudgeToPosition_admin',
        game_id: currentGame.game_id,
        role: role,
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
function openSelectJudge(callback, game, role) {
  // ✅ 可選裁判來自「該場所有報名者（不分站位）」
  const judgeMap = {};

  Object.values(game.positions).forEach(p => {
    (p.preferred || []).forEach(name => {
      judgeMap[name] = true;
    });
  });

  const names = Object.keys(judgeMap);
  if (names.length === 0) {
    showMessage('此場尚無任何裁判報名');
    return;
  }

  const pick = prompt(
    '請輸入裁判編號：\n' +
    names.map((n, i) => `${i + 1}. ${n}`).join('\n')
  );

  const index = parseInt(pick, 10) - 1;
  if (isNaN(index) || index < 0 || index >= names.length) {
    showMessage('已取消指派');
    return;
  }

  const judgeName = names[index];
  callback(judgeName, judgeName); // ✅ 目前用 name 當 key
}

/* ===== 啟動 ===== */
loadGames();
