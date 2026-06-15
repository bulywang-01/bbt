/*********************************************************
 * ✅ Index Page（最終整合版）
 *********************************************************/

let session = null;


/*********************************************************
 * ✅ 主入口
 *********************************************************/
document.addEventListener('DOMContentLoaded', () => {

  // ✅ API 檢查
  if (typeof API_BASE === 'undefined'){
    alert('系統錯誤：API設定未載入');
    return;
  }

  // ✅ 登入
  session = initAuth();
  if (!session) return;

  // ✅ Header
  if (window.initHeader){
    initHeader();
  }

  // ✅ Welcome（你原本的）
  renderWelcome();

  // ✅ 綁按鈕（🔥 修你紅框沒反應）
  bindButtons();

  // ✅ 載入統計
  loadDashboard();

  // ✅ 載入本週出勤提醒
  loadWeeklyReminder();
  
  // ✅ 截入個人數據分析
  loadHomeUserAnalysis();

});


/*********************************************************
 * ✅ Welcome（保留你原本）
 *********************************************************/
function renderWelcome(){

  const roleMap = {
    admin:'系統管理員',
    chief_judge:'裁判長',
    record_chief:'紀錄長',
    judge:'裁判員',
    record:'紀錄員'
  };

  const nameEl = document.getElementById('welcome-name');
  const roleEl = document.getElementById('welcome-role');

  if (nameEl){
    nameEl.textContent =
      session.name + ' 您好，歡迎使用出勤管理系統';
  }

  if (roleEl){
    roleEl.textContent =
      (session.role || '')
        .split(',')
        .map(r => roleMap[r])
        .filter(Boolean)
        .join('／');
  }
}


/*********************************************************
 * ✅ 綁按鈕（🔥 你壞掉的關鍵）
 *********************************************************/
function bindButtons(){

  document.getElementById('open-schedule')?.addEventListener('click', openMySchedule);
  document.getElementById('open-weekly')?.addEventListener('click', openWeeklySchedule);

  document.getElementById('open-league')?.addEventListener('click', () => {
    document.getElementById('league-overlay').style.display = 'flex';
  });

  document.getElementById('open-rules')?.addEventListener('click', () => {
    document.getElementById('rules-overlay').style.display = 'flex';
  });
}

/*********************************************************
 * ✅ 首頁歡迎及出勤提示
 *********************************************************/
function loadWeeklyReminder(){

  const el = document.getElementById('welcome-alert');
  if (!el || !session) return;

  callApi({
    action:'getSignableGames',
    user_id: session.user_id
  }, res => {

    if (!res || res.result !== 'ok') return;

    const games = (res.games || []).map(safeMerge);

    const now = new Date();
    const day = now.getDay() === 0 ? 7 : now.getDay();

    const monday = new Date(now);
    monday.setDate(now.getDate() - (day - 1));
    monday.setHours(0,0,0,0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23,59,59,999);

    // 我的班表
    const weekGames = games.filter(g => {
    
      const hasWork =
        g.my_position ||
        Object.values(g.judges||{}).includes(session.name) ||
        Object.values(g.records||{}).includes(session.name);
    
      if (!hasWork) return false;
    
      const d = parseDate(g.date);
    
      const inWeek = d >= monday && d <= sunday;
    
      // ✅ ✅ ✅ 關鍵：只算「未來」
      const isFuture = d >= now;
    
      return inWeek && isFuture;
    });


    if (weekGames.length){

      el.innerHTML = `
        <div class="week-alert" onclick="openMySchedule()">
          <div class="icon">🔔</div>
          <div class="text">
            本週有 ${weekGames.length} 場出勤（點擊查看）
          </div>
          <div class="arrow">›</div>
        </div>
      `;

    } else {
      el.innerHTML = '';
    }

  });
}


/*********************************************************
 * ✅ Dashboard
 *********************************************************/
