/*********************************************************
 * Admin Dashboard V2
 *
 * 負責：
 * 1. Dashboard 初始化
 * 2. Header 載入
 * 3. Alert 區塊
 * 4. KPI 區塊
 * 5. 缺額賽事清單
 * 6. Sidebar
 * 7. Modal
 * 8. Toast
 * 9. 開啟快速指派
 *********************************************************/
/*********************************************************
 * 共用工具
 *********************************************************/

/* 全域變數定義 */
let quickAssignContext = null;

/* 格式化時間 */
function formatGameTime(time){

  if (!time) return '';

  if (
    typeof time === 'string' &&
    time.includes('T')
  ){

    const d = new Date(time);

    return d.toLocaleTimeString(
      'zh-TW',
      {
        hour:'2-digit',
        minute:'2-digit',
        hour12:false
      }
    );

  }
  return String(time).substring(0,5);
}

/* 管理頁登入驗證 */

function guardAdminPage(){

  const session = JSON.parse(localStorage.getItem('session_user') || '{}');
  
  if (!session.user_id){

    alert('尚未登入');

    location.replace(
      'login.html'
    );

    return false;

  }

  return true;

}

/*********************************************************
 * 初始化
 *********************************************************/
document.addEventListener('DOMContentLoaded', () => {

  guardAdminPage();

  const session =
    JSON.parse(
      localStorage.getItem('session_user') || '{}'
    );

  const userName =
    document.getElementById('sidebarUserName');

  const userRole =
    document.getElementById('sidebarUserRole');

  const avatar =
    document.getElementById('sidebarAvatar');

  const displayName =
    session.name ||
    session.user_name ||
    '未登入';

  if(userName){
    userName.textContent = displayName;
  }

  if(userRole){
    userRole.textContent =
      session.role || '-';
  }

  if(avatar){
    avatar.textContent =
      displayName.trim().charAt(0);
  }

  loadHeader();
  loadDashboard();

});

/*********************************************************
 * Header
 *********************************************************/
function loadHeader(){

  fetch('header.html')
    .then(res => res.text())
    .then(html => {

      const container =
        document.getElementById(
          'header-container'
        );

      if(container){
        container.innerHTML = html;
      }

      const session =
        typeof getSession === 'function'
          ? getSession()
          : null;

      document.body.classList.remove(
        'role-admin',
        'role-judge',
        'role-record'
      );

      if (
        session &&
        session.role
      ){

        const roles =
          session.role
            .split(',')
            .map(r => r.trim());

        if (
          roles.includes('admin')
        ){
          document.body.classList.add(
            'role-admin'
          );
        }

        if (
          roles.includes('judge') ||
          roles.includes('chief_judge')
        ){
          document.body.classList.add(
            'role-judge'
          );
        }

        if (
          roles.includes('record') ||
          roles.includes('record_chief')
        ){
          document.body.classList.add(
            'role-record'
          );
        }

      }

      if(window.lucide){
        lucide.createIcons();
      }

    })
    .catch(err => {
      console.error(
        'Header 載入失敗',
        err
      );
    });

}


/*********************************************************
 * Dashboard 主入口
 *********************************************************/
function loadDashboard(){

  callApi({
    action:'getAdminDashboardData'
  }, renderDashboard);

}

/*********************************************************
 * Dashboard Render
 *********************************************************/
function renderDashboard(data){

console.log(
  'GAME SAMPLE',
  data.games?.[0]
);
  
  if(
    !data ||
    data.result !== 'ok'
  ){

    console.error(
      'Dashboard API Error',
      data
    );

    showToast(
      'Dashboard 載入失敗'
    );

    return;

  }

  // ✅ 保存 Dashboard 資料
  window._dashboardData = data;
  // ✅ Alert
  renderAlerts(data);
  // ✅ 賽事 KPI
  renderMatchStats(data);
  // ✅ 人員 KPI
  renderPeopleStats(data);
  renderStaffStats(data);  // 個別 KPI
  // ✅ 缺額賽事
  renderVacancyGames(data);
  // ✅ Sidebar
  renderSidebar(data);
  renderWeeklyDutyBoard(data);  // 本週班表狀態清單

  // ✅ Lucide Icons 重新渲染
  if(window.lucide){
    lucide.createIcons();
  }

}


/*********************************************************
 * Alert 區塊
 *********************************************************/
function renderAlerts(data){

  const alerts =
    data.alerts || {};

  const judgeCount =
    alerts.judgeShortageGames || 0;

  const recordCount =
    alerts.recordShortageGames || 0;

  const pendingCount =
    alerts.noSignupCount || 0;

  setText(
    'alertJudgeCount',
    judgeCount
  );

  setText(
    'alertRecordCount',
    recordCount
  );

  setText(
    'alertPendingCount',
    pendingCount
  );

  const tag =
    document.getElementById(
      'recordStatusTag'
    );
  
  const text =
    document.getElementById(
      'recordStatusText'
    );
  
  const badge =
    document.getElementById(
      'recordStatusBadge'
    );
  
  if(
    !tag ||
    !text ||
    !badge
  ){
    return;
  }

  /*
  if(recordCount === 0){
  
    tag.textContent =
      '紀錄補齊';
  
    text.textContent =
      '（本週皆已完成派遣）';
  
    badge.innerHTML =
      '<i data-lucide="shield-check" class="w-3.5 h-3.5"></i>正常';
  
  }else{
  
    tag.textContent =
      '需補紀錄';
  
    badge.innerHTML =
      '<i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i>缺額';
  
  }
  */

}

