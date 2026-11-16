/*********************************************************
 * ✅ Index Page（最終整合完整版）
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

  // ✅ Welcome
  renderWelcome();

  // ✅ 綁按鈕事件
  bindButtons();

  // ✅ 載入統計
  loadDashboard();

  // ✅ 載入本週出勤提醒
  loadWeeklyReminder();
  
  // ✅ 載入個人數據分析
  loadHomeUserAnalysis();

  // ✅ 首頁載入聯盟開課資訊
  loadHomeCourses();

});


/*********************************************************
 * ✅ 修正版：首頁載入聯盟開課資訊 (支援報名截止日判斷與日期清洗)
 *********************************************************/
function loadHomeCourses() {
  const container = document.getElementById('home-course-container');
  if (!container) return;

  callApi({ action: 'getCourses' }, res => {
    const courseList = res?.courses || res?.data || (Array.isArray(res) ? res : []);

    if (!res || (res.result !== 'ok' && !Array.isArray(res)) || courseList.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: #64748b; font-size: 13px; padding: 8px;">
          目前尚無進行中的聯盟開課資訊，請至 <a href="course.html" style="color: #2563eb; font-weight: 700;">課程專區</a> 查看更多。
        </div>
      `;
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const recentCourses = courseList.slice(0, 2);
    
    container.innerHTML = recentCourses.map(c => {
      const cleanDate = (raw) => {
        if (!raw) return '';
        let str = String(raw).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
        if (str.includes('T')) return str.split('T')[0];
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          if (y > 2020) return `${y}-${m}-${day}`;
        }
        return str.split(' ')[0] || '';
      };

      const courseDate = cleanDate(c.date || c.time);
      const signupEnd = cleanDate(c.signup_end);
      const isExpired = signupEnd && todayStr > signupEnd;
      const statusText = isExpired ? '已截止' : (c.course_status_text || c.status || '報名中');
      const statusColor = isExpired ? '#dc2626' : '#166534';

      return `
        <div class="home-course-card" onclick="location.href='course.html'" style="cursor: pointer;">
          <div class="home-course-title">🎓 ${c.course_name || c.title || c.name || '聯盟培訓課程'}</div>
          <div class="home-course-info">
            <div>🕒 上課：${courseDate || '另行公佈'}</div>
            <div style="color: #e11d48; font-weight: 700;">⏳ 截止：${signupEnd || '未設定'}</div>
            <div>📍 地點：${c.location || '線上/指定場地'}</div>
            <div style="margin-top: 4px; color: ${statusColor}; font-weight: 700;">狀態：${statusText}</div>
          </div>
        </div>
      `;
    }).join('');
  });
}


/*********************************************************
 * ✅ Welcome
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
    nameEl.textContent = session.name + ' 您好，歡迎使用出勤管理系統';
  }

  if (roleEl){
    roleEl.textContent = (session.role || '')
      .split(',')
      .map(r => roleMap[r])
      .filter(Boolean)
      .join('／');
  }
}


/*********************************************************
 * ✅ 綁按鈕
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

  document.getElementById('open-record-rules')?.addEventListener('click', () => {
    document.getElementById('record-rules-overlay').style.display = 'flex';
  });

  document.getElementById('open-system-guide')?.addEventListener('click', () => {
    document.getElementById('system-guide-overlay').style.display = 'flex';
  });

  document.getElementById('open-system-history')?.addEventListener('click', () => {
    document.getElementById('system-history-overlay').style.display = 'flex';
  });

  document.getElementById('open-analysis-guide')?.addEventListener('click', () => {
    document.getElementById('analysis-guide-overlay').style.display = 'flex';
  });

  document.getElementById('open-user-guide')?.addEventListener('click', () => {
    document.getElementById('user-guide-overlay').style.display = 'flex';
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
    now.setHours(0,0,0,0);
    const day = now.getDay() === 0 ? 7 : now.getDay();

    const monday = new Date(now);
    monday.setDate(now.getDate() - (day - 1));
    monday.setHours(0,0,0,0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23,59,59,999);

    const weekGames = games.filter(g => {
      const hasWork =
        g.my_position ||
        Object.values(g.judges||{}).includes(session.name) ||
        Object.values(g.records||{}).includes(session.name);
    
      if (!hasWork) return false;
    
      const d = parseDate(g.date);
      const inWeek = d >= monday && d <= sunday;
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
 * ✅ Dashboard 統計數據
 *********************************************************/
function loadDashboard(){
  
  callApi({ action:'getAssignments' }, resAssign => {

    if (!resAssign || resAssign.result !== 'ok') return;

    callApi({
      action:'getSignableGames',
      user_id: session.user_id
    }, resSignup => {

      const uid = String(session.user_id);
      const year = new Date().getFullYear();
      const now = new Date();
      now.setHours(0,0,0,0);

      let judgeDone = 0;
      let judgeFuture = 0;
      let recordDone = 0;
      let recordFuture = 0;

      const assignedGameSet = new Set();
      const countedAssignedGame = new Set();
      
      (resAssign.data || []).forEach(g => {
        const d = parseDate(g.date);
        if (!d) return;
      
        const isFuture = d >= now;
        const isThisYear = d.getFullYear() === year;
      
        let hasJudgeFuture = false;
        let hasRecordFuture = false;
        let hasJudgeDone = false;
        let hasRecordDone = false;
        let isMyGame = false;
      
        Object.values(g.judges || {}).forEach(slot => {
          if (!slot) return;
          const uidMatch = typeof slot === 'object' ? String(slot.user_id) === uid : slot === session.name;
          if (!uidMatch) return;
          isMyGame = true;
          if (isFuture && isThisYear) hasJudgeFuture = true;
        });
      
        Object.values(g.records || {}).forEach(slot => {
          if (!slot) return;
          const uidMatch = typeof slot === 'object' ? String(slot.user_id) === uid : slot === session.name;
          if (!uidMatch) return;
          isMyGame = true;
          if (isFuture && isThisYear) hasRecordFuture = true;
        });
      
        (g.list || []).forEach(item => {
          if (String(item.user_id) !== uid) return;
          const isRecord = String(item.role || '').toUpperCase().includes('REC');
          isMyGame = true;
          if ((item.status === 'completed' || item.status === 'late') && isThisYear){
            if (isRecord) hasRecordDone = true;
            else hasJudgeDone = true;
          }
        });
      
        if (!isMyGame) return;
        assignedGameSet.add(g.game_id);
      
        if (hasJudgeDone || hasRecordDone){
          if (hasJudgeDone) judgeDone++;
          else if (hasRecordDone) recordDone++;
        }
      
        if ((hasJudgeFuture || hasRecordFuture) && !countedAssignedGame.has(g.game_id)){
          countedAssignedGame.add(g.game_id);
          if (hasJudgeFuture) judgeFuture++;
          else if (hasRecordFuture) recordFuture++;
        }
      });

      const games = (resSignup.games || []).map(safeMerge);
      const uniqueGamesMap = new Map();
      games.forEach(g => {
        if (!uniqueGamesMap.has(g.game_id)) uniqueGamesMap.set(g.game_id, g);
      });
      const uniqueGames = Array.from(uniqueGamesMap.values());
      const countedGame = new Set();

      uniqueGames.forEach(g => {
        if (assignedGameSet.has(g.game_id)) return;
        const d = parseDate(g.date);
        if (!d || d < now) return;
        if (countedGame.has(g.game_id)) return;

        let hasJudge = false;
        let hasRecord = false;

        Object.entries(g.judges || {}).forEach(([role, name]) => {
          if (name === session.name) hasJudge = true;
        });

        Object.entries(g.records || {}).forEach(([role, name]) => {
          if (name === session.name) hasRecord = true;
        });

        if (!hasJudge && !hasRecord) return;
        countedGame.add(g.game_id);

        if (hasJudge) judgeFuture++;
        else if (hasRecord) recordFuture++;
      });

      setTimeout(() => {
        const el1 = document.getElementById('stat-judge');
        const el2 = document.getElementById('stat-record');
        const el3 = document.getElementById('stat-total');
        const sub1 = document.getElementById('stat-judge-sub');
        const sub2 = document.getElementById('stat-record-sub');
        const sub3 = document.getElementById('stat-total-sub');
      
        if (el1) el1.textContent = judgeDone;
        if (el2) el2.textContent = recordDone;
        if (el3) el3.textContent = judgeDone + recordDone;
      
        if (sub1) sub1.textContent = `生 ${judgeDone} 預 ${judgeFuture}`;
        if (sub2) sub2.textContent = `生 ${recordDone} 預 ${recordFuture}`;
        if (sub3) sub3.textContent = `生 ${judgeDone + recordDone} 預 ${judgeFuture + recordFuture}`;
      }, 500);

    });

  });

}


/*********************************************************
 * ✅ 時間格式與工具
 *********************************************************/
function parseDate(str){
  if (!str) return null;
  const s = str.replace(/-/g,'/');
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function getTime(g){
  if (!g) return '';
  if (typeof g.time === 'string'){
    if (g.time.includes(':')) return g.time;
  }
  if (g.time_range){
    return String(g.time_range).substring(0,5);
  }
  return '';
}

function isPastGame(dateStr){
  const today = new Date();
  today.setHours(0,0,0,0);
  const d = new Date((dateStr||'').replace(/\//g,'-'));
  d.setHours(0,0,0,0);
  return d < today;
}

function formatDateTW(dateStr){
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(/\//g,'-'));
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const w = ['日','一','二','三','四','五','六'][d.getDay()];
  return `${m}/${day}(${w})`;
}


/*********************************************************
 * ✅ 我的班表
 *********************************************************/
function getMyRoleText(role){
  const map = {
    PU:'主審',
    U1:'一壘審',
    U2:'二壘審',
    U3:'三壘審',
    REC_MAIN:'紀錄',
    REC_TRAINEE:'見習',
    REC_VIDEO:'影像'
  };
  return map[role] || role || '-';
}

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

    const games = (res.games || []).map(safeMerge);
    const s = getSession ? getSession() : session;

    games.forEach(g => {
      g.my_position = '';
      if (g.judges){
        for (const [role,val] of Object.entries(g.judges)){
          if (isMySlot(val,s)) g.my_position = role;
        }
      }
      if (g.records){
        for (const [role,val] of Object.entries(g.records)){
          if (isMySlot(val,s)) g.my_position = role;
        }
      }
    });

    const today = new Date();
    today.setHours(0,0,0,0);

    const myGames = games.filter(g => {
      if (!g.my_position) return false;
      const d = parseDate(g.date);
      return d && d >= today;
    });

    if (!myGames.length){
      list.innerHTML = `<div class="row-warning">目前沒有未來班表</div>`;
      return;
    }

    myGames.sort((a,b)=>{
      const da = new Date(`${a.date} ${getTime(a)}`);
      const db = new Date(`${b.date} ${getTime(b)}`);
      return da - db;
    });

    const now = new Date();
    now.setHours(0,0,0,0);
    const day = now.getDay() === 0 ? 7 : now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day - 1));
    monday.setHours(0,0,0,0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23,59,59,999);

    list.innerHTML = myGames.map(g => {
      const d = parseDate(g.date);
      const isThisWeek = d && d >= monday && d <= sunday;

      return `
        <div class="my-duty-row ${isThisWeek ? 'this-week' : ''}">
          <div class="my-duty-line1">
            ${isThisWeek ? `<span class="week-badge">本週</span>` : ''}
            ${formatDateTW(g.date)} ｜${getTime(g)} ｜${g.field || '-'}
            <span class="my-duty-role">${getMyRoleText(g.my_position)}</span>
          </div>
          <div class="my-duty-line2">
            <span class="tournament">${g.tournament || '-'}${g.category ? `-${g.category}` : ''}</span> ｜
            <span class="matchup">${g.away_team || ''}<span class="vs">VS</span>${g.home_team || ''}</span>
          </div>
        </div>
      `;
    }).join('');

    setGameCache(myGames);
  });
}


/*********************************************************
 * ✅ 本週聯盟班表
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

    const games = (res.games || []).map(safeMerge);
    const now = new Date();
    now.setHours(0,0,0,0);
    const day = now.getDay() === 0 ? 7 : now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day - 1));
    monday.setHours(0,0,0,0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23,59,59,999);
    
    const weekGames = games.filter(g => {
      if (Number(g.status || 0) === 3) return false;
      const d = parseDate(g.date);
      if (!(d && d >= monday && d <= sunday)) return false;
      
      if (typeof WEEKLY_SCHEDULE_CONFIG !== 'undefined' && WEEKLY_SCHEDULE_CONFIG.mode === 'LIMIT'){
        const tournament = String(g.tournament || '').trim();
        if (!WEEKLY_SCHEDULE_CONFIG.tournaments.includes(tournament)) return false;
      }
      return true;
    });

    if (!weekGames.length){
      content.innerHTML = '本週沒有賽事';
      return;
    }

    const dateGroups = {};
    weekGames.forEach(g=>{
      if (!dateGroups[g.date]) dateGroups[g.date] = {};
      const field = g.field || '未知場地';
      if (!dateGroups[g.date][field]) dateGroups[g.date][field] = [];
      dateGroups[g.date][field].push(g);
    });

    let html = '';
    Object.keys(dateGroups)
      .sort((a,b)=>new Date(a)-new Date(b))
      .forEach(date => {
        html += `<div style="font-size:18px; font-weight:800; margin:12px 0 6px; color:#1a237e;">${date}</div>`;
        const fieldGroups = dateGroups[date];

        Object.keys(fieldGroups)
          .sort()
          .forEach(field => {
            const list = fieldGroups[field];
            list.sort((a,b)=> new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));

            html += `<div class="league-field-header">📍 ${field}（${list.length}場）</div>`;
            html += renderWeeklyTable(list);
          });
      });

    content.innerHTML = html;
    setGameCache(weekGames);
  });
}

function renderWeeklyTable(list){
  return list.map(g => {
    const judgeRoles = getJudgeRoles(g);
    const judgeHtml = judgeRoles.length
      ? judgeRoles.map(role => `
          <div>${roleMap(role)}：<span class="league-duty-name">${safeName(g.judges?.[role]) || '－'}</span></div>
        `).join('')
      : `<div>無需裁判</div>`;

    return `
      <div class="league-row">
        <div class="league-head">
          <div class="league-time-row">
            <span class="league-time">${getTime(g)}</span>
            <span class="league-code">${g.game_code || '-'}</span>
          </div>
          <div class="league-match">${g.away_team || ''}<span class="vs">VS</span>${g.home_team || ''}</div>
        </div>
        <div class="league-duty">
          <div class="league-duty-left">${judgeHtml}</div>
          <div class="league-duty-right">
            <div>紀錄：<span class="league-duty-name">${safeName(g.records?.REC_MAIN) || '－'}</span></div>
            <div>見習：<span class="league-duty-name">${safeName(g.records?.REC_TRAINEE) || '－'}</span></div>
            <div>影像：<span class="league-duty-name">${safeName(g.records?.REC_VIDEO) || '－'}</span></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}


/*********************************************************
 * ✅ 安全合併與快取
 *********************************************************/
function safeMerge(g){
  const hasJudgeData = g.judges && Object.values(g.judges).some(v => !!v);
  const hasRecordData = g.records && Object.values(g.records).some(v => {
    if (!v) return false;
    if (typeof v === 'string') return v.trim() !== '';
    return !!(v.name || v.user_id);
  });

  if (hasJudgeData || hasRecordData) return g;

  g.judges = {};
  g.records = {};

  ['PU','U1','U2','U3'].forEach(r=>{
    g.judges[r] = g.assignment_judges?.[r] || g.signup_judges?.[r] || '';
  });
  ['REC_MAIN','REC_TRAINEE','REC_VIDEO'].forEach(r=>{
    g.records[r] = g.assignment_records?.[r] || g.signup_records?.[r] || '';
  });

  return g;
}

function setGameCache(list){
  __GAME_CACHE = list;
}

function renderLoading(target){
  target.innerHTML = `<div style="text-align:center; padding:20px; color:#6b7280; font-size:14px;">⏳ 載入中...</div>`;
}


/*********************************************************
 * ✅ 個人數據分析模組
 *********************************************************/
function loadHomeUserAnalysis(){
  callApi({
    action:'getYearlyExperience',
    year: new Date().getFullYear()
  }, res=>{
    if (!res || res.result !== 'ok') return;
    const all = [...(res.judge||[]), ...(res.record||[])];
    const me = all.find(x => String(x.user_id) === String(session.user_id));

    if (!me){
      document.getElementById('home-user-analysis').innerHTML = '沒有執勤資料';
      return;
    }

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

function renderHomeUserAnalysis(p){
  const total = p.attendance ?? 0;
  const completed = p.completed ?? 0;
  const rate = total ? Math.round((completed/total)*100) : 0;

  document.getElementById('home-user-analysis').innerHTML = `
    <div style="display:flex; flex-direction:column; gap:6px;">
      <div class="user-stats" style="margin: 0 !important;">
        <div class="stat-card">
          <div class="stat-title">經驗值</div>
          <div class="stat-value" style="font-size:28px !important;">${p.score_total}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">參與度</div>
          <div class="stat-value" style="font-size:28px !important;">${total}</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">出勤率</div>
          <div class="stat-value" style="font-size:28px !important;">${rate}%</div>
        </div>
      </div>
      <div style="display:flex; justify-content:flex-end;">
        <button class="pill pill-blue" onclick="openFullAnalysis('${p.user_id}')">查看完整分析 →</button>
      </div>
    </div>
  `;
}

function openFullAnalysis(userId){
  openUserDetail(userId);
}

function openUserDetail(userId){
  if (!window._yearRaw?.allAssignments?.length){
    alert('資料尚未載入完成');
    return;
  }

  const all = window._yearData || [];
  const p = all.find(x => String(x.user_id) === String(userId));
  if (!p) return;

  const modal = document.getElementById('userModal');
  if (!modal) return;
  modal.style.display = 'flex';

  const total = p.attendance ?? 0;
  const completed = p.completed ?? 0;
  const late = p.late ?? 0;
  const no_show = p.no_show ?? 0;

  let career_completed = 0;
  let career_late = 0;
  let career_no_show = 0;

  const roleMap = {};
  const historyRows = [];
  const yearlyMap = {};

  window._yearRaw.allAssignments.forEach(g=>{
    (g.list || []).forEach(item=>{
      if (String(item.user_id) !== String(userId)) return;

      const year = String(g.date).substring(0,4);
      if (!yearlyMap[year]){
        yearlyMap[year] = { completed:0, late:0, no_show:0 };
      }
      if (item.status === 'completed') yearlyMap[year].completed++;
      if (item.status === 'late') yearlyMap[year].late++;
      if (item.status === 'no_show') yearlyMap[year].no_show++;

      if (item.status === 'completed') career_completed++;
      if (item.status === 'late') career_late++;
      if (item.status === 'no_show') career_no_show++;

      if (item.status !== 'completed') return;

      historyRows.push({
        date : g.date,
        time : String(g.date).includes(' ') ? String(g.date).split(' ')[1].substring(0,5) : '',
        tournament : `${g.tournament || ''}${g.category ? ' - ' + g.category : ''}`,
        match : `${g.away_team || ''} VS ${g.home_team || ''}`,
        role : mapRole(item.role),
        status : item.status
      });
      
      const role = mapRole(item.role);
      roleMap[role] = (roleMap[role] || 0) + 1;
    });
  });

  document.getElementById('userContent').innerHTML = `
    <div style="padding:12px;">
      <div style="margin-bottom:10px;">
        <div style="font-size:20px;font-weight:800;">${p.name}</div>
        <div style="color:#6b7280;font-size:13px;">聯盟等級：${renderLevel(p.league_level)}</div>
      </div>
      <div class="grid-4">
        ${cardMini('經驗值', fmt(p.score_total))}
        ${cardMini('參與度', total)}
        ${cardMini('出勤品質', fmt(p.quality))}
        ${cardMini('排位分數', fmt(p.final_score))}
      </div>
      <hr style="margin:14px 0;">
      <div>
        <div style="font-weight:700;margin-bottom:6px;">📊 出勤概況</div>
        <table class="table-compact">
          <tr><th>年度</th><th>完成</th><th>遲到</th><th>缺席</th></tr>
          ${Object.keys(yearlyMap).sort((a,b)=>b-a).map(year => `
            <tr>
              <td>${year}</td>
              <td>${yearlyMap[year].completed}</td>
              <td>${yearlyMap[year].late}</td>
              <td>${yearlyMap[year].no_show}</td>
            </tr>
          `).join('')}
          <tr style="font-weight:700;">
            <td>生涯</td>
            <td>${career_completed}</td>
            <td>${career_late}</td>
            <td>${career_no_show}</td>
          </tr>
        </table>
      </div>
      <hr style="margin:14px 0;">
      <div>
        <div style="font-weight:700;margin-bottom:6px;">📊 角色分布</div>
        <canvas id="roleChart" width="320" height="240"></canvas>
      </div>
    </div>
  `;
  drawRoleChart(roleMap);
}

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
    '主審':'#2563eb', '一壘審':'#16a34a', '二壘審':'#f59e0b',
    '三壘審':'#dc2626', '紀錄員':'#9333ea', '影像紀錄員':'#0ea5e9', '實習紀錄員':'#6b7280'
  };

  let start = 0;
  values.forEach((v,i)=>{
    const slice = (v/total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(110,130);
    ctx.arc(110,130,90, start, start+slice);
    ctx.closePath();
    ctx.fillStyle = colorMap[labels[i]] || '#999';
    ctx.fill();
    start += slice;
  });

  ctx.fillStyle = "#111";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(total + '場', 90, 135);
}

function renderLevel(lv){
  const map = {
    S:{c:'#9333ea',t:'S'}, A:{c:'#2563eb',t:'A'},
    B:{c:'#16a34a',t:'B'}, C:{c:'#d97706',t:'C'}, N:{c:'#6b7280',t:'N'}
  };
  const m = map[lv] || map.N;
  return `<span style="color:${m.c};font-weight:700">${m.t}</span>`;
}

function closeUserModal(){
  const modal = document.getElementById('userModal');
  if (modal) modal.style.display = 'none';
}

function mapRole(role){
  const m = {
    PU:'主審', U1:'一壘審', U2:'二壘審', U3:'三壘審',
    REC_MAIN:'紀錄員', REC_VIDEO:'影像紀錄員', REC_TRAINEE:'實習紀錄員'
  };
  return m[role] || role;
}

function cardMini(label, value){
  return `
    <div class="card-mini">
      <div class="mini-title">${label}</div>
      <div class="mini-value">${value}</div>
    </div>
  `;
}

function fmt(n){
  const num = Number(n ?? 0);
  return Number.isInteger(num) ? num : num.toFixed(2);
}

function hideOverlay(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function isMySlot(slot, session){
  if (!slot || !session) return false;
  if (typeof slot === 'object'){
    if (slot.user_id) return String(slot.user_id) === String(session.user_id);
    if (slot.name) return slot.name === session.name;
  }
  if (typeof slot === 'string'){
    return slot === session.name;
  }
  return false;
}

function safeName(slot){
  if (!slot) return '';
  if (typeof slot === 'string') return slot;
  return slot.name || '';
}

function getJudgeRoles(g){
  const count = Number(g.umpire_count) || Number(g.need_count) || 0;
  if (count === 0) return [];
  if (count === 1) return ['PU'];
  if (count === 2) return ['PU','U1'];
  if (count === 3) return ['PU','U1','U3'];
  return ['PU','U1','U2','U3'];
}

function roleMap(r){
  return { PU:'主審', U1:'一壘', U2:'二壘', U3:'三壘' }[r] || r;
}
