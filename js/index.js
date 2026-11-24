/*********************************************************
 * ✅ Index Page（最終完整整合版：Users.level 證照直接對應）
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

  renderWelcome();  // ✅ Welcome
  bindButtons();  // ✅ 綁按鈕事件
  loadDashboard();  // ✅ 載入統計
  loadWeeklyReminder();  // ✅ 載入本週出勤提醒
  loadHomeUserAnalysis();  // ✅ 載入個人數據分析
  loadHomeCourses();  // ✅ 首頁載入聯盟開課資訊
  loadHomeAnnouncements();  // 載入公告

});


/*********************************************************
 * ✅ 首頁載入聯盟開課資訊 (精簡為課程名稱、上課日、報名狀態)
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
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; font-size: 12px;">
            <span style="color: #475569; font-weight: 700;">🕒 上課：${courseDate || '另行公佈'}</span>
            <span style="font-weight: 800; color: ${statusColor};">狀態：${statusText}</span>
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

  const nameEl1 = document.getElementById('welcome-name-1');
  const nameEl2 = document.getElementById('welcome-name-2');
  const roleEl = document.getElementById('welcome-role');

  const displayName = session.name || '使用者';

  if (nameEl1){
    nameEl1.textContent = `${displayName} 您好，歡迎使用出勤管理系統`;
  }

  if (nameEl2){
    nameEl2.textContent = `${displayName} 您好，感謝您協助維護聯盟賽事公平與品質`;
  }

  if (roleEl){
    roleEl.textContent = (session.role || '')
      .split(',')
      .map(r => roleMap[r])
      .filter(Boolean)
      .join('／') || '裁判員／紀錄員';
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
    sunday.setDate(sunday.getDate() + 6);
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
    sunday.setDate(sunday.getDate() + 6);
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
 * ✅ 個人數據分析模組（以 Users.level 欄位直接呈現證照：左裁判右紀錄）
 *********************************************************/
function loadHomeUserAnalysis(){
  const targetYear = new Date().getFullYear();
  const targetUid = String(session.user_id || '').trim();

  callApi({
    action:'getYearlyExperience',
    year: targetYear,
    user_id: targetUid
  }, res=>{
    if (!res || res.result !== 'ok') {
      const rateEl = document.getElementById('stat-rate');
      if (rateEl) rateEl.textContent = `0%`;
      return;
    }

    const rawData = res.data || res;
    let judgeList = Array.isArray(rawData.judge) ? rawData.judge : (Array.isArray(rawData.judges) ? rawData.judges : []);
    let recordList = Array.isArray(rawData.record) ? rawData.record : (Array.isArray(rawData.records) ? rawData.records : []);

    if (Array.isArray(rawData) && judgeList.length === 0 && recordList.length === 0) {
      judgeList = rawData;
    }

    const all = [...judgeList, ...recordList];
    const matched = all.find(x => String(x.user_id || '').trim() === targetUid || String(x.id || '').trim() === targetUid);
    const fallbackObj = (rawData && !Array.isArray(rawData) && rawData.user_id) ? rawData : {};
    const me = Object.assign(
      {
        user_id: targetUid,
        name: session.name || '',
        level: session.level || 'N,N',
        league_level: session.league_level || 'N',
        training_hours_year: 0,
        training_hours_total: 0
      },
      fallbackObj,
      matched || {}
    );

    callApi({action:'getAssignments'}, res2=>{
      window._yearRaw = {
        judge: judgeList,
        record: recordList,
        allAssignments: res2?.data || res2?.assignments || []
      };
      window._yearData = matched ? all : [me, ...all];
      renderHomeUserAnalysis(me);
    });
  });
}