function loadDashboard(){

  callApi({
    action:'getSignableGames',
    user_id: session.user_id
  }, res => {

    if (!res || res.result !== 'ok') return;

    const games = (res.games || []).map(safeMerge);
    
    const s = session;
    
    games.forEach(g => {
    
      if (g.judges){
        for (let [role, val] of Object.entries(g.judges)){
          if (isMySlot(val, s)){
            g.my_position = role;
          }
        }
      }
    
      if (g.records){
        for (let [role, val] of Object.entries(g.records)){
          if (isMySlot(val, s)){
            g.my_position = role;
          }
        }
      }
    
    });

    const today = new Date();

    let judgeDone = 0;
    let judgeFuture = 0;
    let recordDone = 0;
    let recordFuture = 0;

    games.forEach(g => {

    const hasWork =
      g.my_position ||
      g.judges?.PU === session.name ||
      g.judges?.U1 === session.name ||
      g.judges?.U2 === session.name ||
      g.judges?.U3 === session.name ||
      g.records?.REC_MAIN === session.name ||
      g.records?.REC_TRAINEE === session.name ||
      g.records?.REC_VIDEO === session.name;
    
    if (!hasWork) return;
          
      const d = new Date(g.date);

      const isRecord = g.my_position.startsWith('REC');

      if (d < today){
        isRecord ? recordDone++ : judgeDone++;
      } else {
        isRecord ? recordFuture++ : judgeFuture++;
      }
    });

    /************* ✅ ✅ ✅ 核心修正 *************/
    // 👉 主數字 = 已完成（不是總數）

    document.getElementById('stat-judge').textContent = judgeDone;
    document.getElementById('stat-record').textContent = recordDone;
    document.getElementById('stat-total').textContent =
      judgeDone + recordDone;

    /************* ✅ 子數據 *************/
    document.getElementById('stat-judge-sub').textContent =
      `生 ${judgeDone}　預 ${judgeFuture}`;

    document.getElementById('stat-record-sub').textContent =
      `生 ${recordDone}　預 ${recordFuture}`;

    document.getElementById('stat-total-sub').textContent =
      `生 ${judgeDone + recordDone}　預 ${judgeFuture + recordFuture}`;
  });
}

function loadHomeGames(){

  callApi({
    action:'getSignableGames',
    user_id: session.user_id
  }, res => {

    if (!res || res.result !== 'ok'){
      console.log('❌ 首頁 API 失敗');
      return;
    }

    // ✅ ✅ ✅ 關鍵兩步
    games = (res.games || []).map(safeMerge);

    console.log('📦 首頁 games:', games);

    // ✅ ✅ ✅ 呼叫首頁 render
    renderHome();

  });
}

/*********************************************************
 * ✅ 時間格式
 *********************************************************/
function parseDate(str){
  if (!str) return null;

  // ✅ 統一 yyyy/mm/dd
  const s = str.replace(/-/g,'/');
  const d = new Date(s);

  return isNaN(d) ? null : d;
}


/*********************************************************
 * ✅ 裁判統計
 *********************************************************/
function loadJudgeCount(){

  callApi({
    action: 'getJudgeGamesByMonth',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    user_id: session.user_id
  }, res => {

    console.log('裁判API:', res);   // ✅ debug

    const el = document.getElementById('stat-judge');

    if (!res || res.result !== 'ok'){
      el.textContent = '--';
      return;
    }

    el.textContent = (res.games || []).length;
  });
}


/*********************************************************
 * ✅ 紀錄統計
 *********************************************************/
function loadRecordCount(){

  callApi({
    action: 'getRecordGamesByMonth',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    user_id: session.user_id
  }, res => {

    const el = document.getElementById('stat-record');

    if (!res || res.result !== 'ok'){
      el.textContent = '--';
      return;
    }

    el.textContent = (res.games || []).length;
  });
}


/*********************************************************
 * ✅ 年度統計
 *********************************************************/
function loadYearStats(){

  callApi({
    action: 'getSignableGames',
    user_id: session.user_id
  }, res => {

    const el = document.getElementById('stat-total');

    if (!res || res.result !== 'ok'){
      el.textContent = '--';
      return;
    }

    let count = 0;

    (res.games || []).forEach(g=>{
      if (g.my_position) count++;
    });

    el.textContent = count;
  });
}


/*********************************************************
 * ✅ ✅ ✅ 我的班表（純顯示）
 *********************************************************/