/*********************************************************
 * Sidebar
 *********************************************************/
function renderSidebar(data){

  const alerts =
    data.alerts || {};

  const people =
    data.peopleStats || {};

  setText(
    'sidebarJudgeShortage',
    alerts.judgeShortageGames > 0
      ? `${alerts.judgeShortageGames} 缺額`
      : ''
  );

  setText(
    'sidebarRecordShortage',
    alerts.recordShortageGames > 0
      ? `${alerts.recordShortageGames} 缺額`
      : '額滿'
  );

  setText(
    'sidebarnoSignupCount',
    alerts.noSignupCount > 0
      ? `${alerts.noSignupCount} 待簽`
      : ''
  );

  setText(
    'sidebarUserCount',
    `${people.totalUsers || 0}帳號`
  );

}

/*********************************************************
 * 賽事 KPI
 *********************************************************/
function renderMatchStats(data){

  const stats =
    data.matchStats || {};

  const total =
    Number(stats.totalGames || 0);

  const completed =
    Number(stats.completedGames || 0);

  const pending =
    Number(stats.pendingGames || 0);

  const week =
    Number(stats.weekGames || 0);

  setText('totalGames', total);
  setText('completedGames', completed);
  setText('pendingGames', pending);
  setText('weekGames', week);

  const progress =
    total > 0
      ? Math.round(
          completed / total * 100
        )
      : 0;

  setText(
    'completedRate',
    `${progress}% 執行率`
  );

  setText(
    'seasonProgressText',
    `賽季進度：${progress}%`
  );

  const completedBar =
    document.getElementById('completedBar');

  const pendingBar =
    document.getElementById('pendingBar');

  const weekBar =
    document.getElementById('weekBar');

  if(completedBar){
    completedBar.style.width =
      `${progress}%`;
  }

  if(pendingBar){
    pendingBar.style.width =
      `${100 - progress}%`;
  }

  if(weekBar){

    const weekPercent =
      total
        ? Math.round(
            (week / total) * 100
          )
        : 0;

    weekBar.style.width =
      `${weekPercent}%`;
  }

}

/*********************************************************
 * 人員 KPI
 *********************************************************/
function renderPeopleStats(data){

  const stats =
    data.peopleStats || {};

  setText(
    'totalUsers',
    stats.totalUsers || 0
  );

  setText(
    'totalJudges',
    stats.totalJudges || 0
  );

  setText(
    'totalRecords',
    stats.totalRecords || 0
  );

  setText(
    'totalAdmins',
    stats.totalAdmins || 0
  );

}


/*********************************************************
 * 缺額賽事表格
 *********************************************************/
function renderVacancyGames(data){

  const games =
    data.vacancyGames || [];

  if(window.innerWidth < 768){

    renderVacancyCards(games);

  }else{

    renderVacancyTable(games);

  }

}

/*********************************************************
 * 缺額賽事表格　—　桌機版
 *********************************************************/
function renderVacancyTable(games){

  const tbody =
    document.getElementById(
      'vacancy-table-body'
    );

  const footer =
    document.getElementById(
      'vacancy-table-footer'
    );

  const countBox =
    document.getElementById(
      'vacancyGameCount'
    );

  if(!tbody){
    return;
  }

  if(!games.length){

    tbody.innerHTML = `
      <tr>
        <td colspan="6"
            class="text-center py-10 text-slate-400">
          ✅ 本週無缺額賽事
        </td>
      </tr>
    `;

    if(footer){
      footer.textContent =
        '本週無缺額賽事';
    }

    if(countBox){
      countBox.textContent =
        '共 0 場需補派';
    }

    return;
  }

  if(countBox){
    countBox.textContent =
      `共 ${games.length} 場待完成派遣`;
  }

  if(footer){
    footer.textContent =
      `顯示 ${games.length} 筆缺額賽事`;
  }

  tbody.innerHTML = games.map(g => {

  const judgeBadges =
    (g.missingJudge || [])
      .map(x => {
  
        const count = x.signupCount || 0;
  
        let colorClass =
          'border-rose-200 bg-rose-100 text-rose-700';
  
        if (count > 0 && count < 3) {
  
          colorClass =
            'border-amber-200 bg-amber-100 text-amber-700';
  
        } else if (count >= 3) {
  
          colorClass =
            'border-emerald-200 bg-emerald-100 text-emerald-700';
  
        }
  
        return `
          <button
            onclick="openJudgeAssignment('${g.game_id}','${x.code}')"
            class="inline-flex items-center rounded-lg border ${colorClass} hover:opacity-80 px-2 py-1 text-[11px] font-bold mr-1 mb-1 transition">
  
            ${x.name}(${count})
  
          </button>
        `;
  
      })
      .join('');

  const recordBadges =
    (g.missingRecord || [])
      .map(x => {
  
        const count = x.signupCount || 0;
  
        let colorClass =
          'border-rose-200 bg-rose-100 text-rose-700';
  
        if (count > 0 && count < 3) {
  
          colorClass =
            'border-amber-200 bg-amber-100 text-amber-700';
  
        } else if (count >= 3) {
  
          colorClass =
            'border-emerald-200 bg-emerald-100 text-emerald-700';
  
        }
  
        return `
          <button
            onclick="openRecordAssignment('${g.game_id}','${x.code}')"
            class="inline-flex items-center rounded-lg border ${colorClass} hover:opacity-80 px-2 py-1 text-[11px] font-bold mr-1 mb-1 transition">
  
            ${x.name}(${count})
  
          </button>
        `;
  
      })
      .join('');


    return `

      <tr class="hover:bg-slate-50 transition">

        <!-- 聯賽 -->
        <td class="py-3 px-4">

          <div class="font-bold text-slate-900">
            ${g.tournament || ''}
          </div>

          <div class="text-xs text-slate-500">
            ${g.game_code || ''}
          </div>

        </td>

        <!-- 時間 -->
        <td class="py-3 px-4">

          <div class="font-semibold text-slate-900">
            ${g.date || ''}
          </div>

          <div class="text-xs text-slate-500">
            ${g.time || ''}
          </div>

        </td>

        <!-- 對戰 -->
        <td class="py-3 px-4">

          <div class="font-bold text-slate-900">
            ${g.away_team || ''}
            <span class="mx-1 text-slate-400">
              vs
            </span>
            ${g.home_team || ''}
          </div>

        </td>

        <!-- 球場 -->
        <td class="py-3 px-4 text-slate-600">

          ${g.field || ''}

        </td>

        <!-- 缺額 -->
        <td class="py-3 px-4">

          <div class="flex flex-wrap">

            ${judgeBadges}

            ${recordBadges}

          </div>

        </td>

      </tr>

    `;

  }).join('');

}