function renderHomeUserAnalysis(p){
  const total = Number(p.attendance ?? p.total_games ?? p.games_count ?? 0);
  const completed = Number(p.completed ?? p.completed_games ?? 0);
  const rate = total > 0 ? Math.round((completed / total) * 100) : (completed > 0 ? 100 : 0);

  const rateEl = document.getElementById('stat-rate');
  if (rateEl) rateEl.textContent = `${rate}%`;

  const fillRateEl = document.getElementById('fill-rate'); 
  if (fillRateEl) fillRateEl.style.width = `${rate}%`;
  
  const analysisEl = document.getElementById('home-user-analysis');
  if (analysisEl) {
    analysisEl.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:flex-end;">
          <button class="pill pill-blue" onclick="openFullAnalysis('${p.user_id || session.user_id}')">查看完整分析 →</button>
        </div>
      </div>
    `;
  }
}

function openFullAnalysis(userId){
  openUserDetail(userId);
}

function calcTrainingHoursFromLogs_(targetUid, logs, courses, targetYear){
  const courseMap = {};
  (courses || []).forEach(c => {
    const cid = String(c.course_id ?? c.id ?? c.courseId ?? '').trim();
    if (!cid) return;
    const rawHours = c.training_hours ?? c.certificate_hours ?? c.hours ?? c.course_hours ?? 0;
    const hours = Number(rawHours) || 0;
    const rawDate = c.date || c.course_date || c.start_date || '';
    const dObj = rawDate ? new Date(String(rawDate).replace(/-/g, '/')) : null;
    courseMap[cid] = {
      hours,
      date: (dObj && !isNaN(dObj.getTime())) ? dObj : null
    };
  });

  let yearHours = 0;
  let totalHours = 0;
  const cleanTargetUid = String(targetUid || '').trim();
  const cleanTargetName = String(session?.name || '').trim();

  (logs || []).forEach(r => {
    const uid = String(r.user_id ?? r.uid ?? r.userId ?? '').trim();
    const uName = String(r.name ?? r.external_name ?? '').trim();
    const isUserMatch = (cleanTargetUid && uid === cleanTargetUid) || (!uid && cleanTargetName && uName === cleanTargetName);
    if (!isUserMatch) return;

    const status = String(r.status || '').trim().toLowerCase();
    const attStatus = String(r.attendance_status || '').trim().toLowerCase();
    const certVer = String(r.certificate_verified || '').trim().toLowerCase();
    const checkinTime = String(r.checkin_time || '').trim();
    const checkoutTime = String(r.checkout_time || '').trim();

    const isRejected =
      ['cancelled', 'canceled', '已取消', '取消'].includes(status) ||
      ['absent', '缺席'].includes(attStatus) ||
      ['rejected', 'incomplete', '未通過', '不通過'].includes(certVer);

    const isCompleted =
      !isRejected && (
        ['completed', 'attended', 'present', '已完成', '已出席', '出席'].includes(attStatus) ||
        ['completed', 'attended', '已完成', '已出席'].includes(status) ||
        ['completed', 'verified', '已核發', '已通過', '通過'].includes(certVer) ||
        (checkinTime !== '' && checkoutTime !== '')
      );

    if (!isCompleted) return;

    const cid = String(r.course_id ?? r.cid ?? r.courseId ?? '').trim();
    const cInfo = courseMap[cid] || { hours: 0, date: null };
    const rawRowHours = r.training_hours ?? r.certificate_hours ?? r.hours ?? 0;
    const hours = Number(cInfo.hours || rawRowHours || 0) || 0;
    if (hours <= 0) return;

    totalHours += hours;

    const rawLogDate = r.date || r.course_date || r.certificate_verified_date || r.created_at || '';
    const logDateObj = rawLogDate ? new Date(String(rawLogDate).replace(/-/g, '/')) : null;
    const validLogDate = (logDateObj && !isNaN(logDateObj.getTime())) ? logDateObj : null;
    const refDate = cInfo.date || validLogDate;

    if (!refDate || refDate.getFullYear() === Number(targetYear)) {
      yearHours += hours;
    }
  });

  return { yearHours, totalHours };
}

function normalizeDutyStatus_(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (['completed', 'done', 'finish', 'finished', 'attended', 'present', '完成', '已完成', '已出席', '出席'].includes(s)) {
    return 'completed';
  }
  if (['late', 'tardy', '遲到'].includes(s)) {
    return 'late';
  }
  if (['no_show', 'noshow', 'absent', '缺席', '未到'].includes(s)) {
    return 'no_show';
  }
  return s;
}

function openUserDetail(userId){
  const all = window._yearData || [];
  const p = all.find(x => String(x.user_id) === String(userId) || String(x.id) === String(userId)) || {};

  const modal = document.getElementById('userModal');
  if (!modal) return;
  modal.style.display = 'flex';

  const total = Number(p.attendance ?? p.total_games ?? 0);
  const completed = Number(p.completed ?? p.completed_games ?? 0);
  const late = Number(p.late ?? 0);
  const no_show = Number(p.no_show ?? 0);

  let career_completed = 0;
  let career_late = 0;
  let career_no_show = 0;

  const roleMap = {};
  const yearlyMap = {};

  if (window._yearRaw?.allAssignments) {
    window._yearRaw.allAssignments.forEach(g=>{
      (g.list || []).forEach(item=>{
        if (String(item.user_id) !== String(userId)) return;

        const year = String(g.date || new Date().getFullYear()).substring(0,4);
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

        const role = mapRole(item.role);
        roleMap[role] = (roleMap[role] || 0) + 1;
      });
    });
  }

  const currentYear = new Date().getFullYear();
  const currentYearStr = String(currentYear);
  const trainingHoursYear = Number(p.training_hours_year ?? p.course_hours_year ?? p.year_hours ?? 0) || 0;
  const trainingHoursTotal = Number(p.training_hours_total ?? p.course_hours_total ?? p.total_hours ?? 0) || 0;

  // ✅ 證照解析與過濾邏輯
  const dbLevel = p.level || p.user_level || session.level || 'N,N';
  let parts = String(dbLevel).split(/[\/／,，]/);
  let judgeLv = parts[0] ? parts[0].trim().toUpperCase() : 'N';
  let recordLv = parts[1] ? parts[1].trim().toUpperCase() : 'N';

  let validCerts = [];
  if (judgeLv && judgeLv !== 'N' && judgeLv !== '無') {
    validCerts.push(`${judgeLv}級裁判`);
  }
  if (recordLv && recordLv !== 'N' && recordLv !== '無') {
    validCerts.push(`${recordLv}級紀錄`);
  }

  let licenseHtml = '';
  if (validCerts.length > 0) {
    licenseHtml = `
      <div style="text-align:right;">
        <span style="background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe; font-size:11px; font-weight:800; padding:4px 10px; border-radius:6px; display:inline-block;">
          📜 證照資格：${validCerts.join(' ')}
        </span>
      </div>
    `;
  }

  document.getElementById('userContent').innerHTML = `
    <div style="padding:12px;">
      <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <div style="font-size:22px; font-weight:900; color:#0f172a;">${p.name || session.name}</div>
          <div style="color:#64748b; font-size:13px; margin-top:2px;">聯盟等級：${renderLevel(p.league_level || session.league_level || 'N')}</div>
        </div>
        ${licenseHtml}
      </div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px;">
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 8px; text-align:center;">
          <div style="font-size:11px; color:#64748b; font-weight:700;">經驗值</div>
          <div style="font-size:18px; font-weight:900; color:#1e3a8a; margin-top:2px;">${fmt(p.score_total ?? p.experience ?? 0)}</div>
        </div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 8px; text-align:center;">
          <div style="font-size:11px; color:#64748b; font-weight:700;">參與度</div>
          <div style="font-size:18px; font-weight:900; color:#2563eb; margin-top:2px;">${total}</div>
        </div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 8px; text-align:center;">
          <div style="font-size:11px; color:#64748b; font-weight:700;">出勤品質</div>
          <div style="font-size:18px; font-weight:900; color:#16a34a; margin-top:2px;">${fmt(p.quality ?? 100)}</div>
        </div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 8px; text-align:center;">
          <div style="font-size:11px; color:#64748b; font-weight:700;">排位分數</div>
          <div style="font-size:18px; font-weight:900; color:#9333ea; margin-top:2px;">${fmt(p.final_score ?? 0)}</div>
        </div>
      </div>

      <hr style="margin:14px 0; border:0; border-top:1px solid #e2e8f0;">

      <div>
        <div style="font-weight:700; margin-bottom:8px; font-size:14px; color:#1e293b;">🎓 培訓課程與完訓時數</div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; text-align:center;">
            <div style="font-size:11px; color:#64748b; font-weight:700;">📅 ${currentYearStr} 年度完訓時數</div>
            <div id="user-training-hours-year" style="font-size:20px; font-weight:900; color:#1e3a8a; margin-top:2px;">${trainingHoursYear} <span style="font-size:12px; font-weight:normal;">小時</span></div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; text-align:center;">
            <div style="font-size:11px; color:#64748b; font-weight:700;">📚 生涯累計完訓時數</div>
            <div id="user-training-hours-total" style="font-size:20px; font-weight:900; color:#16a34a; margin-top:2px;">${trainingHoursTotal} <span style="font-size:12px; font-weight:normal;">小時</span></div>
          </div>
        </div>
      </div>

      <hr style="margin:14px 0; border:0; border-top:1px solid #e2e8f0;">
      <div>
        <div style="font-weight:700; margin-bottom:6px; font-size:14px; color:#1e293b;">📊 出勤概況</div>
        <table class="table-compact">
          <tr><th>年度</th><th>完成</th><th>遲到</th><th>缺席</th></tr>
          ${Object.keys(yearlyMap).length > 0 ? Object.keys(yearlyMap).sort((a,b)=>b-a).map(year => `
            <tr>
              <td>${year}</td>
              <td>${yearlyMap[year].completed}</td>
              <td>${yearlyMap[year].late}</td>
              <td>${yearlyMap[year].no_show}</td>
            </tr>
          `).join('') : `
            <tr>
              <td>${currentYearStr}</td>
              <td>${completed}</td>
              <td>${late}</td>
              <td>${no_show}</td>
            </tr>
          `}
          <tr style="font-weight:700;">
            <td>生涯</td>
            <td>${career_completed || completed}</td>
            <td>${career_late || late}</td>
            <td>${career_no_show || no_show}</td>
          </tr>
        </table>
      </div>

      <hr style="margin:14px 0; border:0; border-top:1px solid #e2e8f0;">
      <div>
        <div style="font-weight:700; margin-bottom:8px; font-size:14px; color:#1e293b;">📊 角色執勤分布</div>
        <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap; justify-content: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
          <canvas id="roleChart" width="180" height="180" style="flex-shrink:0;"></canvas>
          <div id="roleChartLegend" style="display: flex; flex-direction: column; gap: 6px; font-size: 12px; flex: 1; min-width: 140px;"></div>
        </div>
      </div>
    </div>
  `;
  drawRoleChart(roleMap);

  callApi({ action: 'getTrainingLog', user_id: userId }, logRes => {
    const logs = logRes?.data || logRes?.logs || logRes?.enrollments || (Array.isArray(logRes) ? logRes : []);
    if (!Array.isArray(logs) || logs.length === 0) return;

    callApi({ action: 'getCourses' }, courseRes => {
      const courses = courseRes?.courses || courseRes?.data || (Array.isArray(courseRes) ? courseRes : []);
      const { yearHours, totalHours } = calcTrainingHoursFromLogs_(userId, logs, courses, currentYear);

      const finalYear = Math.max(trainingHoursYear, yearHours);
      const finalTotal = Math.max(trainingHoursTotal, totalHours);

      p.training_hours_year = finalYear;
      p.training_hours_total = finalTotal;

      const yrEl = document.getElementById('user-training-hours-year');
      const totEl = document.getElementById('user-training-hours-total');
      if (yrEl) yrEl.innerHTML = `${finalYear} <span style="font-size:12px; font-weight:normal;">小時</span>`;
      if (totEl) totEl.innerHTML = `${finalTotal} <span style="font-size:12px; font-weight:normal;">小時</span>`;
    });
  });
}

// 繪製圓餅圖並動態產生右側清晰圖例（Legend）
function drawRoleChart(data){
  const canvas = document.getElementById('roleChart');
  const legendContainer = document.getElementById('roleChartLegend');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const values = Object.values(data);
  const labels = Object.keys(data);
  const total = values.reduce((a,b)=>a+b, 0);

  const colorMap = {
    '主審':'#2563eb', '一壘審':'#16a34a', '二壘審':'#f59e0b',
    '三壘審':'#dc2626', '紀錄員':'#9333ea', '影像紀錄員':'#0ea5e9', '實習紀錄員':'#6b7280'
  };

  if (!total){
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText('目前尚無執勤紀錄', 40, 95);
    if (legendContainer) legendContainer.innerHTML = '<span style="color:#64748b;">尚無執勤資料</span>';
    return;
  }

  let start = 0;
  const centerX = 90;
  const centerY = 90;
  const radius = 70;

  values.forEach((v,i)=>{
    const slice = (v/total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, start, start+slice);
    ctx.closePath();
    ctx.fillStyle = colorMap[labels[i]] || '#999';
    ctx.fill();
    start += slice;
  });

  // 中間挖空呈現甜甜圈圖外觀
  ctx.beginPath();
  ctx.arc(centerX, centerY, 38, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(total + '場', centerX, centerY);

  // 產生右側圖例 HTML
  if (legendContainer) {
    legendContainer.innerHTML = labels.map((label, i) => {
      const count = values[i];
      const pct = Math.round((count / total) * 100);
      const color = colorMap[label] || '#999';
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 12px; height: 12px; background: ${color}; border-radius: 3px; display: inline-block; flex-shrink: 0;"></span>
            <span style="font-weight: 700; color: #1e293b;">${label}</span>
          </div>
          <span style="color: #64748b; font-weight: 600;">${count} 場 (${pct}%)</span>
        </div>
      `;
    }).join('');
  }
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