function openMySchedule(){

  const overlay = document.getElementById('schedule-overlay');
  const list = document.getElementById('my-schedule-list');

  if (overlay) overlay.style.display = 'flex';
  if (!list) return;

  renderLoading(list);

  callApi({
    action:'getSignableGames',
    user_id: session.user_id
  }, res => {

    if (!res || res.result !== 'ok'){
      list.innerHTML = '載入失敗';
      return;
    }

    // ✅ ✅ ✅ 一定要 merge
    const games = (res.games || []).map(safeMerge);
    
    // ✅ ✅ ✅ 👉 插這裡（關鍵）
    const s = getSession ? getSession() : session;
    
    games.forEach(g => {
    
      // ✅ 裁判
      if (g.judges){
        for (let [role, val] of Object.entries(g.judges)){
          if (isMySlot(val, s)){
            g.my_position = role;
          }
        }
      }
    
      // ✅ 紀錄（🔥 你現在缺的）
      if (g.records){
        for (let [role, val] of Object.entries(g.records)){
          if (isMySlot(val, s)){
            g.my_position = role;
          }
        }
      }
    
    });
        
    const today = new Date();
    today.setHours(0,0,0,0);

    // ✅ ✅ ✅ 正確 filter
    const myGames = games.filter(g=>{

      // ✅ 是否屬於我
      const isMine =
        g.my_position ||
        Object.values(g.judges||{}).includes(session.name) ||
        Object.values(g.records||{}).includes(session.name);

      if (!isMine) return false;

      // ✅ 只看今天之後（含今天）
      const d = parseDate(g.date);
      return d && d >= today;

    });

    if (!myGames.length){
      list.innerHTML = '目前沒有未來班表';
      return;
    }

    // ✅ ✅ ✅ 排序（安全）
    myGames.sort((a,b)=>{
      return new Date(a.date + ' ' + (a.time||'00:00'))
           - new Date(b.date + ' ' + (b.time||'00:00'));
    });

    // list.innerHTML = myGames.map(renderGameCard).join('');

    list.innerHTML = myGames.map(g => {
    
      const type = g.my_position?.startsWith('REC')
        ? 'record'
        : 'judge';
    
      return renderGameCard(g,{
        session,
        type,
        mode:'view'
      });
    
    }).join('');

    setGameCache(myGames);
  });
}

/*********************************************************
 * ✅ ✅ ✅ 本週班表（純顯示）
 *********************************************************/

function openWeeklySchedule(){

  const overlay = document.getElementById('weekly-overlay');
  const content = document.getElementById('weeklyContent');

  if (overlay) overlay.style.display = 'flex';
  if (!content) return;

  renderLoading(content);

  callApi({
    action:'getSignableGames',
    user_id: session.user_id
  }, res => {

    if (!res || res.result !== 'ok'){
      content.innerHTML = '載入失敗';
      return;
    }

    const games = res.games || [];

    /************* ✅ 本週範圍 *************/
    const now = new Date();
    const day = now.getDay() === 0 ? 7 : now.getDay();

    const monday = new Date(now);
    monday.setDate(now.getDate() - (day - 1));
    monday.setHours(0,0,0,0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23,59,59,999);

    const weekGames = games.filter(g=>{
      const d = new Date(g.date);
      return d >= monday && d <= sunday;
    });

    if (!weekGames.length){
      content.innerHTML = '本週沒有賽事';
      return;
    }

    /***********************
     ✅ 日期 → 場地 → 排序
    ************************/
    const dateGroups = {};

    weekGames.forEach(g=>{
      if (!dateGroups[g.date]) dateGroups[g.date] = {};
      const field = g.field || '未知場地';

      if (!dateGroups[g.date][field]) {
        dateGroups[g.date][field] = [];
      }

      dateGroups[g.date][field].push(g);
    });

    let html = '';

    Object.keys(dateGroups)
      .sort((a,b)=>new Date(a)-new Date(b))
      .forEach(date => {

        /************* 日期 *************/
        html += `
          <div style="
            font-size:18px;
            font-weight:800;
            margin:12px 0 6px;
            color:#1a237e;
          ">
            ${date}
          </div>
        `;

        const fieldGroups = dateGroups[date];

        Object.keys(fieldGroups)
          .sort()
          .forEach(field => {

            const list = fieldGroups[field];

            // ✅ ✅ ✅ 同場地 → 只看時間
            list.sort((a,b)=>{
              return new Date(a.date + ' ' + a.time)
                   - new Date(b.date + ' ' + b.time);
            });

            /************* 場地 *************/
            html += `
              <div style="
                margin:8px 0 4px;
                font-weight:800;
                font-size:15px;
                color:#374151;
              ">
                📍 ${field}
              </div>
            `;

            /************* ✅ ✅ ✅ 只顯示卡片（組別不再外顯） *************/
            html += list.map(g => renderWeeklyCard(g)).join('');

          });

      });

    content.innerHTML = html;

    setGameCache(weekGames);
  });
}

