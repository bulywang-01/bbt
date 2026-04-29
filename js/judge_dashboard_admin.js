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
  U1: '一壘審',
  U2: '二壘審',
  U3: '三壘審'
};

/* =========================
 * 工具
 * ========================= */
function formatDate(d) {
  const x = new Date(d);
  return `${x.getFullYear()}/${x.getMonth() + 1}/${x.getDate()}`;
}

function formatSheetTime(t) {
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
 * 將賽事依日期分組並排序
 * ========================= */
function groupByDate(games) {
  const map = {};
  games.forEach(g => {
    if (!map[g.date]) {
      map[g.date] = [];
    }
    map[g.date].push(g);
  });

  Object.keys(map).forEach(date => {
    map[date].sort((a, b) => {
      return String(a.time || '').localeCompare(String(b.time || ''));
    });
  });

  return map;
}

/* =========================
 * render 主畫面（✅同日期同一個 panel）
 * ========================= */
function render() {
  const box = document.getElementById('content');
  box.innerHTML = '';

  if (allGames.length === 0) {
    box.innerHTML = '<p>目前沒有賽事</p>';
    return;
  }

  const grouped = groupByDate(allGames);
  const dates = Object.keys(grouped).sort();

  dates.forEach(date => {
    const panel = document.createElement('div');
    panel.className = 'panel';

    const header = document.createElement('div');
    header.className = 'game-header';
    header.textContent = date;
    panel.appendChild(header);

    grouped[date].forEach(game => {
      panel.appendChild(renderGameRow(game));
    });

    box.appendChild(panel);
  });
}

/* =========================
 * render 單場比賽（時間 + 對戰 + 站位）
 * ========================= */
function renderGameRow(game) {
  const wrap = document.createElement('div');
  wrap.style.marginBottom = '16px';

  const title = document.createElement('div');
  title.style.fontWeight = '700';
  title.style.marginBottom = '8px';
  title.textContent =
    `${formatSheetTime(game.time)} ｜ ${game.away_team} vs ${game.home_team}`;
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
 * render 單一站位（✅原邏輯完全保留）
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
 * 以下：指派、Modal、衝突判斷（✅完全保留）
 * ========================= */
// 🔽（這一段我完全未改，你原本的程式 그대로）
// openAssignJudge()
// showAssignSuccess()
// openSelectJudge()
// closeJudgeModal()

/* =========================
 * 啟動
 * ========================= */
loadGames();