/*********************************************************
 * 缺額賽事表格－手機版
 *********************************************************/
function renderVacancyCards(games){

  const container =
    document.getElementById(
      'vacancy-card-container'
    );

  const footer =
    document.getElementById(
      'vacancy-table-footer'
    );

  const countBox =
    document.getElementById(
      'vacancyGameCount'
    );

  if(!container){
    return;
  }

  if(!games.length){

    container.innerHTML = `
      <div class="text-center py-10 text-slate-400">
        ✅ 本週無缺額賽事
      </div>
    `;

    if(footer){
      footer.textContent =
        '本週無缺額賽事';
    }

    if(countBox){
      countBox.textContent =
        '共 0 場需補派';
    }

    return;
  }

  if(footer){
    footer.textContent =
      `顯示 ${games.length} 筆缺額賽事`;
  }

  if(countBox){
    countBox.textContent =
      `共 ${games.length} 場待完成派遣`;
  }

  container.innerHTML = games.map(g => {

    const judgeBadges =
      (g.missingJudge || [])
      .map(x => `

        <button
          onclick="openJudgeAssignment('${g.game_id}','${x.code}')"
          class="
            px-2.5
            py-1
            text-xs
            font-bold
            rounded-lg
            border
            border-rose-200
            bg-rose-50
            text-rose-700
          ">

          ${x.name}

        </button>

      `)
      .join('');

    const recordBadges =
      (g.missingRecord || [])
      .map(x => `

        <button
          onclick="openRecordAssignment('${g.game_id}','${x.code}')"
          class="
            px-2.5
            py-1
            text-xs
            font-bold
            rounded-lg
            border
            border-amber-200
            bg-amber-50
            text-amber-700
          ">

          ${x.name}

        </button>

      `)
      .join('');

    return `

      <div
        id="game-${g.game_id}"
        class="p-4 border-b border-slate-200">

        <!-- 比賽資訊 -->

        <div class="flex items-center gap-2 items-start">
        
          <div>
        
            <div class="text-base font-black text-slate-900">
              🕒 ${g.date || ''} ${g.time || ''}
            </div>
        
            <div class="text-sm text-slate-600 mt-1">
              📍 ${g.field || ''}
            </div>
        
          </div>
        
          <div class="text-right">
        
            <div class="text-xs text-slate-500">
              ${g.tournament || ''}
            </div>
        
            <div class="text-xs text-slate-400">
              ${g.game_code || ''}
            </div>
        
          </div>
        
        </div>
        
        <div class="mt-3 text-sm font-semibold text-slate-700">
        
          ${g.away_team || ''}
          <span class="text-slate-400 px-1">
            vs
          </span>
          ${g.home_team || ''}
        
        </div>

        <!-- 缺額 -->

        <div class="mt-4">

          <div class="
            text-xs
            font-bold
            text-slate-500
            mb-2">

            待派遣職位

          </div>

          <div class="
            flex
            flex-wrap
            gap-2">

            ${judgeBadges}
            ${recordBadges}

          </div>

        </div>

      </div>

    `;

  }).join('');

  lucide.createIcons();
}


/*********************************************************
 * Sidebar
 *********************************************************/
function toggleSidebar(){

  document
    .getElementById('sidebar')
    ?.classList
    .toggle('-translate-x-full');

  document
    .getElementById('sidebar-overlay')
    ?.classList
    .toggle('hidden');

}

/*********************************************************
 * Dashboard 快速指派
 *********************************************************/