/*********************************************************
 * ✅ ✅ ✅ 核心：指派 + 報名合併（前端保險版）
 *********************************************************/
function mergeAssignments(games){

  return games.map(g=>{

    g.judges = g.judges || {};
    g.records = g.records || {};

    // ✅ 防 undefined
    g.assignment_judges = g.assignment_judges || {};
    g.signup_judges = g.signup_judges || {};

    g.assignment_records = g.assignment_records || {};
    g.signup_records = g.signup_records || {};

    /** ✅ 裁判：指派優先 **/
    ['PU','U1','U2','U3'].forEach(r=>{
      g.judges[r] =
        g.assignment_judges[r] ||
        g.signup_judges[r] ||
        '';
    });

    /** ✅ 紀錄 **/
    ['REC_MAIN','REC_TRAINEE','REC_VIDEO'].forEach(r=>{
      g.records[r] =
        g.assignment_records[r] ||
        g.signup_records[r] ||
        '';
    });

    return g;
  });
}


/*********************************************************
 * ✅ Loading UI（共用）
 *********************************************************/
function renderLoading(target){
  target.innerHTML = `
    <div style="
      text-align:center;
      padding:20px;
      color:#6b7280;
      font-size:14px;
    ">
      ⏳ 載入中...
    </div>
  `;
}

/*********************************************************
 * ✅ ✅ ✅ 防呆合併（最關鍵）
 *********************************************************/
function safeMerge(g){

  // ✅ 如果後端已經有 judges → 直接用
  if (g.judges && Object.keys(g.judges).some(v => g.judges[v])){
    return g;
  }

  // ✅ 防呆初始化
  g.judges = {};
  g.records = {};

  // ✅ 裁判
  ['PU','U1','U2','U3'].forEach(r=>{
    g.judges[r] =
      g.assignment_judges?.[r] ||
      g.signup_judges?.[r] ||
      '';
  });

  // ✅ 紀錄
  ['REC_MAIN','REC_TRAINEE','REC_VIDEO'].forEach(r=>{
    g.records[r] =
      g.assignment_records?.[r] ||
      g.signup_records?.[r] ||
      '';
  });

  return g;
}

