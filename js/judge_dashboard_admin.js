// ===============================
// 裁判長排班頁（最終可用版）
// ===============================

let allGames = [];

// ===============================
// 共用 UI 工具
// ===============================
function showLoading(msg = '載入排班資料中...') {
  const overlay = document.getElementById('overlay');
  document.getElementById('overlay-text').textContent = msg;
  document.getElementById('overlay-ok').style.display = 'none';
  overlay.classList.add('show');
}

function hideOverlay() {
  document.getElementById('overlay').classList.remove('show');
}

function showMessage(msg) {
  const overlay = document.getElementById('overlay');
  document.getElementById('overlay-text').textContent = msg;
  document.getElementById('overlay-ok').style.display = 'none';
  overlay.onclick = () => hideOverlay();
  overlay.classList.add('show');
}

// ===============================
// 日期 / 時間格式化（重點）
// ===============================
function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return (
    d.getFullYear() + '/' +
    String(d.getMonth() + 1).padStart(2, '0') + '/' +
    String(d.getDate()).padStart(2, '0')
  );
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const d = new Date(timeStr);
  if (isNaN(d)) return '';
  return (
    String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0')
  );
}

// ===============================
// 初始化
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  const session = JSON.parse(localStorage.getItem('session_user') || '{}');

  if (session.role !== 'chief_judge') {
    alert('您沒有裁判長權限');
    location.replace('index.html');
    return;
  }

  loadGames();
});

// ===============================
// 載入排班資料（JSONP）
// ===============================
function loadGames() {
  const session = JSON.parse(localStorage.getItem('session_user') || {});
  showLoading();

  callApi(
    { action: 'getGamesWithAssignments_admin', user_id: session.user_id },
    res => {
      hideOverlay();

      if (!res || res.result !== 'ok') {
        showMessage(res?.message || '載入排班資料失敗');
        return;
      }

      allGames = res.games || [];
      render();
      renderMobile();
    }
  );
}

// ===============================
// 桌機版 render
// ===============================
function render() {
  const box = document.getElementById('content');
  box.innerHTML = '';

  if (!allGames.length) {
    box.innerHTML = '<div class="panel">目前沒有賽事</div>';
    return;
  }

  allGames.forEach(g => {
    const panel = document.createElement('div');
    panel.className = 'panel';

    panel.innerHTML = `
      <div style="font-weight:800;margin-bottom:6px;">
        ${formatDate(g.date)} ${formatTime(g.time_range)}
        ｜ ${g.away_team} vs ${g.home_team}
      </div>

      <table>
        <thead>
          <tr>
            <th>主審</th>
            <th>一壘</th>
            <th>二壘</th>
            <th>三壘</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            ${['PU','U1','U2','U3'].map(role => `
              <td>${renderPosForChief(g, role)}</td>
            `).join('')}
          </tr>
        </tbody>
      </table>
    `;

    box.appendChild(panel);
  });
}

// ===============================
// 站位顯示（指派 / 顯示姓名＋更換）
// ===============================
function renderPosForChief(game, role) {
  const pos = game.positions[role];

  // ✅ 已指派
  if (pos.assigned) {
    return `
      <div class="judge-name">
        ${pos.assigned.name}
        <span class="cancel-btn"
          onclick="openAssignJudge('${game.game_id}','${role}')">
          更換
        </span>
      </div>
    `;
  }

  // ✅ 尚未指派
  return `
    <button class="pos-choice"
      onclick="openAssignJudge('${game.game_id}','${role}')">
      指派
    </button>
  `;
}

// ===============================
// 指派裁判 → 寫後端 → reload
// ===============================
function openAssignJudge(gameId, role) {
  const game = allGames.find(g => g.game_id === gameId);
  if (!game) {
    showMessage('找不到賽事資料');
    return;
  }

  const usedJudges = Object.values(game.positions)
    .filter(p => p.assigned)
    .map(p => p.assigned.judge_id);

  openSelectJudge((judgeId, judgeName) => {

    if (usedJudges.includes(judgeId)) {
      showMessage('⚠️ 該裁判已在本場其他站位');
      return;
    }

    const session = JSON.parse(localStorage.getItem('session_user') || {});

    callApi(
      {
        action: 'assignJudgeToPosition_admin',
        game_id: gameId,
        role: role,
        judge_id: judgeId,
        assigned_by: session.user_id
      },
      res => {
        if (res && res.result === 'ok') {
          loadGames();
        } else {
          showMessage(res?.message || '指派失敗');
        }
      }
    );
  });
}

// ===============================
// 手機版 render（同步邏輯）
// ===============================
function renderMobile() {
  const box = document.getElementById('mobileView');
  if (!box) return;
  box.innerHTML = '';

  allGames.forEach(g => {
    const card = document.createElement('div');
    card.className = 'game-card';

    card.innerHTML = `
      <div style="font-weight:700;">
        ${formatDate(g.date)} ${formatTime(g.time_range)}
      </div>
      <div style="margin-bottom:6px;">
        ${g.away_team} vs ${g.home_team}
      </div>

      ${['PU','U1','U2','U3'].map(role => `
        <div style="margin:4px 0;">
          <b>${role}</b>：${renderPosForChief(g, role)}
        </div>
      `).join('')}
    `;

    box.appendChild(card);
  });
}
