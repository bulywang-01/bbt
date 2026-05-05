/* =========================
 * 全域資料
 * ========================= */
let allGames = [];
let allJudges = [];

/* =========================
 * 站位中文對照
 * ========================= */
const ROLE_LABEL = {
  PU: '主審',
  U1: '一壘',
  U2: '二壘',
  U3: '三壘'
};

/* =========================
 * 工具
 * ========================= */
function formatDate(d) {
  const x = new Date(d);
  return `${x.getFullYear()}/${x.getMonth() + 1}/${x.getDate()}`;
}

function formatTime(t) {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* =========================
 * 載入資料
 * ========================= */
function loadGames() {
  callApi(
    { action: 'getGamesWithAssignments_admin' },
    res => {
      if (!res || res.result !== 'ok') {
        console.error('API 回傳異常', res);
        return;
      }
      allGames = res.games || [];
      allJudges = res.judges || [];
      render();
    }
  );
}

/* =========================
 * 分組：日期 → category（大聯盟組/小聯盟組）→ 時間排序
 * ========================= */
function groupGames(games) {
  const map = {};

  games.forEach(g => {
    const dateKey = formatDate(g.date);
    const categoryKey = g.category; // ✅ 正確欄位

    if (!map[dateKey]) map[dateKey] = {};
    if (!map[dateKey][categoryKey]) map[dateKey][categoryKey] = [];

    map[dateKey][categoryKey].push(g);
  });

  // 每個 category 內依時間排序
  Object.values(map).forEach(categoryMap => {
    Object.values(categoryMap).forEach(list => {
      list.sort((a, b) => new Date(a.time) - new Date(b.time));
    });
  });

  return map;
}

/* =========================
 * render 主畫面
 * ========================= */
function render() {
  const box = document.getElementById('content');
  box.innerHTML = '';

  if (allGames.length === 0) {
    box.innerHTML = '<p>目前沒有賽事</p>';
    return;
  }

  const grouped = groupGames(allGames);

  // ✅ 日期依真正時間排序
  const dates = Object.keys(grouped).sort(
    (a, b) => new Date(a.replace(/\//g, '-')) - new Date(b.replace(/\//g, '-'))
  );

  dates.forEach(date => {
    const datePanel = document.createElement('div');
    datePanel.className = 'panel';

    const dateHeader = document.createElement('div');
    dateHeader.className = 'game-header';
    dateHeader.textContent = date;
    datePanel.appendChild(dateHeader);

    const categoryMap = grouped[date];

    Object.keys(categoryMap).forEach(category => {
      const categoryTitle = document.createElement('div');
      categoryTitle.style.fontWeight = '700';
      categoryTitle.style.margin = '10px 0 6px';
      categoryTitle.textContent = category; // ✅ 一定是「大聯盟組 / 小聯盟組」
      datePanel.appendChild(categoryTitle);

      categoryMap[category].forEach(game => {
        datePanel.appendChild(renderGameRow(game));
      });
    });

    box.appendChild(datePanel);
  });
}

/* =========================
 * render 單場比賽
 * ========================= */
function renderGameRow(game) {
  const wrap = document.createElement('div');
  wrap.style.marginBottom = '14px';

  const title = document.createElement('div');
  title.style.fontWeight = '700';
  title.style.marginBottom = '6px';
  title.textContent =
    `${formatTime(game.time)} ｜ ${game.away_team} vs ${game.home_team}`;
  wrap.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'pos-grid';

  ['PU', 'U1', 'U2', 'U3'].forEach(role => {
    grid.insertAdjacentHTML('beforeend', renderPosCell(game, role));
  });

  wrap.appendChild(grid);
  return wrap;
}

/* =========================
 * render 單一站位（你原本的邏輯，未動）
 * ========================= */
function renderPosCell(game, role) {
  const pos = game.positions[role];

  const requiredRolesByCount = {
    1: ['PU'],
    2: ['PU', 'U1'],
    3: ['PU', 'U1', 'U3'],
    4: ['PU', 'U1', 'U2', 'U3']
  };
  const neededRoles = requiredRolesByCount[game.umpire_count] || [];
  const isDisabled = !neededRoles.includes(role);

  if (isDisabled) {
    return `
      <div class="pos-cell">
        <div class="role">${ROLE_LABEL[role]}</div>
        <div>不指派</div>
      </div>`;
  }

  if (pos.assigned) {
    return `
      <div class="pos-cell assigned">
        <div class="role">${ROLE_LABEL[role]}</div>
        <div class="judge">${pos.assigned.name || '（未知裁判）'}</div>
        <button class="btn-change"
          onclick="openAssignJudge('${game.game_id}', '${role}')">更換</button>
      </div>`;
  }

  const preferredText =
    pos.preferred && pos.preferred.length > 0
      ? pos.preferred.map(j => j.name).join('、')
      : '尚未報名';

  return `
    <div class="pos-cell">
      <div class="role">${ROLE_LABEL[role]}</div>
      <div class="judge preferred">${preferredText}</div>
      <button class="btn-assign"
        onclick="openAssignJudge('${game.game_id}', '${role}')">指派</button>
    </div>`;
}

/* =========================
 * 啟動
 * ========================= */
loadGames();

let currentAssignContext = null;

/**
 * 開啟指派裁判 modal
 * @param {string|number} gameId
 * @param {string} role  PU / U1 / U2 / U3
 */
/*
function openAssignJudge(gameId, role) {
  currentAssignContext = { gameId, role };

  const modal = document.getElementById('judgeModal');
  const list = document.getElementById('judgeList');
  const title = document.getElementById('judgeModalTitle');

  title.textContent = `指派 ${ROLE_LABEL[role]}`;
  list.innerHTML = '';

  allJudges.forEach(j => {
    const card = document.createElement('div');
    card.className = 'judge-card';
    card.textContent = j.name;
    card.onclick = () => assignJudge(j);
    list.appendChild(card);
  });

  modal.classList.remove('hidden');
}
*/

/* 改成掛在 window */
window.openAssignJudge = function (gameId, role) {
  currentAssignContext = { gameId, role };

  const modal = document.getElementById('judgeModal');
  const list  = document.getElementById('judgeList');
  const title = document.getElementById('judgeModalTitle');

  title.textContent = `指派 ${ROLE_LABEL[role]}`;
  list.innerHTML = '載入中...';

  // ✅ 改成用後端算好的名單
  callApi(
    {
      action: 'getAssignableJudges_admin',
      game_id: gameId,
      role: role
    },
    res => {
      list.innerHTML = '';

      if (!res || res.result !== 'ok' || !res.judges || res.judges.length === 0) {
        list.innerHTML = `<div style="color:#999;text-align:center;">目前無可指派裁判</div>`;
        modal.classList.remove('hidden');
        return;
      }

      res.judges.forEach(j => {
        const card = document.createElement('div');
        card.className = 'judge-card';
        card.textContent = j.name;
        card.onclick = () => assignJudge(j);
        list.appendChild(card);
      });

      modal.classList.remove('hidden');
    }
  );
};

/*
function closeJudgeModal() {
  document.getElementById('judgeModal').classList.add('hidden');
}
*/

/* 改成掛在 window */
window.closeJudgeModal = function () {
  const modal = document.getElementById('judgeModal');
  const list = document.getElementById('judgeList');

  modal.classList.add('hidden');
  list.innerHTML = '';
  currentAssignContext = null;
};

window.handleModalBackdrop = function (e) {
  if (e.target.id === 'judgeModal') {
    closeJudgeModal();
  }
};

function assignJudge(judge) {
  if (!currentAssignContext) return;
  console.log('assign judge object =', judge);
  callApi(
    {
      action: 'assignJudgeToPosition_admin',
      game_id: currentAssignContext.gameId,
      role: currentAssignContext.role,
      // judge_id: judge.user_id
      judge_id: judge.judge_id   // ✅ 改成這個
    },
      res => {
        if (res && res.result === 'ok') {
          alert('✅ 指派成功');          // ✅ 用最直覺方式
          closeJudgeModal();
          loadGames();
        } else {
          alert('❌ 指派失敗：' + (res?.message || '未知錯誤'));
          }
        }
    );
}

/*
function logout() {
  if (!confirm('確定要登出？')) return;
  localStorage.clear();
  location.replace('login.html');
}
*/

/* 改成掛在 window */
window.logout = function () {
  if (!confirm('確定要登出？')) return;
  localStorage.clear();
  location.replace('login.html');
};
