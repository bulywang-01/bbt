// ===============================
// 裁判長排班頁（MVP 版）
// ===============================

// ✅ 全域狀態
let allGames = [];
let assignedByChief = {}; 
// 結構： { game_id: { PU: judgeId, U1: judgeId } }

// ✅ 裁判長模式（直接鎖定）
const isChiefMode = true;

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
// 載入賽事
// ===============================
function loadGames() {
  const session = JSON.parse(localStorage.getItem('session_user') || '{}');

  showLoading('載入賽事資料中...');

  callApi(
    { action: 'getGamesWithAssignments' },
    res => {
      if (!res || res.result !== 'ok') {
        showMessage(res?.message || '載入排班資料失敗');
        return;
      }
  
      allGames = res.games; // ✅ 已合併 signup + assignment
      render();
      renderMobile();
    }
  );
}

// ===============================
// 主畫面 render（桌機）
// ===============================
function render() {
  const box = document.getElementById('content');
  box.innerHTML = '';

  if (!allGames.length) {
    box.innerHTML = '<div class="panel">目前沒有賽事</div>';
    return;
  }

  // 依日期分組
  const dateGroups = {};
  allGames.forEach(g => {
    if (!dateGroups[g.date]) dateGroups[g.date] = [];
    dateGroups[g.date].push(g);
  });

  Object.keys(dateGroups).sort().forEach(date => {
    const h3 = document.createElement('h3');
    h3.textContent = date;
    box.appendChild(h3);

    const panel = document.createElement('div');
    panel.className = 'panel';

    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>場次</th>
          <th>時間</th>
          <th>客隊</th>
          <th>主隊</th>
          <th>主審</th>
          <th>一壘</th>
          <th>二壘</th>
          <th>三壘</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    dateGroups[date].forEach(g => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td>${g.game_code}</td>
        <td>${formatTime(g.time_range)}</td>
        <td>${g.away_team}</td>
        <td>${g.home_team}</td>
        ${['PU','U1','U2','U3'].map(r => `
          <td>${renderPosAdmin(g, r)}</td>
        `).join('')}
      `;
      tbody.appendChild(tr);
    });

    panel.appendChild(table);
    box.appendChild(panel);
  });
}

// ===============================
// 裁判長站位 render（桌機）
// ===============================
function renderPosAdmin(g, role) {
  const gameAssign = assignedByChief[g.game_id] || {};

  // ✅ 已指派
  if (gameAssign[role]) {
    return `
      <div class="judge-name">
        ${gameAssign[role]}
        <span class="cancel-btn"
          onclick="openAssignJudge('${g.game_id}','${role}')">
          更換
        </span>
      </div>
    `;
  }

  // ✅ 空位 → 指派
  return `
    <button class="pos-choice"
      onclick="openAssignJudge('${g.game_id}','${role}')">
      指派
    </button>
  `;
}

// ===============================
// 指派裁判（核心邏輯）
// ===============================
function openAssignJudge(gameId, role) {
  const current = assignedByChief[gameId] || {};
  const alreadyUsed = Object.values(current);

  openSelectJudge((judgeId, judgeName) => {

    // ✅ 規則：同場不能重複裁判
    if (alreadyUsed.includes(judgeId)) {
      showMessage('⚠️ 此裁判已在該場負責其他站位');
      return;
    }

    const session = JSON.parse(localStorage.getItem('session_user') || {});

    // ✅ 這裡就是你問的「前端寫在哪裡」
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
          // ✅ 不再用前端暫存，直接重抓後端合併資料
          loadGames(); // 會呼叫 getGamesWithAssignments
        } else {
          showMessage(res?.message || '指派失敗');
        }
      }
    );
  });
}

// ===============================
// 手機版 render（裁判長）
// ===============================
function renderMobile() {
  const box = document.getElementById('mobileView');
  if (!box) return;

  box.innerHTML = '';

  allGames.forEach(g => {
    const card = document.createElement('div');
    card.className = 'game-card';

    card.innerHTML = `
      <div class="game-header">
        <div>📅 ${g.date}</div>
        <div>⏰ ${formatTime(g.time_range)}</div>
      </div>

      ${['PU','U1','U2','U3'].map(r => {
        const gameAssign = assignedByChief[g.game_id] || {};
        if (gameAssign[r]) {
          return `
            <div class="mobile-pos">
              ${r}：${gameAssign[r]}
              <button onclick="openAssignJudge('${g.game_id}','${r}')">更換</button>
            </div>
          `;
        }
        return `
          <div class="mobile-pos">
            ${r}：
            <button onclick="openAssignJudge('${g.game_id}','${r}')">指派</button>
          </div>
        `;
      }).join('')}
    `;

    box.appendChild(card);
  });
}