/*********************************************************
 * ✅ 系統公告模組 (CMS 前台顯示 + 管理員權限保護)
 *********************************************************/

function checkAdminPermission() {
  if (!session || !session.role) return false;
  const roles = session.role.split(',').map(r => r.trim());
  return roles.includes('admin');
}

function loadHomeAnnouncements() {
  const container = document.getElementById('home-notice-list');
  const adminBtn = document.getElementById('open-cms-btn');

  if (adminBtn) {
    if (checkAdminPermission()) {
      adminBtn.style.display = 'inline-block';
    } else {
      adminBtn.style.display = 'none';
    }
  }

  if (!container) return;

  container.innerHTML = `<div style="color: #64748b; font-size: 13px; padding: 8px;">⏳ 公告資料載入中...</div>`;

  try {
    callApi({ action: 'getAnnouncements' }, res => {
      if (!res) {
        container.innerHTML = `<div style="color: #dc2626; font-size: 13px; padding: 8px;">⚠️ 錯誤：後端回傳空白 (null)</div>`;
        return;
      }

      if (res.result !== 'ok') {
        container.innerHTML = `<div style="color: #dc2626; font-size: 13px; padding: 8px;">⚠️ 後端回傳錯誤：${res.message || '未知錯誤'}</div>`;
        return;
      }

      const list = res.announcements || [];
      if (list.length === 0) {
        container.innerHTML = `<div style="color: #64748b; font-size: 13px; padding: 8px;">目前尚無最新公告。</div>`;
        return;
      }

      container.innerHTML = list.map(item => {
          const pinBadge = Number(item.priority) === 99
            ? `<span style="background:#fee2e2; color:#dc2626; font-size:11px; font-weight:800; padding:2px 7px; border-radius:4px;">置頂</span>`
            : '';
          const titleText = item.title ? item.title : '';
    
          const headerRow = (pinBadge || titleText) ? `
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
              ${pinBadge}
              ${titleText ? `<span style="font-weight: 900; color: #1e3a8a; font-size: 13.5px;">📢 ${titleText}</span>` : ''}
            </div>
          ` : '';
    
          return `
            <div class="notice-item">
              ${headerRow}
              <div style="color: #334155; font-size: 13px; line-height: 1.6; word-break: break-word;">
                ${item.content_html}
              </div>
            </div>
          `;
        }).join('');
      
    });
  } catch (err) {
    container.innerHTML = `<div style="color: #dc2626; font-size: 13px; padding: 8px;">⚠️ 程式例外：${err.message}</div>`;
  }
}

