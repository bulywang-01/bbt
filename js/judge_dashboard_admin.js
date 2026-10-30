/* =========================
 * 全域資料
 * ========================= */
let allGames = [];
let allJudges = [];
let currentDateFilter = 'ALL';
let currentMonthFilter = 'ALL';  // 篩選月份
let currentKpiFilter = 'ALL';  // KPI點選篩選呈現的賽事
let currentDisplayGames = [];  // 正確顯示賽事資訊
let currentAssignContext = null;
let currentJudgeList = [];
let autoAssignOpened = false;

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
 * 共用工具
 * ========================= */
// ✅ 目前登入使用者（裁判長 / admin）
const session = JSON.parse(localStorage.getItem('session_user') || '{}');
const CURRENT_USER_ID = session.user_id || '';

function setText(id, value){

  const el =
    document.getElementById(id);

  if(el){
    el.textContent = value;
  }
}

function formatDate(d) {
  const x = new Date(d);
  return `${x.getFullYear()}/${x.getMonth() + 1}/${x.getDate()}`;
}

function formatTime(t) {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 日期不呈現年份
function formatShortDate(date){
  const d = new Date(date);
  return `${d.getMonth()+1}/${d.getDate()}`;
}

// 篩選月份
function changeMonthFilter(month){
  currentMonthFilter = month;
  currentDateFilter = 'ALL';
  renderDateTabs();
  render();
}


// 日期切換
function changeDateFilter(date){
  currentDateFilter = date;
  renderDateTabs();
  render();
}


function isPositionFilled(pos){
  return !!(
    pos?.assigned ||
    (
      Array.isArray(pos?.preferred) &&
      pos.preferred.length > 0
    )
  );
}

// 缺額判斷
function hasVacancy(game){

  const requiredRoles = {
    0:[],
    1:['PU'],
    2:['PU','U1'],
    3:['PU','U1','U3'],
    4:['PU','U1','U2','U3']
  };

  const activeRoles =
    requiredRoles[
      Number(game.umpire_count ?? 0)
    ] || [];

  return activeRoles.some(role => {

    const pos =
      game.positions?.[role];

    return !isPositionFilled(pos);

  });

}


/* =========================
 * 日期燈號
 * RED    = 完全沒人
 * YELLOW = 有缺額
 * GREEN  = 全部已有報名/指派
 * ========================= */
function getDateStatus(date, gameSource){

  const games =
    gameSource.filter(
      g =>
        formatDate(g.date) === date
    );

  let hasRed = false;
  let hasYellow = false;

  games.forEach(game => {

    const activeRoles = {
      0:[],
      1:['PU'],
      2:['PU','U1'],
      3:['PU','U1','U3'],
      4:['PU','U1','U2','U3']
    }[
      Number(game.umpire_count ?? 0)
    ] || [];

    if(!activeRoles.length){
      return;
    }

    let filledCount = 0;

    activeRoles.forEach(role => {

      if(
        isPositionFilled(
          game.positions?.[role]
        )
      ){
        filledCount++;
      }

    });

    if(filledCount === 0){

      hasRed = true;

    }else if(
      filledCount < activeRoles.length
    ){

      hasYellow = true;

    }

  });

  if(hasRed){
    return 'RED';
  }

  if(hasYellow){
    return 'YELLOW';
  }

  return 'GREEN';

}

/* =========================
 * 全部日期
* ========================= */
function renderDateTabs(){

  const tabs =
    document.getElementById(
      'dateTabs'
    );

  if(!tabs){
    return;
  }

  let sourceGames = allGames.filter(g => {
  
    if(
      Number(g.umpire_count ?? 0) <= 0
    ){
      return false;
    }
  
    if(
      currentMonthFilter !== 'ALL'
    ){
  
      const gameMonth =
        new Date(g.date).getMonth() + 1;
  
      if(
        gameMonth !== Number(currentMonthFilter)
      ){
        return false;
      }
  
    }
  
    return true;
  
  });
  
  /* =========================
   * KPI 篩選同步
   * ========================= */
  switch(currentKpiFilter){
  
    case 'VACANCY':
  
      sourceGames =
        sourceGames.filter(game =>
          hasVacancy(game)
        );
  
      break;
  
    case 'ASSIGNED':
  
      sourceGames =
        sourceGames.filter(game =>
          !hasVacancy(game)
        );
  
      break;
  
    case 'PENDING':
  
      sourceGames =
        sourceGames.filter(game =>
          hasVacancy(game)
        );
  
      break;
  
  }
  
  let dates = [
  
    ...new Set(
  
      sourceGames.map(g =>
        formatDate(g.date)
      )
  
    )
  
  ];

  dates.sort((a,b)=>{

    const priority = {
      RED:0,
      YELLOW:1,
      GREEN:2
    };

    const statusA =
      getDateStatus(
        a,
        sourceGames
      );
    
    const statusB =
      getDateStatus(
        b,
        sourceGames
      );


    if(
      priority[statusA] !==
      priority[statusB]
    ){

      return (
        priority[statusA] -
        priority[statusB]
      );

    }

    return (
      new Date(a.replace(/\//g,'-')) -
      new Date(b.replace(/\//g,'-'))
    );

  });

  tabs.innerHTML = `

    <button
      onclick="changeDateFilter('ALL')"
      class="
        px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap
        ${
          currentDateFilter === 'ALL'
          ? 'bg-slate-900 text-white'
          : 'bg-slate-100 text-slate-600'
        }">

      全部日期

    </button>

    ${dates.map(date => {

      let status;
      
      if(currentKpiFilter === 'ASSIGNED'){
      
        status = 'GREEN';
      
      }else if(
      
        currentKpiFilter === 'VACANCY' ||
        currentKpiFilter === 'PENDING'
      
      ){
      
        status = 'RED';
      
      }else{
      
        status =
          getDateStatus(
            date,
            sourceGames
          );
      
      }

      let buttonClass =
        'bg-emerald-500 text-white';

      if(status === 'RED'){

        buttonClass =
          'bg-rose-500 text-white';

      }else
      if(status === 'YELLOW'){

        buttonClass =
          'bg-amber-400 text-slate-900';

      }

      if(
        currentDateFilter === date
      ){

        buttonClass +=
          ' ring-2 ring-slate-900';

      }

      return `

        <button
          onclick="changeDateFilter('${date}')"
          class="
            px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap
            ${buttonClass}
          ">

          ${formatShortDate(date)}

        </button>

      `;

    }).join('')}

  `;

}

/* =========================
 * 載入資料
 * ========================= */
function loadGames() {

  console.log(
    'loadGames start'
  );

  callApi(
    {
      action:'getGamesWithAssignments_admin'
    },
    res => {

      console.log(
        'judge dashboard data =',
        res
      );

      if(
        !res ||
        res.result !== 'ok'
      ){

        console.error(
          'API 回傳異常',
          res
        );

        const box =
          document.getElementById(
            'content'
          );

        if(box){

          box.innerHTML = `
            <div class="bg-white rounded-2xl border border-rose-200 p-10 text-center text-rose-600 font-bold">
              裁判班表資料載入失敗
            </div>
          `;

        }

        return;
      }

      allGames =
        res.games || [];

      allJudges =
        res.judges || [];

      render();
      renderKPI();
      renderMonthTabs();
      renderDateTabs();
      renderKpiActive();
      focusGameFromUrl();
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

/*********************************************************
 * Render 主畫面 V2
 *********************************************************/
function render(){

  const box =
    document.getElementById('content');

  if(!box){
    return;
  }

  if(!allGames.length){

    box.innerHTML = `
      <div class="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
        目前沒有賽事資料
      </div>
    `;

    return;
  }

  /* =========================
   * 月份 + 日期篩選
   * ========================= */
  const filteredGames = allGames.filter(g=>{

    const gameMonth =
      new Date(g.date).getMonth() + 1;

    const monthMatch =
      currentMonthFilter === 'ALL'
        ? true
        : gameMonth === Number(currentMonthFilter);

    const dateMatch =
      currentDateFilter === 'ALL'
        ? true
        : formatDate(g.date) === currentDateFilter;

    return (
      monthMatch &&
      dateMatch &&
      Number(g.umpire_count ?? 0) > 0
    );

  });

  /* =========================
   * KPI 篩選
   * ========================= */
  let displayGames = [...filteredGames];

  switch(currentKpiFilter){

    /* 全部 */
    case 'ALL':
      break;

    /* 有缺額 */
    case 'VACANCY':

      displayGames =
        displayGames.filter(game =>
          hasVacancy(game)
        );

      break;

    /* 已全部補齊 */
    case 'ASSIGNED':

      displayGames =
        displayGames.filter(game =>
          !hasVacancy(game)
        );

      break;

    /* 待補賽事 */
    case 'PENDING':

      displayGames =
        displayGames.filter(game =>
          hasVacancy(game)
        );

      break;

  }

  currentDisplayGames =
  [...displayGames];
  
  /* =========================
   * 無資料
   * ========================= */
  if(displayGames.length === 0){

    let message =
      '本條件下沒有符合賽事';

    switch(currentKpiFilter){

      case 'VACANCY':
        message = '目前沒有缺額賽事';
        break;

      case 'ASSIGNED':
        message = '目前沒有已滿編賽事';
        break;

      case 'PENDING':
        message = '目前沒有待補賽事';
        break;
    }

    box.innerHTML = `
      <div class="bg-white rounded-2xl border border-slate-200 p-12 text-center">

        <div class="text-lg font-black text-slate-700">
          ${message}
        </div>

        <div class="text-sm text-slate-400 mt-2">
          請切換月份、日期或 KPI 條件
        </div>

      </div>
    `;

    return;
  }

  /* =========================
   * 分組
   * ========================= */
  const grouped =
    groupGames(displayGames);

  const dates =
    Object.keys(grouped)
      .sort(
        (a,b)=>
          new Date(a.replace(/\//g,'-')) -
          new Date(b.replace(/\//g,'-'))
      );

  /* =========================
   * Render 畫面
   * ========================= */
  box.innerHTML = dates.map(date => {

    const categoryMap =
      grouped[date];

    return `

      <div class="space-y-4">

        <div class="flex items-center space-x-2 border-b-2 border-slate-200 pb-2">

          <i
            data-lucide="calendar"
            class="w-5 h-5 text-brand-600">
          </i>

          <h3 class="text-base font-black text-slate-900">
            ${formatShortDate(date)}
          </h3>

        </div>

        ${Object.keys(categoryMap).map(category => `

          <div class="mb-2">

            <span
              class="bg-slate-200 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-bold">

              ${category}

            </span>

          </div>

          ${categoryMap[category]
            .map(game =>
              renderGameCard(game)
            )
            .join('')}

        `).join('')}

      </div>

    `;

  }).join('');

  if(window.lucide){
    lucide.createIcons();
  }

}

/*********************************************************
 * 賽事卡片
 *********************************************************/
function renderGameCard(game){

  const requiredRoles = {
    0:[],
    1:['PU'],
    2:['PU','U1'],
    3:['PU','U1','U3'],
    4:['PU','U1','U2','U3']
  };

  const activeRoles =
    requiredRoles[
      Number(game.umpire_count ?? 0)
    ] || [];

  const missingCount =
    activeRoles.filter(role => {
  
      const pos =
        game.positions?.[role];
  
      return !isPositionFilled(pos);
  
    }).length;

  return `
    <div
      id="game-${game.game_id}"
      class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition mb-4">

      <div class="bg-slate-50 px-4 py-3 border-b border-slate-100">

        <div class="flex items-center justify-between gap-2 flex-wrap">
          <div class="flex items-center justify-between gap-2 flex-wrap">
          
            <div class="game-header flex items-center gap-2 min-w-0">
          
              <span class="bg-brand-600 text-white text-xs font-black px-2.5 py-1 rounded-lg shrink-0">
                ${formatTime(game.time)}
              </span>
          
              <span class="font-black text-slate-900 text-base">
                ${game.away_team}
                <span class="text-slate-400 mx-1">VS</span>
                ${game.home_team}
              </span>
          
            </div>
          
            <div class="text-xs text-slate-500 shrink-0">
              📍 ${game.field || '-'}
            </div>
          
          </div>

          ${
            activeRoles.length === 0

            ? `
              <span class="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-xs font-bold">
                不需裁判
              </span>
            `

            : missingCount > 0

            ? `
              <span class="bg-amber-100 text-amber-800 px-2 py-1 rounded-lg border border-amber-200 text-xs font-bold">
                尚缺 ${missingCount} 位裁判
              </span>
            `

            : `
              <span class="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-lg border border-emerald-200 text-xs font-bold">
                已滿編
              </span>
            `
          }

        </div>

      </div>

      ${
        activeRoles.length > 0

        ? `

          <div class="p-3 space-y-2">

            ${activeRoles
              .map(role =>
                renderPosCell(game, role)
              )
              .join('')}

          </div>

        `

        : ''

      }

    </div>
  `;
}

/*********************************************************
 * 裁判站位卡（V2 緊湊版）
 *********************************************************/
function renderPosCell(game, role){
  
  const pos = game.positions?.[role] || {};

  const roleMap = {
    PU:'主審',
    U1:'一壘審',
    U2:'二壘審',
    U3:'三壘審'
  };
  
  if(game.is_locked){
  
    return `
      <div class="bg-slate-100 border border-slate-300 rounded-xl px-3 py-2">
  
        <div class="flex items-center justify-between">
  
          <div class="flex items-center gap-3">
  
            <span class="text-xs font-black">
              ${roleMap[role]}
            </span>
  
            <span class="font-bold text-slate-600">
              ${
                pos.assigned?.name ||
                '未配置'
              }
            </span>
  
          </div>
  
          <span class="
            bg-slate-300
            text-slate-700
            text-xs
            px-2 py-1
            rounded-lg
            font-bold">
  
            🔒 已鎖定
  
          </span>
  
        </div>
  
      </div>
    `;
  }


  const requiredRoles = {
    0:[],
    1:['PU'],
    2:['PU','U1'],
    3:['PU','U1','U3'],
    4:['PU','U1','U2','U3']
  };

  const activeRoles =
    requiredRoles[
      Number(game.umpire_count ?? 0)
    ] || [];

  const disabled =
    !activeRoles.includes(role);

  /* =========================
   * 不配置
   * ========================= */
  if(disabled){

    return `
      <div class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 opacity-60">

        <div class="flex items-center justify-between">

          <div class="flex items-center gap-3">

            <span class="text-xs font-black text-slate-500 w-14">
              ${roleMap[role]}
            </span>

            <span class="text-sm text-slate-400">
              本場不配置
            </span>

          </div>

          <span class="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded">
            不指派
          </span>

        </div>

      </div>
    `;
  }

  /* =========================
   * 已指派
   * ========================= */
  if(pos.assigned){

    return `
      <div class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">

        <div class="position-row flex items-center justify-between gap-2">

          <div class="position-main flex items-center gap-3 min-w-0 flex-1">

            <span class="text-xs font-black text-slate-600 w-14 shrink-0">
              ${roleMap[role]}
            </span>

            <span class="font-bold text-slate-900 truncate">
              ${pos.assigned.name || '未命名'}
            </span>

            <span class="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
              ✓
            </span>

          </div>

          <div class="position-actions flex items-center gap-1 shrink-0">

            <button
              onclick="openAssignJudge('${game.game_id}','${role}')"
              class="bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold px-3 py-1 rounded-lg">

              更換

            </button>

            <button
              onclick="cancelJudgeAssignment('${game.game_id}','${role}')"
              class="bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold px-3 py-1 rounded-lg">

              刪除

            </button>

          </div>

        </div>

      </div>
    `;
  }

  /* =========================
   * 已報名未指派
   * ========================= */
  if(
    pos.preferred &&
    pos.preferred.length > 0
  ){

    const names =
      pos.preferred
        .map(p => p.name)
        .slice(0,2)
        .join('、');

    return `
      <div class="bg-amber-50 border border-amber-300 rounded-xl px-3 py-2">

        <div class="position-row flex items-center justify-between gap-2">

          <div class="position-main flex items-center gap-3 min-w-0 flex-1">

            <span class="text-xs font-black text-amber-700 w-14 shrink-0">
              ${roleMap[role]}
            </span>

            <span class="font-medium text-slate-800 truncate">
              ${names}
              ${
                pos.preferred.length > 2
                ? `等 ${pos.preferred.length} 人`
                : ''
              }
            </span>

            <span class="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
              ${pos.preferred.length}人報名
            </span>

          </div>

          <div class="position-actions flex items-center gap-1 shrink-0">

            <button
              onclick="openAssignJudge('${game.game_id}','${role}')"
              class="bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold px-3 py-1 rounded-lg">

              指派

            </button>

          </div>

        </div>

      </div>
    `;
  }

  /* =========================
   * 完全缺額
   * ========================= */
  return `
    <div class="bg-rose-50 border border-rose-300 rounded-xl px-3 py-2">

      <div class="position-row flex items-center justify-between gap-2">

        <div class="flex items-center gap-3 flex-1">

          <span class="text-xs font-black text-rose-700 w-14 shrink-0">
            ${roleMap[role]}
          </span>

          <span class="font-bold text-rose-600">
            缺額
          </span>

          <span class="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded">
            尚未指派
          </span>

        </div>

        <button
          onclick="openAssignJudge('${game.game_id}','${role}')"
          class="bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold px-3 py-1 rounded-lg shrink-0">

          指派

        </button>

      </div>

    </div>
  `;
}

/* =========================
 * 啟動
 * ========================= */
document.addEventListener('DOMContentLoaded', () => {

  console.log('judge dashboard start');

  loadGames();

  const btn = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if(btn && sidebar){
    btn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');

      if(overlay){
        overlay.classList.toggle('hidden');
      }
    });
  }

  if(overlay && sidebar){
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.add('hidden');
    });
  }

  const userName =
    document.getElementById('sidebarUserName');

  const userRole =
    document.getElementById('sidebarUserRole');

  if(userName){
    userName.textContent =
      session.name || session.user_name || '未登入';
  }

  if(userRole){
    userRole.textContent =
      session.role || '-';
  }

  const avatar =
  document.getElementById('sidebarAvatar');

  const displayName =
    session.name ||
    session.user_name ||
    '未登入';
  
  if (avatar) {
    avatar.textContent =
      displayName.trim().charAt(0);
  }
});


/**
 * 開啟指派裁判 modal
 * @param {string|number} gameId
 * @param {string} role  PU / U1 / U2 / U3
 */

window.openAssignJudge = function(gameId, role){

  const game =
    allGames.find(
      g => String(g.game_id) === String(gameId)
    );

  if(!game){
    showAssignMessage('❌ 找不到賽事');
    return;
  }

  if(game.is_locked){
    showAssignMessage('🔒 此賽事已鎖定');
    return;
  }

  currentAssignContext = {
    gameId,
    role
  };

  currentJudgeList = [];

  const modal =
    document.getElementById('assignModal');

  const title =
    document.getElementById('modalTitle');

  const matchInfo =
    document.getElementById('modalMatchInfo');

  const container =
    document.getElementById('judgeList');

  title.textContent =
    `指派 ${ROLE_LABEL[role]}`;

  matchInfo.textContent =
    `${formatDate(game.date)} ${game.home_team} VS ${game.away_team}`;

  if(container){
    container.innerHTML = `
      <div class="text-center py-6 text-slate-400">
        載入中...
      </div>
    `;
  }

  modal.classList.remove('hidden');

  callApi({
    action: 'getAssignableJudges_admin',
    game_id: gameId,
    user_id: CURRENT_USER_ID
  }, res => {

    if(
      !res ||
      res.result !== 'ok' ||
      !Array.isArray(res.judges)
    ){

      if(container){
        container.innerHTML = `
          <div class="text-center py-6 text-rose-500">
            無法取得裁判清單
          </div>
        `;
      }

      return;
    }

    renderJudgeList(
      res.judges,
      game
    );

  });

};

function renderJudgeList(judges, game){

  const container =
    document.getElementById('judgeList');

  if(!container){
    return;
  }

  const occupiedIds = new Set();

  if(game.positions){

    Object.values(game.positions).forEach(pos => {

      if(
        pos.assigned &&
        pos.assigned.id
      ){

        occupiedIds.add(
          String(pos.assigned.id)
        );

      }

      if(
        Array.isArray(pos.preferred)
      ){

        pos.preferred.forEach(user => {

          if(user.id){

            occupiedIds.add(
              String(user.id)
            );

          }

        });

      }

    });

  }

  const levelPriority = {
    A:3,
    B:2,
    C:1
  };

  const available = judges

    .filter(j =>
      !occupiedIds.has(
        String(j.user_id)
      )
    )

    .sort((a,b)=>{

      const scoreA =
        levelPriority[
          (a.level || '').toUpperCase()
        ] || 0;

      const scoreB =
        levelPriority[
          (b.level || '').toUpperCase()
        ] || 0;

      if(scoreA !== scoreB){

        return scoreB - scoreA;

      }

      return (a.name || '')
        .localeCompare(
          b.name || '',
          'zh-Hant'
        );

    });

  currentJudgeList = available;

  if(!available.length){

    container.innerHTML = `
      <div class="text-center py-6 text-slate-400">
        目前無可指派裁判
      </div>
    `;

    return;
  }

  container.innerHTML = available.map(j => `

    <button
      onclick="assignJudgeById('${j.user_id}')"
      class="
      w-full
      flex
      items-center
      justify-between
      p-3
      bg-slate-50
      hover:bg-brand-50
      border
      border-slate-200
      rounded-xl
      transition
      ">

      <div class="text-left">

        <div class="font-bold text-sm">
          ${j.name}
        </div>

        <div class="text-xs text-slate-400">
          ${getLevelLabel(j.level)}
        </div>

      </div>

      <div class="text-brand-600 font-bold">
        指派
      </div>

    </button>

  `).join('');

}

window.assignJudgeById = function(userId){

  const judge =
    currentJudgeList.find(
      j =>
        String(j.user_id) ===
        String(userId)
    );

  if(!judge){
    return;
  }

  assignJudge(judge);

};

/* 改成掛在 window */
window.closeJudgeModal = function(){

  const modal =
    document.getElementById(
      'assignModal'
    );

  if(modal){

    modal.classList.add(
      'hidden'
    );

  }

  currentAssignContext = null;
  currentJudgeList = [];

};

window.handleModalBackdrop = function(e){
  if(e.target.id === 'assignModal'){
    closeJudgeModal();
  }
};


function assignJudge(judge) {

  if (!currentAssignContext) return;

  const modal =
    document.getElementById('assignModal');

  showAssignMessage(
    '⏳ 指派中，請稍候…'
  );

  modal.style.pointerEvents = 'none';

  callApi({
    action: 'assignJudgeToPosition_admin',
    game_id: currentAssignContext.gameId,
    role: currentAssignContext.role,
    judge_id: judge.user_id

  }, res => {

    modal.style.pointerEvents = 'auto';

    if (
      res &&
      res.result === 'error'
    ) {

      showAssignMessage(
        `❌ ${res.message || '指派失敗'}`
      );

      return;
    }

    showAssignMessage(
      '✅ 指派完成'
    );
    
    closeJudgeModal();
    
    history.replaceState(
      {},
      '',
      location.pathname
    );
    
    autoAssignOpened = true;
    
    /* Dashboard 點進來 */
    if (
      sessionStorage.getItem(
        'returnToDashboard'
      ) === 'Y'
    ){
    
      sessionStorage.removeItem(
        'returnToDashboard'
      );
    
      location.href =
        'admin_dashboard.html';
    
      return;
    }
    
    /* 正常裁判頁使用 */
    loadGames();

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

// 取消指派功能
function cancelJudgeAssignment(gameId, role){

  const game =
    allGames.find(
      g => String(g.game_id) === String(gameId)
    );

  if(game?.is_locked){

    showAssignMessage(
      '🔒 此賽事已鎖定'
    );

    return;
  }

  if(!confirm('確定取消此裁判指派？')){
    return;
  }

  callApi({
    action:'unassignJudge_admin',
    game_id:gameId,
    role:role
  }, res => {

    if(
      !res ||
      res.result !== 'ok'
    ){

      showAssignMessage(
        `❌ ${res?.message || '取消失敗'}`
      );

      return;
    }

    showAssignMessage(
      '✅ 已取消指派'
    );

    loadGames();

  });

}

// 取消裁判報名人員
function cancelJudgeSignup(
  gameId,
  role,
  userId
){

  const game =
    allGames.find(
      g => String(g.game_id) === String(gameId)
    );

  if(game?.is_locked){

    showAssignMessage(
      '🔒 此賽事已鎖定'
    );

    return;
  }

  if(!confirm('確定取消此人報名？')){
    return;
  }

  callApi({
    action:'cancelJudgeSignup_admin',
    game_id:gameId,
    role:role,
    user_id:userId
  }, res => {

    if(
      !res ||
      res.result !== 'ok'
    ){

      showAssignMessage(
        `❌ ${res?.message || '取消報名失敗'}`
      );

      return;
    }

    showAssignMessage(
      '✅ 已取消報名'
    );

    loadGames();

  });

}


// KPI點選後篩選賽事功能
function setKpiFilter(type){
  currentKpiFilter = type;
  renderKpiActive();
  renderDateTabs();
  render();
}

/*********************************************************
 * KPI
 *********************************************************/
function renderKPI(){

  const requiredRoles = {
    0:[],
    1:['PU'],
    2:['PU','U1'],
    3:['PU','U1','U3'],
    4:['PU','U1','U2','U3']
  };

  const validGames =
    allGames.filter(g =>
     !g.is_locked &&
      Number(g.umpire_count ?? 0) > 0
    );

  const yearGames =
    new Set(
  
      validGames.map(
        g => String(g.game_id)
      )
  
    ).size;

  let vacancyCount = 0;
  let assignedCount = 0;
  let pendingGames = 0;

  validGames.forEach(game => {

    const activeRoles =
      requiredRoles[
        Number(game.umpire_count ?? 0)
      ] || [];

    if(activeRoles.length === 0){
      return;
    }

    let gameHasVacancy = false;

    activeRoles.forEach(role => {

      const pos =
        game.positions?.[role];

      if(
        isPositionFilled(pos)
      ){

        assignedCount++;

      }else{

        vacancyCount++;
        gameHasVacancy = true;

      }

    });

    if(gameHasVacancy){
      pendingGames++;
    }

  });

  setText(
    'kpiWeekGames',
    yearGames
  );

  setText(
    'kpiJudgeVacancy',
    vacancyCount
  );

  setText(
    'kpiAssigned',
    assignedCount
  );

  setText(
    'kpiPending',
    pendingGames
  );

  /* Sidebar 缺額 */

  const badge =
    document.getElementById(
      'judgeVacancyBadge'
    );

  if(badge){

    if(vacancyCount > 0){

      badge.textContent =
        `${vacancyCount}缺`;

      badge.classList.remove(
        'hidden'
      );

    }else{

      badge.classList.add(
        'hidden'
      );

    }

  }

}

// KPI 樣式切換
function renderKpiActive(){

  const cards = {

    ALL:
      document.getElementById('kpiAllCard'),

    VACANCY:
      document.getElementById('kpiVacancyCard'),

    ASSIGNED:
      document.getElementById('kpiAssignedCard'),

    PENDING:
      document.getElementById('kpiPendingCard')

  };

  Object.values(cards).forEach(card => {

    if(!card) return;

    card.classList.remove(
      'ring-2',
      'ring-brand-500',
      'bg-brand-50'
    );

  });

  const activeCard =
    cards[currentKpiFilter];

  if(activeCard){

    activeCard.classList.add(
      'ring-2',
      'ring-brand-500',
      'bg-brand-50'
    );

  }

}

// 月份篩選
function renderMonthTabs(){

  const box =
    document.getElementById(
      'monthTabs'
    );

  if(!box) return;

  const months = [
    ...new Set(
      allGames.map(g => {

        const d = new Date(g.date);

        return d.getMonth() + 1;

      })
    )
  ].sort((a,b)=>a-b);

  box.innerHTML = `

    <button
      onclick="changeMonthFilter('ALL')"
      class="
      px-3 py-1 rounded-lg text-xs font-bold
      ${currentMonthFilter === 'ALL'
        ? 'bg-slate-900 text-white'
        : 'bg-slate-100'}
      ">

      全部

    </button>

    ${months.map(m=>`

      <button
        onclick="changeMonthFilter('${m}')"
        class="
        px-3 py-1 rounded-lg text-xs font-bold
        ${String(currentMonthFilter)===String(m)
          ? 'bg-slate-900 text-white'
          : 'bg-slate-100'}
        ">

        ${m}月

      </button>

    `).join('')}

  `;
}

// 證照等級
function getLevelLabel(level){

  const map = {
    A: 'A級裁判',
    B: 'B級裁判',
    C: 'C級裁判',
    N: '無證照'
  };

  return map[level] || '未分級';

}


function focusGameFromUrl(){

  const params =
    new URLSearchParams(
      location.search
    );

  const gameId =
    params.get('gameId');

  const role =
    params.get('role');

  if(!gameId){
    return;
  }

  setTimeout(()=>{

    const card =
      document.getElementById(
        `game-${gameId}`
      );

    if(!card){
      return;
    }

    card.scrollIntoView({
      behavior:'smooth',
      block:'center'
    });

    card.classList.add(
      'ring-4',
      'ring-amber-400'
    );

    setTimeout(()=>{

      card.classList.remove(
        'ring-4',
        'ring-amber-400'
      );

    },3000);

    if(role){
      openAssignJudge(
        gameId,
        role
      );
    }

  },300);

}
