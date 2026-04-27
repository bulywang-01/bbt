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
 * 載入資料（⚠️這裡很關鍵）
 * ========================= */
function loadGames() {
  callApi(
    { action: 'getGamesWithAssignments_admin' },
    res => {
      // ✅ 正確的防呆判斷（你原本這行是壞掉的）
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
 * render 賽事列表
 * ========================= */
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
        ${['PU', 'U1', 'U2', 'U3'].map(role => renderPosCell(game, role)).join('')}
      </div>
    `;

    box.appendChild(panel);
  });
}

/* =========================
 * render 單一站位
 * ========================= */
function renderPosCell(game, role) {
  const pos = game.positions[role];

  // 依裁判人數判斷是否需要此站位
  const requiredRolesByCount = {
    1: ['PU'],
    2: ['PU', 'U1'],
    3: ['PU', 'U1', 'U3'],
    4: ['PU', 'U1', 'U2', 'U3']
  };
  const neededRoles = requiredRolesByCount[game.umpire_count] || [];
  const isDisabled = !neededRoles.includes(role);

  // 不需要的站位（例如 3 人制的二壘）
  if (isDisabled) {
    return `
      <div class="pos-cell disabled">
        <div class="role">${ROLE_LABEL[role]}</div>
        <div class="judge preferred">不需此站位</div>
      </div>
    `;
  }

  // 已指派
  if (pos.assigned) {
    return `
      <div class="pos-cell assigned">
        <div class="role">${ROLE_LABEL[role]}</div>
        <div class="judge">${pos.assigned.name || '（未知裁判）'}</div>
        <button class="btn-change"
          onclick="openAssignJudge('${game.game_id}','${role}')">
          更換
        </button>
      </div>
    `;
  }

  // 尚未指派
  const preferredText =
    pos.preferred && pos.preferred.length > 0
      ? '' + pos.preferred.map(j => j.name).join('、')
      : '尚未報名';

  return `
    <div class="pos-cell">
      <div class="role">${ROLE_LABEL[role]}</div>
      <div class="judge preferred">${preferredText}</div>
      <button class="btn-assign"
        onclick="openAssignJudge('${game.game_id}','${role}')">
        指派
      </button>
    </div>
  `;
}

/* =========================
 * 指派裁判
 * ========================= */
let _judgeSelectCallback = null;

function openAssignJudge(gameId, role) {
  const game = allGames.find(g => String(g.game_id) === String(gameId));
  if (!game) return;

  openSelectJudge(game, role, (judgeId, name) => {
    callApi(
      {
        action: 'assignJudgeToPosition_admin',
        game_id: gameId,
        role: role,
        judge_id: judgeId
      },
      () => loadGames()
    );
  });
}

function openSelectJudge(game, role, callback) {
  _judgeSelectCallback = callback;

  const modal = document.getElementById('judgeModal');
  const list = document.getElementById('judgeList');
  const title = document.getElementById('judgeModalTitle');

  title.textContent = `選擇裁判（${ROLE_LABEL[role]}）`;
  list.innerHTML = '';

  // 本場已指派（避免重複）
  const assigned = new Set();
  Object.values(game.positions).forEach(p => {
    if (p.assigned) assigned.add(String(p.assigned.judge_id));
  });

  const available = allJudges.filter(j => !assigned.has(String(j.judge_id)));

  if (available.length === 0) {
    list.innerHTML = '<div>已無可指派裁判</div>';
  } else {
    available.forEach(j => {
      const div = document.createElement('div');
      div.className = 'judge-card';
      div.textContent = j.name;
      div.onclick = () => {
        closeJudgeModal();
        _judgeSelectCallback(j.judge_id, j.name);
      };
      list.appendChild(div);
    });
  }

  modal.classList.remove('hidden');
}

function closeJudgeModal() {
  document.getElementById('judgeModal').classList.add('hidden');
  _judgeSelectCallback = null;
}

/* =========================
 * 啟動
 * ========================= */
loadGames();