function openAnnouncementAdmin() {
  if (!checkAdminPermission()) {
    alert('權限不足：只有系統管理員（admin）才能管理系統公告！');
    return;
  }

  const overlay = document.getElementById('cms-announcement-overlay');
  if (overlay) overlay.style.display = 'flex';
  resetCmsForm();
  loadAdminAnnouncementList();
}

function loadAdminAnnouncementList() {
  if (!checkAdminPermission()) return;

  const listEl = document.getElementById('cms-admin-list');
  if (!listEl) return;
  listEl.innerHTML = `<div style="color:#64748b; font-size:13px; text-align:center; padding:12px;">⏳ 讀取公告資料中...</div>`;

  callApi({ action: 'getAllAnnouncementsAdmin' }, res => {
    const list = res?.announcements || [];
    window._adminAnnouncements = list;

    if (!res || res.result !== 'ok' || list.length === 0) {
      listEl.innerHTML = `<div style="color:#64748b; font-size:13px; text-align:center; padding:12px;">目前沒有任何公告資料</div>`;
      return;
    }

    listEl.innerHTML = list.map(item => {
      const isActive = item.status === 'Y' || item.status === 'ACTIVE';
      const statusBadge = isActive
        ? `<span style="background:#dcfce7; color:#166534; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:800;">顯示中 (Y)</span>`
        : `<span style="background:#f1f5f9; color:#64748b; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:800;">已隱藏 (N)</span>`;

      const dateRange = (item.start_date || item.end_date)
        ? `📅 期間：${item.start_date || '即刻起'} ~ ${item.end_date || '永久'}`
        : `📅 期間：永久顯示`;

      return `
        <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:10px 12px; display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
          <div style="flex:1; min-width:0;">
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:4px;">
              <span style="background:#1e3a8a; color:#fff; font-size:11px; font-weight:800; padding:1px 6px; border-radius:4px;">ID #${item.announcement_id}</span>
              <span style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-size:11px; font-weight:800; padding:1px 6px; border-radius:4px;">優先權: ${item.priority}</span>
              ${statusBadge}
              <span style="font-size:11px; color:#64748b;">${dateRange}</span>
            </div>
            <div style="font-size:13px; color:#0f172a; line-height:1.4; word-break:break-word;">
              ${item.title ? `<strong>[${item.title}]</strong> ` : ''}${item.content_html}
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:4px; flex-shrink:0;">
            <button onclick="editAnnouncementItem(${item.announcement_id})" style="padding:4px 10px; font-size:12px; font-weight:700; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; border-radius:5px; cursor:pointer;">✏️ 編輯</button>
            <button onclick="removeAnnouncementItem(${item.announcement_id})" style="padding:4px 10px; font-size:12px; font-weight:700; background:#fef2f2; color:#dc2626; border:1px solid #fecaca; border-radius:5px; cursor:pointer;">🗑️ 刪除</button>
          </div>
        </div>
      `;
    }).join('');
  });
}