function openAssignment(gameId){

  const games =
    window._dashboardData?.vacancyGames || [];

  const game =
    games.find(
      g => String(g.game_id) === String(gameId)
    );

  if(!game){

    showToast('找不到賽事資料');

    return;

  }

  document.getElementById(
    'modal-title'
  ).textContent =
    `快速指派｜${game.game_code}`;

  const judgeRoles =
    game.missingJudge || [];

  const recordRoles =
    game.missingRecord || [];

  document.getElementById(
    'modal-content'
  ).innerHTML = `

    <div class="space-y-4">

      <div>

        <div class="text-base font-bold text-slate-900">
          ${game.away_team}
          vs
          ${game.home_team}
        </div>

        <div class="text-sm text-slate-500">
          ${game.date}
          ${game.time}
        </div>

        <div class="text-sm text-slate-500">
          📍 ${game.field}
        </div>

      </div>

      <div>

        <div class="font-bold mb-2">
          缺額職務
        </div>

        <div class="flex flex-wrap gap-2">

          ${judgeRoles.map(role => `
            <button
              class="assign-role-btn bg-rose-100 text-rose-700 border border-rose-200 rounded-lg px-3 py-2 text-sm font-bold"
              onclick="openJudgeAssignment('${gameId}','${role.code}')">
          
              ${role.name}
          
            </button>
          `).join('')}

          ${recordRoles.map(role => `
            <button
              class="assign-role-btn bg-amber-100 text-amber-700 border border-amber-200 rounded-lg px-3 py-2 text-sm font-bold"
              onclick="openRecordAssignment('${gameId}','${role.code}')">
          
              ${role.name}
          
            </button>
          `).join('')}

        </div>

      </div>

      <div class="text-xs text-slate-500">

        點選缺額職務後，
        將自動跳往對應排班頁處理。

      </div>

    </div>

  `;

  document
    .getElementById('admin-modal')
    .classList
    .remove('hidden');

}

/*********************************************************
 * 前往排班頁
 *********************************************************/
function openJudgePage(gameId){

  closeModal();

  showToast(
    `請至排班頁處理 ${gameId}`
  );

  location.href =
    'judge_dashboard_admin.html';

}

/*********************************************************
 * 裁判指派
 *********************************************************/
window.openJudgeAssignment = function(
  gameId,
  role
){

  sessionStorage.setItem(
    'returnToDashboard',
    'Y'
  );

  location.href =
    `judge_dashboard_admin.html?gameId=${gameId}&role=${encodeURIComponent(role)}`;

};


/*********************************************************
 * 紀錄指派
 *********************************************************/
window.openRecordAssignment = function(
  gameId,
  role
){

  sessionStorage.setItem(
    'returnToDashboard',
    'Y'
  );

  location.href =
    `record_dashboard_admin.html?gameId=${gameId}&role=${encodeURIComponent(role)}`;

};

/*********************************************************
 * 複製場次代號
 *********************************************************/
function copyGameCode(code){

  navigator.clipboard
    .writeText(code)
    .then(() => {

      showToast(
        `已複製 ${code}`
      );

    });

}

/*********************************************************
 * 裁判 Dashboard 接 URL
 *********************************************************/
function getUrlParams(){

  const params =
    new URLSearchParams(
      location.search
    );

  return {
    gameId : params.get('gameId'),
    role   : params.get('role')
  };

}

/*********************************************************
 * Modal
 *********************************************************/
function showModal(title){

  setText(
    'modal-title',
    title
  );

  document
    .getElementById('admin-modal')
    ?.classList
    .remove('hidden');

}

function closeModal(){

  document
    .getElementById('admin-modal')
    ?.classList
    .add('hidden');

}

/*********************************************************
 * Toast
 *********************************************************/
function showToast(msg){

  const toast =
    document.getElementById(
      'toast'
    );

  if(!toast){
    return;
  }

  setText(
    'toast-msg',
    msg
  );

  toast.classList.remove(
    'translate-y-20',
    'opacity-0'
  );

  setTimeout(() => {

    toast.classList.add(
      'translate-y-20',
      'opacity-0'
    );

  },3000);

}

/*********************************************************
 * 共用工具
 *********************************************************/
function setText(id,value){

  const el =
    document.getElementById(id);

  if(el){
    el.textContent = value;
  }

}

/*********************************************************
 * RWD 自動切換
 *********************************************************/
window.addEventListener('resize', () => {

  if(window._dashboardData){

    renderVacancyGames(
      window._dashboardData
    );

  }

});

/*********************************************************
 * ?????????
 *********************************************************/
function focusGameFromUrl(){

  if(autoAssignOpened){
    return;
  }

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

  autoAssignOpened = true;

  setTimeout(()=>{

    const card =
      document.getElementById(
        `game-${gameId}`
      );

    if(card){

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

    }

    if(role){

      openAssignJudge(
        gameId,
        role
      );

    }

    history.replaceState(
      {},
      '',
      location.pathname
    );

  },300);

}

