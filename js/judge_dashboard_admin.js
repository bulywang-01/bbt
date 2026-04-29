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
 * 分組：日期 → 組別（game.group）→ 時間排序
 * ========================= */
function groupGames(games) {
  const map = {};

  games.forEach(g => {
    const dateKey = formatDate(g.date);
    const groupKey = g.group; // ✅ 正確欄位，強制存在

    if (!map[dateKey]) map[dateKey] = {};
    if (!map[dateKey][groupKey]) map[dateKey][groupKey] = [];

    map[dateKey][groupKey].push(g);
  });

  // 組別內依時間排序
  Object.values(map).forEach(groupMap => {
    Object.values(groupMap).forEach(list => {
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

  // ✅ 日期依實際日期排序
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

    const groupMap = grouped[date];
    const groups = Object.keys(groupMap); // 組別順序照後端給

    groups.forEach(group => {
      const groupTitle = document.createElement('div');
      groupTitle.style.fontWeight = '700';
      groupTitle.style.margin = '10px 0 6px';
      groupTitle.textContent = group;
      datePanel.appendChild(groupTitle);

      groupMap[group].forEach(game => {
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
 * render 單一站位（既有邏輯）
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