function editAnnouncementItem(id) {
  if (!checkAdminPermission()) return;
  const item = (window._adminAnnouncements || []).find(x => Number(x.announcement_id) === Number(id));
  if (!item) return;

  document.getElementById('cms-form-title').textContent = `✏️ 編輯公告 (ID #${item.announcement_id})`;
  document.getElementById('cms-id').value = item.announcement_id;
  document.getElementById('cms-title').value = item.title || '';
  document.getElementById('cms-priority').value = item.priority ?? 1;
  document.getElementById('cms-status').value = (item.status === 'Y' || item.status === 'ACTIVE') ? 'Y' : 'N';
  document.getElementById('cms-start').value = item.start_date || '';
  document.getElementById('cms-end').value = item.end_date || '';
  document.getElementById('cms-content').value = item.content_html || '';
}

function resetCmsForm() {
  document.getElementById('cms-form-title').textContent = '➕ 新增公告';
  document.getElementById('cms-id').value = '';
  document.getElementById('cms-title').value = '';
  document.getElementById('cms-priority').value = '1';
  document.getElementById('cms-status').value = 'Y';
  document.getElementById('cms-start').value = '';
  document.getElementById('cms-end').value = '';
  document.getElementById('cms-content').value = '';
}

function submitAnnouncementForm() {
  if (!checkAdminPermission()) {
    alert('權限不足！');
    return;
  }

  const content = document.getElementById('cms-content').value.trim();
  if (!content) {
    alert('請輸入公告內文！');
    return;
  }

  const btn = document.getElementById('cms-submit-btn');
  btn.disabled = true;
  btn.textContent = '儲存中...';

  const payload = {
    action: 'saveAnnouncement',
    announcement_id: document.getElementById('cms-id').value,
    title: document.getElementById('cms-title').value.trim(),
    priority: document.getElementById('cms-priority').value || 1,
    status: document.getElementById('cms-status').value,
    start_date: document.getElementById('cms-start').value,
    end_date: document.getElementById('cms-end').value,
    content_html: content
  };

  callApi(payload, res => {
    btn.disabled = false;
    btn.textContent = '💾 儲存公告';

    if (!res || res.result !== 'ok') {
      alert('儲存失敗：' + (res?.message || '未知錯誤'));
      return;
    }

    resetCmsForm();
    loadAdminAnnouncementList();
    loadHomeAnnouncements();
  });
}