// 統計各席位個別數字
function renderStaffStats(data){

  const s = data.staffStats || {};

  const judge = s.judge || {};
  const record = s.record || {};

  const judgeTable =
    document.getElementById(
      'judgeStaffTable'
    );

  if(judgeTable){

    judgeTable.innerHTML = `
      ${buildRow('主審', judge.PU)}
      ${buildRow('一壘', judge.U1)}
      ${buildRow('二壘', judge.U2)}
      ${buildRow('三壘', judge.U3)}
    `;

  }

  const recordTable =
    document.getElementById(
      'recordStaffTable'
    );

  if(recordTable){

    recordTable.innerHTML = `
      ${buildRow('紀錄', record.REC_MAIN)}
      ${buildRow('見習', record.REC_TRAINEE)}
      ${buildRow('影像', record.REC_VIDEO)}
    `;

  }

  const summary =
    document.getElementById(
      'summaryStaffTable'
    );

  if(summary){

    summary.innerHTML = `
      ${buildRow('裁判', s.judgeSummary)}
      ${buildRow('紀錄', s.recordSummary)}
    `;

  }
  
  const judgeVacancy =
    s.judgeSummary?.vacancy || 0;
  
  const recordVacancy =
    s.recordSummary?.vacancy || 0;
  
  const totalVacancy =
    judgeVacancy + recordVacancy;
  
  setText(
    'totalVacancy',
    totalVacancy
  );
  
  const required =
    (s.judgeSummary?.required || 0)
    +
    (s.recordSummary?.required || 0);
  
  const assigned =
    (s.judgeSummary?.assigned || 0)
    +
    (s.recordSummary?.assigned || 0);
  
  const fillRate =
    required
      ? Math.round(
          assigned / required * 100
        )
      : 0;
  
  setText(
    'staffFillRate',
    `${fillRate}%`
  );
  
  const bar =
    document.getElementById(
      'staffFillRateBar'
    );
  
  if(bar){
  
    bar.style.width =
      `${fillRate}%`;
  
  }
  
  const judgeBadge =
    document.getElementById(
      'judgeStatusBadge'
    );
  
  if(judgeBadge){
  
    judgeBadge.textContent =
      judgeVacancy === 0
        ? '✅ 已補齊'
        : `缺 ${judgeVacancy} 席`;
  
  }
  
  const recordBadge =
    document.getElementById(
      'recordStatusBadge2'
    );
  
  if(recordBadge){
    recordBadge.textContent =
      recordVacancy === 0
        ? '✅ 已補齊'
        : `🚨 缺 ${recordVacancy} 席`;
  }

  setText(
    'judgeTotalRequired',
    s.judgeSummary?.required || 0
  );
  
  setText(
    'judgeTotalAssigned',
    s.judgeSummary?.assigned || 0
  );
  
  setText(
    'judgeTotalSignup',
    s.judgeSummary?.signup || 0
  );
  
  setText(
    'judgeTotalVacancy',
    s.judgeSummary?.vacancy || 0
  );
  
  setText(
    'recordTotalRequired',
    s.recordSummary?.required || 0
  );
  
  setText(
    'recordTotalAssigned',
    s.recordSummary?.assigned || 0
  );
  
  setText(
    'recordTotalSignup',
    s.recordSummary?.signup || 0
  );
  
  setText(
    'recordTotalVacancy',
    s.recordSummary?.vacancy || 0
  );
    
}

function formatStat(stat){

  if(!stat){
    return '0/0/0/0';
  }

  return [
    stat.required || 0,
    stat.assigned || 0,
    stat.signup || 0,
    stat.vacancy || 0
  ].join('/');

}

function vacancyCell(v){

  if(v <= 0){

    return `
      <span class="
        px-2 py-0.5
        rounded-full
        bg-emerald-100
        text-emerald-700
        text-xs font-bold">
        0
      </span>
    `;

  }

  if(v <= 3){

    return `
      <span class="
        px-2 py-0.5
        rounded-full
        bg-amber-100
        text-amber-700
        text-xs font-bold">
        ${v}
      </span>
    `;

  }

  return `
    <span class="
      px-2 py-0.5
      rounded-full
      bg-rose-100
      text-rose-700
      text-xs font-bold">
      ${v}
    </span>
  `;
}


function buildRow(name, stat){

  stat = stat || {};

  const vacancy =
    Number(stat.vacancy || 0);

  let vacancyBadge = '';

  if(vacancy === 0){

    vacancyBadge = `
      <span class="
        inline-flex items-center justify-center
        min-w-[28px]
        px-2 py-0.5
        rounded-full
        bg-emerald-100
        text-emerald-700
        text-xs font-bold">
        0
      </span>
    `;

  }else if(vacancy <= 3){

    vacancyBadge = `
      <span class="
        inline-flex items-center justify-center
        min-w-[28px]
        px-2 py-0.5
        rounded-full
        bg-amber-100
        text-amber-700
        text-xs font-bold">
        ${vacancy}
      </span>
    `;

  }else{

    vacancyBadge = `
      <span class="
        inline-flex items-center justify-center
        min-w-[28px]
        px-2 py-0.5
        rounded-full
        bg-rose-100
        text-rose-700
        text-xs font-bold">
        ${vacancy}
      </span>
    `;

  }

  return `

    <tr class="hover:bg-black/5">

      <td class="py-1 font-semibold">
        ${name}
      </td>

      <td class="text-center">
        ${stat.required || 0}
      </td>

      <td class="text-center">
        ${stat.assigned || 0}
      </td>

      <td class="text-center">
        ${stat.signup || 0}
      </td>

      <td class="text-center">
        ${vacancyBadge}
      </td>

    </tr>

  `;
}