/* 首頁 */
function renderHome(){

  const root = document.getElementById('content');
  root.innerHTML = '';

  if (!games || !games.length){
    root.innerHTML = '<div>本週沒有賽事</div>';
    return;
  }

  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());   // 週日

  const end = new Date(start);
  end.setDate(start.getDate() + 6);   // 週六

  // ✅ 篩出本週
  const weekGames = games.filter(g=>{
    const d = new Date(g.date.replace(/\//g,'-'));
    return d >= start && d <= end;
  });

  if (!weekGames.length){
    root.innerHTML = '<div>本週沒有賽事</div>';
    return;
  }

  // ✅ 依日期分
  const dateMap = {};

  weekGames.forEach(g=>{
    if (!dateMap[g.date]) dateMap[g.date] = [];
    dateMap[g.date].push(g);
  });

  Object.keys(dateMap)
    .sort((a,b)=>new Date(a)-new Date(b))
    .forEach(date=>{

      root.innerHTML += `<h3 class="week-title">${date}</h3>`;

      // ✅ 同場地 grouping
      const fieldMap = {};

      dateMap[date].forEach(g=>{
        if (!fieldMap[g.field]) fieldMap[g.field] = [];
        fieldMap[g.field].push(g);
      });

      Object.keys(fieldMap).forEach(field=>{

        const list = fieldMap[field];

        const hasMultiCategory =
          [...new Set(list.map(x=>x.category))].length > 1;

        // ✅ ✅ ✅ 排序（核心）
        list.sort((a,b)=>{

          if (hasMultiCategory){
            return getTime(a).localeCompare(getTime(b));
          }

          if (a.category !== b.category){
            return a.category.localeCompare(b.category);
          }

          return getTime(a).localeCompare(getTime(b));
        });

        root.innerHTML += `
          <div class="field-title">📍 ${field}</div>
          <div class="card-grid">
            ${list.map(g=>renderHomeCard(g)).join('')}
          </div>
        `;
      });

    });
}

function renderHomeCard(g){

  const colorClass =
    g.category?.includes('大聯盟') ? 'cat-big' :
    g.category?.includes('小聯盟') ? 'cat-small' : '';

  return `
    <div class="game-card ${colorClass}">

      <div class="row-top">
        <div>${formatDateTW(g.date)}</div>
        <div class="center">${g.category||''}</div>
        <div class="right">${g.field||''}</div>
      </div>

      <div class="row-mid">
        <div class="team">${g.away_team||''}</div>

        <div class="center-box">
          <div class="game-code">${g.game_code||''}</div>
          <div class="time">${getTime(g)}</div>
        </div>

        <div class="team">${g.home_team||''}</div>
      </div>

      <!-- ✅ ✅ ✅ 6欄（裁判3 + 紀錄3） -->
      <div class="row-all">
        <div class="row-inner">

          <!-- ✅ 職稱 -->
          <div class="row-line header">
            <div class="col">主審</div>
            <div class="col">一壘</div>
            <div class="col">三壘</div>
            <div class="col">紀錄</div>
            <div class="col">見習</div>
            <div class="col">影像</div>
          </div>

          <!-- ✅ 名字 -->
          <div class="row-line values">
            <div class="col">${safeName(g.judges?.PU) || '—'}</div>
            <div class="col">${safeName(g.judges?.U1) || '—'}</div>
            <div class="col">${safeName(g.judges?.U3) || '—'}</div>
            <div class="col">${safeName(g.records?.REC_MAIN) || '—'}</div>
            <div class="col">${safeName(g.records?.REC_TRAINEE) || '—'}</div>
            <div class="col">${safeName(g.records?.REC_VIDEO) || '—'}</div>
          </div>

        </div>
      </div>

    </div>
  `;
}


function renderWeeklyCard(g){

  return `
    <div class="weekly-card">

      <!-- ✅ ✅ ✅ 上半部（改成我的班表風格） -->
      <div class="row-top">
        <div class="left">${formatDateTW(g.date)}</div>
        <div class="center">${g.category||''}</div>
        <div class="right">
          <span class="field-tag">${g.field||''}</span>
        </div>
      </div>

      <div class="row-mid">
        <div class="team">${g.away_team||''}</div>

        <div class="center-box">
          <div class="game-code">${g.game_code||''}</div>
          <div class="time">${getTime(g)}</div>
        </div>

        <div class="team">${g.home_team||''}</div>
      </div>

      <!-- ✅ ✅ ✅ 名單（維持你現在6欄） -->
      <div class="row-all">
        <div class="row-inner">
        
          <div class="row-line header">
            <div class="col">主審</div>
            <div class="col">一壘</div>
            <div class="col">三壘</div>
            <div class="col">紀錄</div>
            <div class="col">見習</div>
            <div class="col">影像</div>
          </div>

          <div class="row-line values">
            <div class="col">${safeName(g.judges?.PU)}</div>
            <div class="col">${safeName(g.judges?.U1)}</div>
            <div class="col">${safeName(g.judges?.U3)}</div>
            <div class="col">${safeName(g.records?.REC_MAIN)}</div>
            <div class="col">${safeName(g.records?.REC_TRAINEE)}</div>
            <div class="col">${safeName(g.records?.REC_VIDEO)}</div>
          </div>

        </div>
      </div>

    </div>
  `;
}

// 個人數據分析
function loadHomeUserAnalysis(){

  callApi({
    action:'getYearlyExperience',
    year: new Date().getFullYear()
  }, res=>{

    if (!res || res.result !== 'ok') return;

    const all = [...(res.judge||[]), ...(res.record||[])];

    const me = all.find(x =>
      String(x.user_id) === String(session.user_id)
    );

    if (!me){
      document.getElementById('home-user-analysis').innerHTML =
        '沒有執勤資料';
      return;
    }

    // ✅ ✅ ✅ ✅ ✅ 🔥 補這段（關鍵）
    callApi({action:'getAssignments'}, res2=>{

      window._yearRaw = {
        judge: res.judge || [],
        record: res.record || [],
        allAssignments: res2?.data || []
      };

      window._yearData = all;

      renderHomeUserAnalysis(me);

    });

  });
}

// 搭配上面的function
// 個人數據分析 - 數據
function renderHomeUserAnalysis(p){

  const total = p.attendance ?? 0;
  const completed = p.completed ?? 0;
  const rate = total ? Math.round((completed/total)*100) : 0;

  document.getElementById('home-user-analysis').innerHTML = `

    <div style="
      display:flex;
      flex-direction:column;
      gap:6px;
    ">

      <!-- ✅ KPI -->
      <div class="user-stats">

        <div class="stat-card">
          <div class="stat-title">經驗值</div>
          <div class="stat-value">${p.score_total}</div>
        </div>

        <div class="stat-card">
          <div class="stat-title">參與度</div>
          <div class="stat-value">${total}</div>
        </div>

        <div class="stat-card">
          <div class="stat-title">出勤率</div>
          <div class="stat-value">${rate}%</div>
        </div>

      </div>

      <!-- ✅ 只留按鈕 -->
      <div style="
        display:flex;
        justify-content:flex-end;
      ">
        <button class="pill pill-blue"
          onclick="openFullAnalysis('${p.user_id}')">
          查看完整分析 →
        </button>
      </div>

    </div>

  `;
}


// 打開完整個人數據分析
function openFullAnalysis(userId){
  openUserDetail(userId);
}

// 個人分析模組
function openUserDetail(userId){

  if (!window._yearRaw?.allAssignments?.length){
    alert('資料尚未載入完成');
    return;
  }

  const all = window._yearData || [];
  const p = all.find(x => String(x.user_id) === String(userId));
  if (!p) return;

  const modal = document.getElementById('userModal');
    if (!modal) return;   // ✅ 防炸
    modal.style.display = 'flex';


  // =========================
  // ✅ 年度資料
  // =========================
  const total = p.attendance ?? 0;
  const completed = p.completed ?? 0;
  const late = p.late ?? 0;
  const no_show = p.no_show ?? 0;

  const rate = total ? Math.round((completed/total)*100) : 0;

  // =========================
  // ✅ 生涯資料（從 assignment 算🔥）
  // =========================
  let career_completed = 0;
  let career_late = 0;
  let career_no_show = 0;

  const roleMap = {};

  window._yearRaw.allAssignments.forEach(g=>{

    (g.list || []).forEach(item=>{

      if (String(item.user_id) !== String(userId)) return;

      // ✅ 生涯出勤狀態
      if (item.status === 'completed') career_completed++;
      if (item.status === 'late') career_late++;
      if (item.status === 'no_show') career_no_show++;

      // ✅ 生涯角色分布
      const role = mapRole(item.role);

      roleMap[role] = (roleMap[role] || 0) + 1;

    });

  });

  const career_total = career_completed + career_late + career_no_show;

  const stable =
    no_show === 0 && completed >= 10 ? '🔥 穩定' : '';

document.getElementById('userContent').innerHTML = `
<div style="padding:12px;">

  <!-- ✅ 頭 -->
  <div style="margin-bottom:10px;">
    <div style="font-size:20px;font-weight:800;">
      ${p.name}
    </div>
    <div style="color:#6b7280;font-size:13px;">
      聯盟等級：${renderLevel(p.league_level)}
    </div>
  </div>

  <!-- ✅ KPI（2x2） -->
  <div class="grid-4">

    ${cardMini('經驗值', fmt(p.score_total))}
    ${cardMini('參與度', total)}
    ${cardMini('出勤品質', fmt(p.quality))}
    ${cardMini('排位分數', fmt(p.final_score))}

  </div>

  <hr style="margin:14px 0;">

  <!-- ✅ 出勤表 -->
  <div>
    <div style="font-weight:700;margin-bottom:6px;">
      📊 出勤概況
    </div>

    <table class="table-compact">
      <tr>
        <th></th>
        <th>完成</th>
        <th>遲到</th>
        <th>缺席</th>
      </tr>
      <tr>
        <td>年度</td>
        <td>${completed}</td>
        <td>${late}</td>
        <td>${no_show}</td>
      </tr>
      <tr>
        <td>生涯</td>
        <td>${career_completed}</td>
        <td>${career_late}</td>
        <td>${career_no_show}</td>
      </tr>
    </table>
  </div>

  <hr style="margin:14px 0;">

  <!-- ✅ 圓餅圖 -->
  <div>
    <div style="font-weight:700;margin-bottom:6px;">
      📊 角色分布
    </div>
    <canvas id="roleChart" width="320" height="240"></canvas>
  </div>

</div>
`;

  drawRoleChart(roleMap);
}

// 畫圓餅圖
function drawRoleChart(data){

  const canvas = document.getElementById('roleChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const values = Object.values(data);
  const labels = Object.keys(data);

  const total = values.reduce((a,b)=>a+b, 0);

  if (!total){
    ctx.font = "14px sans-serif";
    ctx.fillText('無資料', 90, 130);
    return;
  }

  const colorMap = {
    '主審':'#2563eb',
    '一壘審':'#16a34a',
    '二壘審':'#f59e0b',
    '三壘審':'#dc2626',
    '紀錄員':'#9333ea',
    '影像紀錄員':'#0ea5e9',
    '實習紀錄員':'#6b7280'
  };

  let start = 0;

  // ✅ 圓餅
  values.forEach((v,i)=>{

    const slice = (v/total) * Math.PI * 2;

    ctx.beginPath();
    ctx.moveTo(110,130);
    ctx.arc(110,130,90, start, start+slice);
    ctx.closePath();

    const color = colorMap[labels[i]] || '#999';

    ctx.fillStyle = color;
    ctx.fill();

    start += slice;
  });

  // ✅ ✅ 中心數（只畫一次）
  ctx.fillStyle = "#111";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(total + '場', 90, 135);

  // ✅ 圖例
  ctx.font = "13px sans-serif";

  labels.forEach((l,i)=>{

    const count = data[l];
    const percent = Math.round((count/total) * 100);

    const y = 60 + i * 26;

    const color = colorMap[l] || '#999';


    // ✅ ① 先畫色塊
    ctx.fillStyle = color;
    ctx.fillRect(210, y, 12, 12);
  
    // ✅ ② 再畫文字（蓋在上面）
    ctx.fillStyle = "#333";
    ctx.font = "13px sans-serif";

    // 調整圖示文字位置
    ctx.fillText(
      `${l}  ${count} (${percent}%)`,
       230,
      y + 10
    );

  });
}

// 等級
function renderLevel(lv){

  const map = {
    S:{c:'#9333ea',t:'S'},
    A:{c:'#2563eb',t:'A'},
    B:{c:'#16a34a',t:'B'},
    C:{c:'#d97706',t:'C'},
    N:{c:'#6b7280',t:'N'}
  };

  const m = map[lv] || map.N;

  return `<span style="color:${m.c};font-weight:700">${m.t}</span>`;
}

// 關閉個人分析模組
function closeUserModal(){
  const modal = document.getElementById('userModal');
  if (!modal) return;

  modal.style.display = 'none';   // ✅ 關鍵
}


// 英文代碼中文化
function mapRole(role){

  const m = {
    PU:'主審',
    U1:'一壘審',
    U2:'二壘審',
    U3:'三壘審',
    REC_MAIN:'紀錄員',
    REC_VIDEO:'影像紀錄員',
    REC_TRAINEE:'實習紀錄員'
  };

  return m[role] || role;
}

// 卡片美化用
function card(label, value){
  return `
    <div class="stat-card">
      <div class="stat-title">${label}</div>
      <div class="stat-value">${value}</div>
    </div>
  `;
}

function cardMini(label, value){
  return `
    <div class="card-mini">
      <div class="mini-title">${label}</div>
      <div class="mini-value">${value}</div>
    </div>
  `;
}

// ✅ 分數格式
function fmt(n){
  const num = Number(n ?? 0);
  return Number.isInteger(num) ? num : num.toFixed(2);
}