function removeAnnouncementItem(id) {
  if (!checkAdminPermission()) return;
  if (!confirm(`確定要刪除公告 ID #${id} 嗎？刪除後無法復原。`)) return;

  callApi({ action: 'deleteAnnouncement', announcement_id: id }, res => {
    if (!res || res.result !== 'ok') {
      alert('刪除失敗：' + (res?.message || '未知錯誤'));
      return;
    }
    loadAdminAnnouncementList();
    loadHomeAnnouncements();
  });
}

/*********************************************************
 * 🎨 CMS 公告內文格式化工具列輔助函式
 *********************************************************/
function formatText(tag) {
  const textarea = document.getElementById('cms-content');
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selectedText = text.substring(start, end);

  let replacement = '';
  if (tag === 'strong') {
    replacement = `<strong>${selectedText || '粗體文字'}</strong>`;
  } else if (tag === 'em') {
    replacement = `<em>${selectedText || '斜體文字'}</em>`;
  } else if (tag === 'u') {
    replacement = `<u>${selectedText || '底線文字'}</u>`;
  } else if (tag === 'a') {
    const url = prompt('請輸入連結網址 (URL):', 'https://');
    if (!url) return;
    replacement = `<a href="${url}" target="_blank">${selectedText || '連結文字'}</a>`;
  } else if (tag === 'br') {
    replacement = '<br>';
  }

  textarea.value = text.substring(0, start) + replacement + text.substring(end);
  textarea.focus();
  
  const newCursorPos = start + replacement.length;
  textarea.setSelectionRange(newCursorPos, newCursorPos);
}