function renderWeeklyDutyBoard(data){

  const title =
    document.getElementById(
      'weeklyBoardTitle'
    );

  if(title){

    title.textContent =
      getBoardTitle()
        .replace(
          '待補派看板',
          '派遣班表'
        );

  }

  const board =
    document.getElementById(
      'weeklyDutyBoard'
    );

  if(!board){
    return;
  }

  const games =
    data.vacancyGames || [];

  if(!games.length){

    board.innerHTML = `
      <div class="text-emerald-400 text-sm">
        ✅ 本週無賽事
      </div>
    `;

    return;

  }

  const isMobile =
    window.innerWidth < 768;

  const sortedGames =
    [...games].sort((a,b)=>{

      const aKey =
        `${a.date || ''} ${a.time || ''}`;

      const bKey =
        `${b.date || ''} ${b.time || ''}`;

      return aKey.localeCompare(bKey);

    });

  // 顯示姓名
  function shortName(obj){
  
    if(!obj){
      return '-';
    }
  
    if(typeof obj === 'string'){
      return obj;
    }
  
    if(obj.name){
      return obj.name;
    }
  
    return '-';
  
  }

  // ==========================
  // 手機版
  // ==========================

  if(isMobile){

    board.innerHTML =
      sortedGames.map(g => {

        return `

          <div
            class="
              py-2
              border-b
              border-white/10
            "
          >

            <div
              class="
                text-white
                font-bold
                text-xs
              "
            >
              ${g.time || ''}　
              ${g.field || ''}
            </div>

            ${renderMobileDuty(g)}

          </div>

        `;

      }).join('');

    return;

  }

  // ==========================
  // 桌機版
  // ==========================

  const fieldGroups = {};

  sortedGames.forEach(g => {

    const field =
      g.field || '未設定場地';

    if(!fieldGroups[field]){
      fieldGroups[field] = [];
    }

    fieldGroups[field].push(g);

  });

  board.innerHTML =
    Object.entries(fieldGroups)
      .map(([field,fieldGames]) => {

        const rows =
          fieldGames.map(g => {

            return `

              <tr
                class="
                  border-b
                  border-white/10
                  hover:bg-white/5
                "
              >

                <td
                  class="
                    py-1.5
                    px-1
                    whitespace-nowrap
                  "
                >
                  ${g.time || ''}
                </td>

                <td
                  class="
                    py-1.5
                    px-1
                    text-amber-300
                    font-bold
                    whitespace-nowrap
                  "
                >
                  ${g.game_code || ''}
                </td>

                <td class="text-center px-2">
                  ${renderDutyCell(g.judges?.PU)}
                </td>
                
                <td class="text-center px-2">
                  ${renderDutyCell(g.judges?.U1)}
                </td>
                
                <td class="text-center px-2">
                  ${
                    Number(g.umpire_count) >= 4
                      ? renderDutyCell(g.judges?.U2)
                      : ''
                  }
                </td>
                
                <td class="text-center px-2">
                  ${
                    Number(g.umpire_count) >= 3
                      ? renderDutyCell(g.judges?.U3)
                      : ''
                  }
                </td>
                
                <td class="text-center px-2">
                  ${renderDutyCell(g.records?.REC_MAIN)}
                </td>
                
                <td class="text-center px-2">
                  ${renderDutyCell(g.records?.REC_TRAINEE)}
                </td>
                
                <td class="text-center px-2">
                  ${renderDutyCell(g.records?.REC_VIDEO)}
                </td>


              </tr>

            `;

          })
          .join('');

        return `

          <div class="mb-3">

            <div
              class="
                sticky
                top-0
                z-10
                bg-slate-900
                text-amber-300
                font-black
                text-sm
                py-2
                px-2
                rounded-md
                border-l-4
                border-amber-400
                mb-1
                mt-2
              "
            >
              【${field}】
            </div>

            <table
              class="
                w-full
                text-[11px]
                text-white
              "
            >

              <thead>

                <tr
                  class="
                    text-slate-400
                    border-b
                    border-white/10
                  "
                >

                  <th class="w-[70px]">
                  時間
                  </th>
                  
                  <th class="w-[90px]">
                  場次
                  </th>
                  
                  <th class="w-[130px]">
                  主審
                  </th>
                  
                  <th class="w-[130px]">
                  一壘
                  </th>
                  
                  <th class="w-[130px]">
                  二壘
                  </th>
                  
                  <th class="w-[130px]">
                  三壘
                  </th>
                  
                  <th class="w-[150px]">
                  紀錄
                  </th>
                  
                  <th class="w-[120px]">
                  實習
                  </th>
                  
                  <th class="w-[120px]">
                  影像
                  </th>

                </tr>

              </thead>

              <tbody>

                ${rows}

              </tbody>

            </table>

          </div>

        `;

      })
      .join('');

}

function shortName(name){

  if(!name){
    return '缺';
  }

  return String(name)
    .trim()
    .substring(0,1);

}

function dutyBadge(
  title,
  name
){

  const missing =
    !name;

  return `
    <span
      class="
        inline-flex
        items-center
        px-1.5
        py-0.5
        rounded
        text-[10px]
        font-black
        ${
          missing
            ? 'bg-rose-500 text-white'
            : 'bg-emerald-400 text-black'
        }
      "
    >
      ${title}${shortName(name)}
    </span>
  `;

}

function getDutyName(
  game,
  roleCode
){

  const assignments =
    game.assignments || [];

  const duty =
    assignments.find(
      x =>
        x.role_code === roleCode
    );

  return duty?.name || '';

}

// 顯示裁判需求
function getJudgePositions(count){

  switch(Number(count || 0)){

    case 1:
      return [
        { code:'PU', label:'主' }
      ];

    case 2:
      return [
        { code:'PU', label:'主' },
        { code:'U1', label:'一' }
      ];

    case 3:
      return [
        { code:'PU', label:'主' },
        { code:'U1', label:'一' },
        { code:'U3', label:'三' }
      ];

    case 4:
      return [
        { code:'PU', label:'主' },
        { code:'U1', label:'一' },
        { code:'U2', label:'二' },
        { code:'U3', label:'三' }
      ];

    default:
      return [
        { code:'PU', label:'主' }
      ];
  }

}

// 紀錄組需求
function getRecordPositions(game){

  const positions = [
    {
      code:'REC_MAIN',
      label:'紀'
    }
  ];

  if(
    game.need_trainee ||
    game.record_count >= 2
  ){

    positions.push({
      code:'REC_TRAINEE',
      label:'實'
    });

  }

  if(
    game.need_video ||
    game.record_count >= 3
  ){

    positions.push({
      code:'REC_VIDEO',
      label:'影'
    });

  }

  return positions;

}

