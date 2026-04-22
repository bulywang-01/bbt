// ===============================
// 裁判長排班頁（可跑 MVP 版）
// ===============================

// ✅ 全域狀態（只宣告一次）
let allGames = [];

// ===============================
// 共用 UI 工具（最小版）
// ===============================
function showLoading(msg = '處理中...') {
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
// 載入賽事（吃合併後端）
// ===============================
function loadGames() {
  const session = JSON.parse(localStorage.getItem('session_user') || {});
  showLoading('載入排班資料中...');

  callApi(
    { action: 'getGamesWithAssignments', user_id: session.user_id },
    res => {
      hideOverlay();

      if (!res || res.result !== 'ok') {
        showMessage(res?.message || '載入失敗');
        return;
      }

      allGames = res.games || [];
      render();
      renderMobile();
    }
  );
}

// ===============================
// 桌機 render（裁判長）
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
      <div style="font-weight:700;margin-bottom:6px;">
        ${g.date}｜${g.away_team} vs ${g.home_team}
      </div>
      <table>
        <tr>
          <th>主審</th>
          <th>一壘</th>
          <th>二壘</th>
          <th>三壘</th>
        </tr>
        <tr>
          ${['PU','U1','U2','U3'].map(r => `
            <td>${renderPosForChief(g, r)}</td>
          `).join('')}
        </tr>
      </table>
    `;

    box.appendChild(panel);
  });
}

// ===============================
// 裁判長站位 render
// ===============================
function renderPosForChief(g, role) {
  const pos = g.positions[role];

  if (pos.assigned) {
    return `
      <div class="judge-name">
        ${pos.assigned.name}
        <span class="cancel-btn"
          onclick="openAssignJudge('${g.game_id}','${role}')">
          更換
        </span>
      </div>
    `;
  }

  return `
    <button class="pos-choice"
      onclick="openAssignJudge('${g.game_id}','${role}')">
      指派
    </button>
  `;
}

// ===============================
// 指派裁判 → 寫後端
// ===============================
function openAssignJudge(gameId, role) {
  const game = allGames.find(g => g.game_id === gameId);
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
        action: 'assignJudgeToPosition',
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
// 手機版（簡化）
// ===============================
function renderMobile() {
  const box = document.getElementById('mobileView');
  if (!box) return;
  box.innerHTML = '';

  allGames.forEach(g => {
    const card = document.createElement('div');
    card.className = 'game-card';

    card.innerHTML = `
      <div><b>${g.date}</b></div>
      ${['PU','U1','U2','U3'].map(r => `
        <div>${r}：${renderPosForChief(g, r)}</div>
      `).join('')}
    `;

    box.appendChild(card);
  });
}

// ===============================
// ✅ JSONP callback（for config.js）
// ===============================
window.handleApiResponse = function (res) {
  if (typeof window.__apiCallback === 'function') {
    window.__apiCallback(res);
    window.__apiCallback = null;
  }
};
