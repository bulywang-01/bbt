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
// ✅ 目前登入使用者（裁判長 / admin）
const session = JSON.parse(localStorage.getItem('session_user') || '{}');
const CURRENT_USER_ID = session.user_id || '';


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

      let preferredText = '尚未報名';
      
      if (pos.preferred && pos.preferred.length > 0){
      
        const list = pos.preferred;
      
        if (list.length === 1){
      
          preferredText = `<span class="rank-1">${list[0].name}</span>`;
      
        } else {
      
          const circled = ['①','②','③','④','⑤'];  // ✅ 支援到5
      
          preferredText = list.map((j, i) => {
      
            const rank = i;
      
            const num = circled[rank] || (rank+1);
      
            if (rank === 0){
              return `<span class="rank-1">${num} ${j.name}</span>`;
            }
      
            if (rank === 1){
              return `<span class="rank-2">${num} ${j.name}</span>`;
            }
      
            return `<span class="rank-3">${num} ${j.name}</span>`;
      
          }).join('');
        }
      }




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

window.openAssignJudge = function (gameId, role) {
  currentAssignContext = { gameId, role };

  const modal = document.getElementById('judgeModal');
  const list = document.getElementById('judgeList');
  const title = document.getElementById('judgeModalTitle');

  title.textContent = `指派 ${ROLE_LABEL[role]}`;
  list.innerHTML = '載入中…';

  modal.classList.remove('hidden');

  callApi({
    action: 'getAssignableJudges_admin',
    game_id: gameId,
    user_id: CURRENT_USER_ID
  }, res => {

    list.innerHTML = '';

    // ❌ 防呆
    if (!res || res.result !== 'ok' || !Array.isArray(res.judges)) {
      list.innerHTML = `<div class="empty">目前無可指派裁判</div>`;
      return;
    }

    // ✅ 找到該場比賽
    const game = allGames.find(g => String(g.game_id) === String(gameId));
    
    // ✅ 本場「已佔位的人（裁判 + 報名）」全部抓出來
    const occupiedIds = new Set();
    
    if (game && game.positions) {
    
      Object.values(game.positions).forEach(p => {
    
        // ✅ 已指派
        if (p.assigned && p.assigned.id) {
          occupiedIds.add(String(p.assigned.id));
        }
    
        // ✅ ✅ ✅ 加這段（關鍵！）→ 報名的人也不能再當別的位置
        if (Array.isArray(p.preferred)) {
          p.preferred.forEach(u => {
            if (u.id) {
              occupiedIds.add(String(u.id));
            }
          });
        }
    
      });
    }


    // ✅ 排序（證照 > 姓名）
    const levelPriority = {
      A: 3,
      B: 2,
      C: 1
    };
    
    const sortedJudges = res.judges.sort((a, b) => {
    
      // ✅ level（你 Users 裡是 level 欄位）
      const levelA = (a.level || '').toUpperCase();
      const levelB = (b.level || '').toUpperCase();
    
      const scoreA = levelPriority[levelA] || 0;
      const scoreB = levelPriority[levelB] || 0;
    
      // ✅ 先比證照（高 → 低）
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
    
      // ✅ 再比姓名第一個字
      const nameA = (a.name || '').charAt(0);
      const nameB = (b.name || '').charAt(0);
    
      return nameA.localeCompare(nameB, 'zh-Hant');
    });

    // ✅ 嚴格過濾：只要已在任何裁判站位 → 不顯示
    // res.judges.forEach(j => {
    
    sortedJudges.forEach(j => {
      const uid = String(j.user_id);

      if (occupiedIds.has(uid)) return;

      const card = document.createElement('div');
      card.className = 'judge-card';
      card.textContent = j.name;
      card.onclick = () => assignJudge(j);

      list.appendChild(card);
    });

    if (!list.children.length) {
      list.innerHTML = `<div class="empty">目前無可指派裁判</div>`;
    }
  });
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

  const modal = document.getElementById('judgeModal');
  const loading = document.getElementById('judgeLoading');

  // ✅ 立刻給使用者回饋
  showAssignMessage('⏳ 指派中，請稍候…');

  // ✅ 防止連續點擊
  modal.style.pointerEvents = 'none';
  if (loading) loading.style.display = 'block';

  callApi({
    action: 'assignJudgeToPosition_admin',
    game_id: currentAssignContext.gameId,
    role: currentAssignContext.role,
    judge_id: judge.user_id
  }, res => {

    modal.style.pointerEvents = 'auto';
    if (loading) loading.style.display = 'none';

    /* =========================
     * ❌ 1️⃣ 明確失敗（後端規則擋）
     * ========================= */
    if (res && res.result === 'error') {
      // ✅ 這裡就是你現在缺的
      showAssignMessage(
        `❌ ${res.message || '指派失敗'}`
      );
      return;
    }

    /* =========================
     * ✅ 2️⃣ 成功 or 非明確錯誤
     * ========================= */
    showAssignMessage('✅ 指派完成');
    closeJudgeModal();
    loadGames();   // ✅ 一定要重整
  });
}



function showAssignMessage(msg) {
  const box = document.createElement('div');
  box.textContent = msg;

  Object.assign(box.style, {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#323232',
    color: '#fff',
    padding: '10px 18px',
    borderRadius: '8px',
    fontSize: '14px',
    zIndex: 10000,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
  });

  document.body.appendChild(box);

  setTimeout(() => {
    box.remove();
  }, 1600);
}


/* 改成掛在 window */
window.logout = function () {
  if (!confirm('確定要登出？')) return;
  localStorage.clear();
  location.replace('login.html');
};