// 前端日期顯示
function getBoardTitle() {

  const games =
    window._dashboardData?.vacancyGames || [];

  if (!games.length) {
    return '本週待補派看板';
  }

  const firstDate =
    games
      .map(g => g.date)
      .filter(Boolean)
      .sort()[0];

  return `本週（${firstDate}）待補派看板`;
}

// 席位改燈號
function buildDutyBadge(
  name,
  missing
){

  return `
    <span class="
      inline-flex
      items-center
      justify-center
      w-[15px]
      h-[15px]
      rounded
      text-[9px]
      leading-none
      font-black
      ${
        missing
          ? 'bg-rose-500 text-yellow-200'
          : 'bg-emerald-400 text-black'
      }
    ">
      ${name}
    </span>
  `;
}

// 產生班表資料
function buildRosterData(){

  console.log(
    '_dashboardData',
    window._dashboardData
  );

  const data =
    window._dashboardData || {};

  // 優先抓完整賽事
  if(
    Array.isArray(data.games) &&
    data.games.length
  ){
    return data.games;
  }

  // 次選抓本週班表資料
  if(
    Array.isArray(data.weeklyGames) &&
    data.weeklyGames.length
  ){
    return data.weeklyGames;
  }

  // 最後才退回缺額賽事
  return data.vacancyGames || [];

}


// 產生班表資料 - 預覽
function showRosterPreview(){

  const html =
    buildRosterHtml(true);

  document.getElementById(
    'rosterPrintArea'
  ).innerHTML = html;

  document
    .getElementById(
      'rosterPreviewModal'
    )
    .classList
    .remove('hidden');

}

function buildRosterHtml(isPreview = true){

  const games = [...buildRosterData()];

  const tableWidth = '1100px';

  if(!games.length){

    return `
      <div class="p-10 text-center">
        無賽事資料
      </div>
    `;

  }

  const date =
    games[0]?.date || '';

  function renderName(value){

    if(!value){

      return `
        <span style="
          color:#dc2626;
          font-weight:800;
        ">
          缺
        </span>
      `;

    }

    return `
      <span style="
        font-weight:600;
      ">
        ${value}
      </span>
    `;

  }

  const groups = {};

  games.forEach(game => {

    const tournament =
      game.tournament ||
      game.league ||
      '未分類賽事';

    if(!groups[tournament]){
      groups[tournament] = [];
    }

    groups[tournament].push(game);

  });

  let sections = '';

  Object.keys(groups)
    .sort()
    .forEach(tournament => {

      const rows =
        groups[tournament]
          .sort((a,b)=>{

            return (
              a.time || ''
            ).localeCompare(
              b.time || ''
            );

          })
          .map(game => {

            return `

              <tr>

                <td style="
                  text-align:center;
                  padding:4px;
                ">
                  ${game.time || ''}
                </td>

                <td style="
                  text-align:center;
                  padding:4px;
                  font-weight:700;
                  color:#2563eb;
                ">
                  ${game.game_code || ''}
                </td>

                <td style="
                  text-align:center;
                  padding:4px;
                ">
                  ${game.category || ''}
                </td>

                <td style="
                  text-align:center;
                  padding:4px;
                ">
                  ${game.away_team || ''}
                  vs
                  ${game.home_team || ''}
                </td>

                <td style="
                  text-align:center;
                  padding:4px;
                ">
                  ${game.field || ''}
                </td>

                <td style="text-align:center;">
                  ${renderName(getJudgeName(game,'PU'))}
                </td>

                <td style="text-align:center;">
                  ${renderName(getJudgeName(game,'U1'))}
                </td>

                <td style="text-align:center;">
                  ${
                    Number(game.umpire_count) >= 4
                      ? renderName(
                          getJudgeName(game,'U2')
                        )
                      : '-'
                  }
                </td>

                <td style="text-align:center;">
                  ${
                    Number(game.umpire_count) >= 3
                      ? renderName(
                          getJudgeName(game,'U3')
                        )
                      : '-'
                  }
                </td>

                <td style="text-align:center;">
                  ${renderName(
                    getRecordName(
                      game,
                      'REC_MAIN'
                    )
                  )}
                </td>

                <td style="text-align:center;">
                  ${renderName(
                    getRecordName(
                      game,
                      'REC_TRAINEE'
                    )
                  )}
                </td>

                <td style="text-align:center;">
                  ${renderName(
                    getRecordName(
                      game,
                      'REC_VIDEO'
                    )
                  )}
                </td>

              </tr>

            `;

          })
          .join('');

      sections += `

        <div style="
          margin-bottom:20px;
        ">

          <div style="
            background:#1e293b;
            color:#fff;
            font-size:18px;
            font-weight:800;
            padding:10px 14px;
            border-radius:8px;
            margin-bottom:8px;
          ">
            ${tournament}
          </div>

          <table
            style="
              width:100%;
              border-collapse:collapse;
              table-layout:fixed;
              font-size:14px;
            "
          >

            <thead>

              <tr
                style="
                  background:#e2e8f0;
                  font-weight:800;
                "
              >

                <th style="width:60px;">時間</th>
                <th style="width:80px;">場次</th>
                <th style="width:80px;">組別</th>
                <th style="width:220px;">對戰</th>
                <th style="width:110px;">場地</th>

                <th style="width:70px;">主審</th>
                <th style="width:70px;">一壘</th>
                <th style="width:70px;">二壘</th>
                <th style="width:70px;">三壘</th>

                <th style="width:70px;">紀錄</th>
                <th style="width:70px;">實習</th>
                <th style="width:70px;">影像</th>

              </tr>

            </thead>

            <tbody>

              ${rows}

            </tbody>

          </table>

        </div>

      `;

    });

  return `

    <div
      id="rosterExportBlock"
      style="
        width:${tableWidth};
        background:#fff;
        color:#000;
        padding:24px;
        margin:0 auto;
      "
    >

      <div
        style="
          display:flex;
          justify-content:center;
          align-items:center;
          gap:20px;
          margin-bottom:24px;
        "
      >

        <img
          src="img/bbtlogo.png"
          alt="BBT"
          style="
            width:90px;
            height:auto;
          "
        >

        <div>

          <div
            style="
              font-size:34px;
              font-weight:900;
            "
          >
            BBT 裁判暨紀錄班表
          </div>

          <div
            style="
              margin-top:6px;
              font-size:20px;
              font-weight:600;
              color:#475569;
            "
          >
            日期：${date}
          </div>

        </div>

      </div>

      ${sections}

      <div
        style="
          margin-top:24px;
          color:#475569;
          line-height:2;
          font-size:14px;
        "
      >

        <div
          style="
            font-weight:800;
            margin-bottom:8px;
          "
        >
          注意事項
        </div>

        <div>
          1. 如有無法出席情形，請立即通知聯盟調度。
        </div>

        <div>
          2. 請於開賽前 30 分鐘完成報到。
        </div>

        <div>
          3. 如遇天候因素，以聯盟公告為準。
        </div>

      </div>

    </div>

  `;

}

// 產出班表資料 - 
async function exportRosterImage(){

  const html = buildRosterHtml(false);
  const target =
    document.getElementById(
      'rosterExportBlock'
    );

  if(!target){
    return;
  }

  showToast('產生圖檔中...');

  const canvas =
    await html2canvas(
      target,
      {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff'
      }
    );

  const link =
    document.createElement('a');

  const date =
    buildRosterData()[0]?.date
      ?.replaceAll('/','-')
      || 'roster';

  link.download =
    `BBT聯盟裁判／紀錄班表_${date}.png`;

  link.href =
    canvas.toDataURL(
      'image/png'
    );

  link.click();

  showToast('班表圖檔已下載');

}

// 產生班表資料 - 列印功能
function printRoster(){

  const content =
    document.getElementById(
      'rosterExportBlock'
    ).innerHTML;

  const win =
    window.open(
      '',
      '_blank'
    );

  win.document.write(`
    <html>
      <head>
        <title>
          BBT聯盟裁判／紀錄班表
        </title>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `);

  win.document.close();

  setTimeout(()=>{
    win.print();
  },500);

}

// 產生班表資料 - 關閉視窗
function closeRosterPreview(){

  document
    .getElementById(
      'rosterPreviewModal'
    )
    ?.classList
    .add('hidden');

}

function getJudgeName(game, role){

  const v = game?.judges?.[role];

  if(typeof v === 'string'){
    return v;
  }

  if(v?.name){
    return v.name;
  }

  return '';
}


function getRecordName(game, role){

  const v = game?.records?.[role];

  if(typeof v === 'string'){
    return v;
  }

  if(v?.name){
    return v.name;
  }

  return '';
}


function buildRosterBadge(
  title,
  name
){

  const hasName =
    Boolean(name);

  return `
    <span
      class="
        inline-flex
        items-center
        px-1.5
        py-0.5
        rounded
        text-[10px]
        font-black
        ${
          hasName
            ? 'bg-emerald-400 text-black'
            : 'bg-rose-500 text-white'
        }
      "
    >
      ${title}${hasName ? name.substring(0,1) : '缺'}
    </span>
  `;

}

// 統一席位
function getDutyStatus(value){
  if(!value || value === '-' || value === ''){
    return false;
  }
  return true;
}

// 缺額呈現
function renderDutyCell(value){

  let name = '';

  if(typeof value === 'string'){
    name = value;
  }else if(value?.name){
    name = value.name;
  }

  if(name){

    return `
      <span class="text-amber-300 font-semibold">
        ${name}
      </span>
    `;

  }

  return `
    <span class="
      inline-flex
      items-center
      justify-center
      px-2
      py-0.5
      rounded
      bg-red-600
      text-yellow-200
      text-[10px]
      font-black
    ">
      缺
    </span>
  `;
}

// Badge Renderer - 手機版
function renderMobileDuty(game){

  const items = [
    ['主', game.judges?.PU],
    ['一', game.judges?.U1]
  ];

  if(Number(game.umpire_count) >= 4){
    items.push(['二', game.judges?.U2]);
  }

  if(Number(game.umpire_count) >= 3){
    items.push(['三', game.judges?.U3]);
  }

  items.push(
    ['記', game.records?.REC_MAIN],
    ['實', game.records?.REC_TRAINEE],
    ['影', game.records?.REC_VIDEO]
  );

  return `
    <div class="flex flex-wrap gap-1 mt-2">

      ${items.map(([label,val])=>`

        <span class="
          px-2
          py-0.5
          rounded
          text-[10px]
          font-black
          ${
            val
              ? 'bg-emerald-500 text-white'
              : 'bg-red-600 text-yellow-200'
          }
        ">
          ${label}${val ? '✓' : '缺'}
        </span>

      `).join('')}

    </div>
  `;
}
