/*********************************************************
 ✅ category 顏色系統（5色制）
*********************************************************/

// ✅ 固定三組
const CATEGORY_COLOR_MAP = {
  '大聯盟': 'card-mlb',
  '小聯盟': 'card-minor',
  '週六育成': 'card-training'
};

// ✅ 備用兩組
const CATEGORY_FALLBACK = [
  'card-extra-1',
  'card-extra-2'
];

// ✅ 動態分配
function getCategoryClass(category){

  if (!category) return '';

  // ✅ 固定命中（改這裡）
  for (let key in CATEGORY_COLOR_MAP){
    if (category.indexOf(key) === 0){
      return CATEGORY_COLOR_MAP[key];
    }
  }

  // ✅ fallback pool
  if (!window.__catPool){
    window.__catPool = {};
  }

  if (!window.__catPool[category]){

    const keys = Object.keys(window.__catPool);
    const idx = keys.length;

    window.__catPool[category] =
      CATEGORY_FALLBACK[idx % CATEGORY_FALLBACK.length];
  }

  return window.__catPool[category];
}

/*********************************************************
 ✅ 班表主卡片（唯一UI）
*********************************************************/
function renderGameCard(g, opt={}){

  const s = Number(g.status || 0);
  
  // ✅ 暫存 → 不顯示
  if (s === 3){
    return '';
  }

  // ✅ ✅ ✅ 鎖定
 
  const session =
    opt.session
    || (typeof getSession === 'function'
        ? getSession()
        : JSON.parse(localStorage.getItem('session_user')||'{}'));
 
  const isViewMode = opt.mode === 'view';

  // ✅ ✅ ✅ 自動判斷頁面（核心封裝）
  let type = opt.type;

  if (!type){
    if (document.body.classList.contains('page-record')){
      type = 'record';
    } else {
      type = 'judge';
    }
  }


  const isRecordPage = (type === 'record');


  const isPast = isPastGame(g.date);
  const judgeRoles = getJudgeRoles(g);


  const recordRoles = [
    ['REC_MAIN','紀錄'],
    ['REC_TRAINEE','見習'],
    ['REC_VIDEO','影像']
  ];


  // const conflict = isTimeConflict(g);
  const conflictInfo = checkConflictFront(g, __GAME_CACHE, session);
  const conflict = conflictInfo.conflict;
  const myRole = g.my_position;
  const teamConflict = isMyTeamConflict(g, session);  // 母隊衝突判斷定義

  console.log(
  'TEAM CHECK →',
  'userTeam=', session?.team,
  'home=', g.home_team,
  'away=', g.away_team,
  'result=', teamConflict
);

  function getReason(targetRole, isRecordSlot){
  
    // ✅ ✅ ✅ 改用新的衝突判斷（含 buffer + 場地）
    if (conflict){
  
      if (conflictInfo){
        return conflictInfo.isSameField
          ? '⏱️'
          : '🚗';
      }
  
      return '時間衝突';
    }
  
    if (!myRole) return '';
  
    const myIsRecord = myRole.startsWith('REC');
  
    // ✅ ✅ ✅ 裁判 VS 裁判（維持）
    if (!myIsRecord && !isRecordSlot){
      if (myRole !== targetRole){
        return '待位';
      }
    }
  
    // ✅ ✅ ✅ 紀錄 VS 紀錄（放開）
    if (myIsRecord && isRecordSlot){
      return '';
    }
  
    // ✅ ✅ ✅ 裁判 vs 紀錄（互斥）
    if (myIsRecord && !isRecordSlot){
      return '紀錄';
    }
  
    if (!myIsRecord && isRecordSlot){
      return '裁判';
    }
  
    return '';
  }

    const catClass = getCategoryClass(g.category);
 
    let statusBanner = '';
    
    if (s === 1){
      statusBanner = '<div class="row-warning">⚠️延賽</div>';
    }
    if (s === 2){
      statusBanner = '<div class="row-warning">⛔停賽</div>';
    }
    if (s === 4){
      statusBanner = '<div class="row-warning">🔒鎖定</div>';
    }
 
  return `

      <div class="game-card 
        ${catClass}
        ${isPast?'expired-card':''} 
        ${s === 1 ? 'postponed' : ''} 
        ${s === 2 ? 'stopped' : ''}
        ${s === 4 || teamConflict ? 'locked' : ''} 
      "
       id="game-${g.game_id}"
       data-type="${type}">

     
    <div class="row-top">
      <div class="left">${formatDateTW(g.date)}</div>
      <div class="center">${g.category||''}</div>
      <div class="right">${g.field||''}</div>
    </div>    
    ${statusBanner}
    ${teamConflict ? `<div class="row-warning">⚠️ 不可報名自己母隊的比賽</div>` : ''}

    <!-- 警告同場訊息　renderGameCard WARNING -->
        ${(() => {
        
          // ✅ ✅ ✅ 掃本場你擔任的角色（關鍵🔥）
          let myRoleHere = null;
        
          // 👉 裁判
          for (let [r,j] of Object.entries(g.judges || {})){
            if (isMySlot(j, session)){
              myRoleHere = r;
              break;
            }
          }
        
          // 👉 紀錄
          if (!myRoleHere){
            for (let [r,v] of Object.entries(g.records || {})){
              if (isMySlot(v, session)){
                myRoleHere = r;
                break;
              }
            }
          }
        
          // ✅ ✅ ✅ 本場有角色 → 判斷是否要顯示
          if (myRoleHere){
        
            const isMyRecord = myRoleHere.startsWith('REC');
        
            // ✅ 紀錄頁 + 你是裁判 → 顯示（你現在這個case🔥）
            if (isRecordPage && !isMyRecord){
              return `
                <div class="row-warning">
                  ⚠️ 本場已擔任${roleTextMap(myRoleHere)}
                </div>
              `;
            }
        
            // ✅ 裁判頁 + 你是紀錄 → 顯示
            if (!isRecordPage && isMyRecord){
              return `
                <div class="row-warning">
                  ⚠️ 本場已擔任${roleTextMap(myRoleHere)}
                </div>
              `;
            }
          }
        
          // ✅ ✅ ✅ 再判斷「同時間其他場」
          if (conflict && !isPast){
          
            const ref = conflictInfo.ref;
          
            return `
              <div class="row-warning">
                ⚠️ 時間衝突（本日已有其他場次）
                <div class="sub">
                  ${ref.game_code} ${getTime(ref)}｜${ref.field}
                  ${conflictInfo.isSameField ? '（同場地 +30mins）' : '（跨場地 +60mins）'}
                </div>
              </div>
            `;
          }
        
          return '';
        
        })()}


    <div class="row-mid">
      <div class="team">${g.away_team||''}</div>


      <div class="center-box">
        <div class="game-code">${g.game_code||''}</div>
        <div class="time">${getTime(g)}</div>
      </div>


      <div class="team">${g.home_team||''}</div>
    </div>


    <div class="row-bottom">


      <!-- ✅ 裁判 -->
      ${
        !isRecordPage
        ? (
          judgeRoles.length === 0
          ? `<div class="no-judge">無需裁判</div>`
          : judgeRoles.map(role=>{


              //const name = g.judges?.[role];
           
              const slot = g.judges?.[role];
              const name = safeName(slot);

              const reason = getReason(role,false);
              const locked = isSameTimeOtherFieldLocked(g);


              if (name){
                // const session = JSON.parse(localStorage.getItem('session_user')||'{}');
                const isMe = isMySlot(slot, session);


                return `
                <div class="slot" data-gid="${g.game_id}" data-role="${role}">
                  <div class="label">${roleMap(role)}</div>
                  <div class="name ${isMe?'me':''} ${String(slot.name || slot).length > 10 ? 'long' : ''}">${typeof slot === 'object' ? slot.name : slot}</div>
                  ${
                    // isMe && !isPast
                   isMe && !isPast && !isViewMode && ![1,2,4].includes(s)
                    ? `
                    <div class="cancel" onclick="event.stopPropagation(); handleSlotClick('${g.game_id}','${role}')">取消</div>
                       `
                    : ''
                  }
                </div>`;
              }


              if (isPast){
                return `<div class="slot" data-gid="${g.game_id}" data-role="${role}"><div class="label">${roleMap(role)}</div><div class="name">—</div></div>`;
              }


              if (teamConflict || reason || locked){
                return `
                  <div class="slot waiting">
                    <div class="label">${roleMap(role)}</div>
                    <div class="name">
                      ${teamConflict ? '不可報名' : (locked ? '待位' : reason)}
                    </div>
                  </div>`;


              }

             if (isViewMode){
               return `
                 <div class="slot waiting">
                   <div class="label">${roleMap(role)}</div>
                   <div class="name">待位中</div>
                 </div>
               `;
             }
             
                  // const s = Number(g.status || 0);
                  // const isDisabled = [1,2,4].includes(s);
                  
                  if ([1,2,4].includes(s)){
                    return `
                      <div class="slot locked">
                        <div class="label">${roleMap(role)}</div>
                        <div class="name">
                          ${s === 1 ? '延賽' : s === 2 ? '停賽' : '🔒 鎖定'}
                        </div>
                      </div>
                    `;
                  }
            
            return `
              <div class="slot action" onclick="handleSlotClick('${g.game_id}','${role}')">
                <div class="label">${roleMap(role)}</div>
                <div class="btn">報名</div>
              </div>
            `;

          }).join('')
        ) : ''
      }

      <!-- ✅ 紀錄 -->
      ${
        isRecordPage
        ? recordRoles.map(([role,label])=>{
      
          const slot = g.records?.[role];
          const reason = getReason(role,true);
          const locked = isSameTimeOtherFieldLocked(g);
      
          // ✅ ✅ ✅ 🔥 1. 母隊鎖（最高優先）
          if (teamConflict){
            return `
              <div class="slot locked">
                <div class="label">${label}</div>
                <div class="name">不可報名</div>
              </div>
            `;
          }
      
          // ✅ 有人
          if (slot){
      
            const isMe = isMySlot(slot, session);
      
            return `
            <div class="slot" data-gid="${g.game_id}" data-role="${role}">
              <div class="label">${label}</div>
              <div class="name ${isMe?'me':''}">
                ${slot.name}
              </div>
              ${
                isMe && !isPast && !isViewMode && ![1,2,4].includes(s)
                ? `
                <div class="cancel" onclick="event.stopPropagation(); handleSlotClick('${g.game_id}','${role}')">取消</div>
                `
                : ''
              }
            </div>`;
          }
      
          // ✅ 過期
          if (isPast){
            return `
              <div class="slot">
                <div class="label">${label}</div>
                <div class="name">—</div>
              </div>`;
          }
      
          // ✅ 待位 / 衝突
          if (reason || locked){
            return `
              <div class="slot waiting">
                <div class="label">${label}</div>
                <div class="name">
                  ${locked ? '待位' : reason}
                </div>
              </div>`;
          }
      
          // ✅ view 模式
          if (isViewMode){
            return `
              <div class="slot waiting">
                <div class="label">${label}</div>
                <div class="name">待位中</div>
              </div>`;
          }
      
          // ✅ status 控制
          if ([1,2,4].includes(s)){
            return `
              <div class="slot locked">
                <div class="label">${label}</div>
                <div class="name">
                  ${s === 1 ? '延賽' : s === 2 ? '停賽' : '🔒 鎖定'}
                </div>
              </div>
            `;
          }
      
          // ✅ ✅ ✅ 正常報名
          return `
            <div class="slot action"
              onclick="handleSlotClick('${g.game_id}','${role}')">
              <div class="label">${label}</div>
              <div class="btn">報名</div>
            </div>
          `;
      
        }).join('')
        : ''
      }

    </div>
  </div>
  `;
}

/* =========================
 ✅ 不同場提醒
========================= */
function getSameDayOtherFieldGames(g){

  const s = getSession ? getSession() : JSON.parse(localStorage.getItem('session_user')||'{}');
  if (!g || !g.date || !s?.user_id) return [];

  return __GAME_CACHE.filter(x => {

    if (x.game_id === g.game_id) return false;
    if (x.date !== g.date) return false;

    const judgeHit = Object.values(x.judges || {}).some(j =>
      isMySlot(j, s)
    );

    const recordHit = Object.values(x.records || {}).some(r =>
      isMySlot(r, s)
    );

    if (!judgeHit && !recordHit) return false;

    const t1 = new Date(x.date + ' ' + getTime(x)).getTime();
    const t2 = new Date(g.date + ' ' + getTime(g)).getTime();

    const overlap =
      Math.abs(t1 - t2) < ((g.duration || 120) * 60000);

    if (overlap) return false;

    return x.field !== g.field;
  });
}


/* =========================
 ✅ 同時間另一場（提示用）
========================= */
function toMinutes(t){
  if (!t) return 0;
  const [h,m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getOtherGameSameDay(g){

  const s = getSession ? getSession() : JSON.parse(localStorage.getItem('session_user')||'{}');
  if (!g || !g.date || !s?.user_id) return null;

  const t = toMinutes(getTime(g));

  for (let x of __GAME_CACHE){

    if (x.game_id === g.game_id) continue;
    if (x.date !== g.date) continue;

    let role = null;

    // ✅ 裁判
    for (let [r,j] of Object.entries(x.judges || {})){
      if (isMySlot(j, s)){
        role = r;
        break;
      }
    }

    // ✅ 紀錄
    if (!role){
      for (let [r,v] of Object.entries(x.records || {})){
        if (isMySlot(v, s)){
          role = r;
          break;
        }
      }
    }

    if (!role) continue;

    // ✅ ✅ ✅ 用分鐘比（重要）
    const t2 = toMinutes(getTime(x));

    if (Math.abs(t2 - t) > 5) continue; // 允許5分鐘誤差

    return {
      game: x,
      role: role
    };
  }

  return null;
}


/* =========================
 ✅ 班表：裁判 slot（統一版）
========================= */
function renderJudgeSlots(g, isPast, session){

  const roles = ['PU','U1','U2','U3'];

  return `
    <div class="mobile-pos-labels">
      <div>主審</div>
      <div>一壘</div>
      <div>二壘</div>
      <div>三壘</div>
    </div>

    <div class="mobile-pos-grid">
      ${roles.map(role=>{

        //const name = g.judges?.[role];
       
        const slot = g.judges?.[role];
        const name = safeName(slot);


        // ✅ 有人
        if (name){
          const slot = g.judges?.[role];
          const isMe = isMySlot(slot, session);

          const s = Number(g.status || 0);
          
          if ([1,2,4].includes(s)){
            return `
              <div class="mobile-pos">
                <span>${s === 1 ? '延賽' : s === 2 ? '停賽' : '🔒鎖定'}</span>
              </div>
            `;
          }
          
          return `
            <div class="mobile-pos">
              <span class="${isMe?'mobile-judge-me':''}">
                ${name}
              </span>

             ${
               isMe && !isPast && !isViewMode
               ? `<div class="mobile-cancel"
                    onclick="event.stopPropagation(); handleSlotClick('${g.game_id}','${role}')">
                    取消</div>`
               : ''
             }

            </div>
          `;

        }

        // ✅ ✅ ✅ 過期：完全不能操作
        if (isPast){
          return `<div class="mobile-pos">—</div>`;
        }

        // ✅ ✅ ✅ 已有其它站位
        if (g.my_position && g.my_position !== role){
          return `
            <div class="slot waiting">
              <div class="label">${roleMap(role)}</div>
              <div class="name">待位</div>
            </div>`;
        }

        // ✅ ✅ ✅ 可報名
           // const s = Number(g.status || 0);
           
           if ([1,2,4].includes(s)){
             return `
               <div class="mobile-pos">
                 <span>${s === 1 ? '延賽' : s === 2 ? '停賽' : '🔒鎖定'}</span>
               </div>
             `;
           }
           
           return `
             <div class="mobile-pos">
               <div class="mobile-pos-btn"
                 onclick="handleSlotClick('${g.game_id}','${role}')">
                 報名
               </div>
             </div>
           `;
      }).join('')}
    </div>
  `;
}


/* =========================
 ✅ 班表：紀錄 slot（統一版）
========================= */
function renderRecordSlots(g, isPast, session){

  const teamConflict = isMyTeamConflict(g, session);
 
  const roles = [
    ['REC_MAIN','紀錄'],
    ['REC_TRAINEE','見習'],
    ['REC_VIDEO','影像']
  ];

  return `
    <div class="record-roles">
      ${roles.map(([role,label]) => {

        const slot = g.records?.[role];

        // ✅ 有人
        if (slot){
          
          const isMe = isMySlot(slot, session);

          return `
            <div class="record-role ${isMe?'me':'other'}">
              ${label}<br>${slot.name}
              ${
                // isMe && !isPast
               isMe && !isPast && !isViewMode && ![1,2,4].includes(s)
                ? `<div class="cancel-btn"
                     onclick="event.stopPropagation(); handleSlotClick('${g.game_id}','${role}')">
                     取消
                   </div>`
                : ''
              }
            </div>
          `;
        }

      // ✅ ✅ ✅ 同場已有角色 或 時間衝突 → 待位
      // const conflict = isTimeConflict(g);
      const conflictInfo = checkConflictFront(g, __GAME_CACHE, session);
      const conflict = conflictInfo.conflict;
      
      if (
        teamConflict ||
        (g.my_position && g.my_position !== role)
        || conflict
      ){
        return `
          <div class="record-role other waiting">
            ${label}<br>
            ${teamConflict ? '不可報名' : '待位'}
          </div>
        `;
      }
      
      // ✅ 過期不可操作
      if (!canSignup(g)){
        return `<div class="record-role other">${label}<br>—</div>`;
      }
      
      // ✅ ✅ ✅ 加這段（重點🔥）
      const s = Number(g.status || 0);
      if (s === 3) return '';
      if ([1,2,4].includes(s)){
        return `
          <div class="record-role other">
            ${label}<br>
            ${s === 1 ? '延賽' : s === 2 ? '停賽' : '🔒鎖定'}
          </div>
        `;
      }
      
      // ✅ ✅ ✅ 正常可報名
      if (teamConflict){
        return `
          <div class="record-role other">
            ${label}<br>不可報名
          </div>
        `;
      }
      
      return `
        <div class="record-role action"
          onclick="handleSlotClick('${g.game_id}','${role}')">
          ＋${label}
        </div>
      `;
      
      }).join('')}
    </div>
  `;
}

/* =========================
 ✅ 班表：手機 render（裁判）
========================= */
function renderMobileJudge(list, session){

  const root = document.getElementById('mobileView');
  root.innerHTML = '';

  list.forEach(g => {
    root.innerHTML += renderGameCard(g, {
      type:'judge',
      session
    });
  });
}


/* =========================
 ✅ 班表：手機 render（紀錄）
========================= */
function renderMobileRecord(list, session){

  const root = document.getElementById('mobileView');
  root.innerHTML = '';

  list.forEach(g => {
    root.innerHTML += renderGameCard(g, {
      type:'record',
      session
    });
  });
}



/*********************************************************
 * ✅ ✅ ✅ 班表名字高亮
*********************************************************/
function highlight(name, session){

  if (!name) return '';

  if (session && name === session.name){
    return `
      <span style="
        background:#dbeafe;
        color:#1d4ed8;
        padding:3px 6px;
        border-radius:6px;">
        ${name}
      </span>
    `;
  }

  return `<span style="white-space:nowrap;">${name}</span>`;
}

/*********************************************************
 * ✅ 報名系統完整版本 - slot 點擊判斷（核心）
*********************************************************/
function handleSlotClick(gid, role){

  console.log('CLICK OK', gid, role);
 
  const gidNum = Number(gid);
  const g = __GAME_CACHE.find(x => Number(x.game_id) === gidNum);

  console.log('my_position=', g.my_position);

  if (!g) return;

  const s = getSession ? getSession() : JSON.parse(localStorage.getItem('session_user')||'{}');
  if (!s || !s.user_id) return;
 
  console.log('session=', s);

  const isRecord = role.startsWith('REC');

  // ✅ 取得 slot
  const slot = isRecord
    ? g.records?.[role]
    : g.judges?.[role];

  const isMe = isMySlot(slot, s);
 
  console.log('isMe=', isMe);
  console.log('slot=', slot);


  // ✅ ✅ ✅ 如果是自己 → 取消
  if (isMe){
    if (isRecord){
      cancelRecord(g, role);
    } else {
      cancelJudge(g, role);
    }
    return;
  }

  // ✅ ✅ ✅ 驗證是否可報名
  const err = validateSignup(g, role);
  if (err){
    showToast(err,'error');
    return;
  }

  // ✅ ✅ ✅ 報名
  if (isRecord){
    signupRecord(g, role);
  } else {
    signupJudge(g, role);
  }
}




/*********************************************************
 * ✅ 報名系統完整版本 - 報名功能
*********************************************************/

// ✅ 報名（裁判）
function signupJudge(g, role){

  const s = JSON.parse(localStorage.getItem('session_user') || '{}');

  const el = document.getElementById(`game-${g.game_id}`);
  if (el) el.classList.add('loading');   // ✅ ✅ ✅ 加在這

  showToast('報名中...');

  callApi({
    action:'judgeSignupByGames',
    user_id: s.user_id,
    games_with_position:`${g.game_id}:${role}`
  }, res => {

    if (el) el.classList.remove('loading');

    if (res.result === 'ok'){

      // ✅ ✅ ✅ 直接改資料
     
      g.judges ||= {};

      g.judges[role] = {
        user_id: s.user_id,
        name: s.name
      };
     
      g.my_position = role;

      // updateGameCard(g, 'judge');   // ✅ ✅ ✅ 重點（不用 render）
      updateAffectedCards(g);

      showToast('✅ 已報名','success');

    } else {
      showToast(res?.message || '失敗','error');
    }

  });
}

// ✅ 報名（紀錄）
function signupRecord(g, role){

  const s = JSON.parse(localStorage.getItem('session_user') || '{}');

  const el = document.getElementById(`game-${g.game_id}`);
  if (el) el.classList.add('loading');

  showToast('報名中...');   // ✅ 加這行

  callApi({
    action:'recordSignup',
    game_id: g.game_id,
    user_id: s.user_id,
    record_role: role
  }, res => {

    if (el) el.classList.remove('loading');

    if (res.result === 'ok'){

      g.records ||= {};

      g.records[role] = {
        user_id: s.user_id,
        name: s.name
      };

      g.my_position = role;

      // updateGameCard(g);
      updateAffectedCards(g);

      showToast('✅ 已報名','success');

    } else {
      showToast(res?.message || '失敗','error');
    }

  });
}

// ✅ 取消（裁判）完整最終版
function cancelJudge(g, role){

  const s = JSON.parse(localStorage.getItem('session_user') || '{}');

  console.log('CANCEL by game:', g.game_id, role);

  const el = document.getElementById(`game-${g.game_id}`);
  if (el) el.classList.add('loading');

  showToast('取消中...');

  callApi({
    action: 'cancelJudgeSignup', 
    user_id: s.user_id,
    game_id: g.game_id,
    role: role
  }, function(res){

    if (el) el.classList.remove('loading');

    if (res && res.result === 'ok'){

      // ✅ 清資料
      if (g.judges) g.judges[role] = null;

      g.my_position = '';
      g.my_signup_id = '';

      updateAffectedCards(g);

      showToast('✅ 已取消','success');

    } else {
      showToast(res?.message || '取消失敗','error');
    }

  });
}




//✅ 取消（紀錄）
function cancelRecord(g, role){

  const s = JSON.parse(localStorage.getItem('session_user') || '{}');

  const el = document.getElementById(`game-${g.game_id}`);
  if (el) el.classList.add('loading');

  showToast('取消中...');

  callApi({
    action:'cancelRecordSignup',
    game_id: g.game_id,
    user_id: s.user_id,
    record_role: role
  }, res => {

    if (el) el.classList.remove('loading');

    if (res.result === 'ok'){

      if (g.records) g.records[role] = null;   // ✅ ✅ ✅ 關鍵

      g.my_position = '';

      //updateGameCard(g);

      //reloadCurrentView();
      updateAffectedCards(g)

      showToast('✅ 已取消','success');

    } else {
      showToast('取消失敗','error');
    }

  });
}


//✅ 共用刷新
function reloadGames(){

  // 👉 直接重叫你現有方法（不用改）
  if (typeof openMySchedule === 'function'){
    openMySchedule();
  }

  if (typeof openWeeklySchedule === 'function'){
    openWeeklySchedule();
  }

  if (typeof loadDashboard === 'function'){
    loadDashboard();
  }
}

// ✅ 👉 重畫畫面
function renderFromCache(){

  const session = getSession();

  const list = document.getElementById('my-schedule-list');
  if (list){
    list.innerHTML = __GAME_CACHE
      .filter(g=>g.my_position)
      .map(g=>renderGameCard(g,{session}))
      .join('');
  }

  const weekly = document.getElementById('weeklyContent');
  if (weekly){
    weekly.innerHTML = __GAME_CACHE
      .map(g=>renderGameCard(g,{session}))
      .join('');
  }
}

/*********************************************************
 * ✅ 設定資料（由 index.js 呼叫）
 *********************************************************/
let __GAME_CACHE = [];

function setGameCache(list){
  __GAME_CACHE = list;
}

/*********************************************************
 * ✅ 報名系統 - 時間衝堂判斷（核心）
 *********************************************************/

function isTimeConflict(targetGame){

  const tStart = new Date(targetGame.date + ' ' + getTime(targetGame)).getTime();
  const tEnd   = tStart + (targetGame.duration || 120)*60000;

  return __GAME_CACHE.some(g=>{
    if (!g.my_position) return false;
    if (g.game_id === targetGame.game_id) return false;

    const gStart = new Date(g.date + ' ' + getTime(g)).getTime();
    const gEnd   = gStart + (g.duration || 120)*60000;

    return (tStart < gEnd && tEnd > gStart);
  });
}

/*********************************************************
 ✅ 母隊衝突判斷
*********************************************************/
function isMyTeamConflict(game, session){

  if (!game || !session) return false;

  const userTeam =
    (game.user_team || session.team || '').trim();

  if (!userTeam) return false;

  const home = (game.home_team || '').trim();
  const away = (game.away_team || '').trim();

  return (userTeam === home || userTeam === away);
}


/*********************************************************
 * ✅ 聯盟級報名規則引擎（唯一核心）
 *********************************************************/
function validateSignup(targetGame, role){
 
  // ✅ ✅ ✅ 母隊限制（最高優先）
  if (isMyTeamConflict(targetGame, getSession())){
    return '❌ 不可報名自己母隊的比賽';
  }
 
  const isRecord = role.startsWith('REC');

  /************* ✅ 同場限制 *************/
  if (targetGame.my_position){

    // ✅ ✅ ✅ 重點：如果是「同一個位置」（取消流程）→放行
    if (targetGame.my_position === role){
      return '';
    }

    // ✅ 已是裁判
    if (!targetGame.my_position.startsWith('REC')){
      return '❌ 同一場裁判只能一個角色，且不能兼紀錄';
    }

    // ✅ 已是紀錄
    if (!isRecord){
      return '❌ 已報名紀錄，不可再擔任裁判';
    }
  }

  /************* ✅ 欄位是否已滿（修正版） *************/
  const occupied =
    (targetGame.judges && targetGame.judges[role]) ||
    (targetGame.records && targetGame.records[role]);

  if (occupied && targetGame.my_position !== role){
    return '❌ 該位置已有人';
  }

  /************* ✅ 跨場時間衝堂 *************/
  const tStart = new Date(targetGame.date + ' ' + getTime(targetGame)).getTime();
  const tEnd   = tStart + (targetGame.duration || 120) * 60000;

  for (let g of __GAME_CACHE){

    if (!g.my_position) continue;
    if (g.game_id === targetGame.game_id) continue;

    const gStart = new Date(g.date + ' ' + getTime(g)).getTime();
    const gEnd   = gStart + (g.duration || 120) * 60000;

    if (tStart < gEnd && tEnd > gStart){
      return '❌ 同場角色時間衝突';
    }
  }

  return '';
}

/*********************************************************
 * ✅ Toast 系統（取代 alert）
 *********************************************************/
function showToast(msg, type='normal'){

  let el = document.getElementById('_toast');

  if (!el){
    el = document.createElement('div');
    el.id = '_toast';
    document.body.appendChild(el);
  }

  let bg = '#374151';

  if (type === 'error') bg = '#dc2626';
  if (type === 'success') bg = '#16a34a';

  el.innerHTML = msg;

  el.style.cssText = `
    position:fixed;
    top:20px;
    left:50%;
    transform:translateX(-50%);
    background:${bg};
    color:#fff;
    padding:10px 16px;
    border-radius:8px;
    font-size:14px;
    z-index:9999;
    opacity:0;
    transition:.25s;
  `;

  setTimeout(()=> el.style.opacity = 1, 10);
  setTimeout(()=> el.style.opacity = 0, 4000);
}


/*********************************************************
 ✅ 時間統一
*********************************************************/
function getTime(g){

  if (!g) return '';

  // ✅ 已是字串（正常）
  if (typeof g.time === 'string'){
    if (g.time.includes(':')) return g.time;
  }

  // ✅ 避免 1899 bug
  if (g.time_range){
    return String(g.time_range).substring(0,5);
  }

  // ✅ fallback
  return '';
}

/*********************************************************
 ✅ 過期判斷
*********************************************************/
function isPastGame(dateStr){
  const today = new Date();
  today.setHours(0,0,0,0);

  const d = new Date((dateStr||'').replace(/\//g,'-'));
  d.setHours(0,0,0,0);

  return d < today;
}

/*********************************************************
 ✅ 日期格式：改成 月／日（星期），例：5/31(日)
*********************************************************/
function formatDateTW(dateStr){

  if (!dateStr) return '';

  const d = new Date(dateStr.replace(/\//g,'-'));
  const m = d.getMonth() + 1;
  const day = d.getDate();

  const w = ['日','一','二','三','四','五','六'][d.getDay()];

  return `${m}/${day}(${w})`;
}

/* =========================
 ✅ 可報名判斷（統一規則）
========================= */
function canSignup(g){
  if (!g) return false;

  // ✅ 過期一律不能報
  if (isPastGame(g.date)) return false;

  return true;
}


/*********************************************************
 ✅ 裁判站位
*********************************************************/
function getJudgeRoles(g){

  const count =
    Number(g.umpire_count)
    || Number(g.need_count)
    || 0;

  if (count === 0) return [];
  if (count === 1) return ['PU'];
  if (count === 2) return ['PU','U1'];
  if (count === 3) return ['PU','U1','U3'];
  return ['PU','U1','U2','U3'];
}

function roleMap(r){
  return {
    PU:'主審',
    U1:'一壘',
    U2:'二壘',
    U3:'三壘'
  }[r] || r;
}


/* =========================
 ✅ 統一 reload（裁判/紀錄共用）
========================= */
// 整頁重整
function reloadCurrentView(){

  const now = new Date();

  console.log('🔄 reloadCurrentView', window.currentMonth);

  // 👉 記得用 window（避免 scope 問題）
  if (window.currentMonth !== null){

    if (typeof loadJudgeGamesByMonth === 'function'){
      loadJudgeGamesByMonth(
        window.currentYear || now.getFullYear(),
        window.currentMonth
      );
    }

    if (typeof loadRecordGamesByMonth === 'function'){
      loadRecordGamesByMonth(
        window.currentYear || now.getFullYear(),
        window.currentMonth
      );
    }

  } else {

    if (typeof loadGames === 'function'){
      loadGames();
    }
  }
}

//局部重整
function updateAffectedCards(targetGame){

  const session = getSession ? getSession() : JSON.parse(localStorage.getItem('session_user')||'{}');
  if (!targetGame) return;

  const t1 = toMinutes(getTime(targetGame));

  __GAME_CACHE.forEach(g => {

    // ✅ 同一天
    if (g.date !== targetGame.date) return;

    const t2 = toMinutes(getTime(g));

    // ✅ 同時間（±5分鐘）
    if (Math.abs(t1 - t2) > 5) return;

    // ✅ 更新這些卡片
    updateGameCard(g);

  });
}

/* =========================
 ✅ UI 安全顯示
========================= */
function safeName(slot){
  if (!slot) return '';
  if (typeof slot === 'string') return slot;
  return slot.name || '';
}

/* =========================
 ✅ 局部更新函式
========================= */
function updateGameCard(g){

  const el = document.getElementById(`game-${g.game_id}`);
  if (!el) return;

  const type = el.dataset.type || 'record';

  // ✅ ✅ ✅ 用統一來源
  const session = getSession ? getSession() : JSON.parse(localStorage.getItem('session_user')||'{}');

  // el.classList.add('loading');

  el.insertAdjacentHTML('afterend',
    renderGameCard(g,{ type, session })
  );
  el.remove();

}


/* =========================
 ✅ 統一 slot 判斷
========================= */
function isMySlot(slot, session){

  if (!slot || !session) return false;

  // ✅ object
  if (typeof slot === 'object'){

    // ✅ user_id 比對（轉字串避免型別問題）
    if (slot.user_id){
      return String(slot.user_id) === String(session.user_id);
    }

    // ✅ 補強：用 name 比（fallback）
    if (slot.name){
      return slot.name === session.name;
    }
  }

  // ✅ string
  if (typeof slot === 'string'){
    return slot === session.name;
  }

  return false;
}

/* =========================
 ✅ 中文名稱
========================= */
function roleTextMap(role){

  const map = {
    PU:'主審',
    U1:'一壘審',
    U2:'二壘審',
    U3:'三壘審',
    REC_MAIN:'紀錄員',
    REC_TRAINEE:'見習紀錄員',
    REC_VIDEO:'影像紀錄員'
  };

  return map[role] || role;
}

/* =========================
 ✅ 同一時間 → 只能在一個場地報名
========================= */
function isSameTimeOtherFieldLocked(g){

  const s = getSession ? getSession() : JSON.parse(localStorage.getItem('session_user')||'{}');
  if (!g || !s?.user_id) return false;

  const t = getTime(g);

  return __GAME_CACHE.some(x => {

    if (x.game_id === g.game_id) return false;
    if (x.date !== g.date) return false;

    // ✅ 同時間
    const t1 = toMinutes(getTime(g));
    const t2 = toMinutes(getTime(x));
    
    if (Math.abs(t1 - t2) > 5) return false;


    // ✅ 不同場地
    if ((x.field||'') === (g.field||'')) return false;

    // ✅ 有報名（裁判 or 紀錄）
    const judgeHit = Object.values(x.judges || {}).some(j =>
      isMySlot(j, s)
    );

    const recordHit = Object.values(x.records || {}).some(r =>
      isMySlot(r, s)
    );

    return judgeHit || recordHit;
  });
}

/* =========================
 ✅ 只顯示本週之後
========================= */
function isBeforeThisWeek(dateStr){

  const now = new Date();
  const day = now.getDay(); // 0(日)-6

  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0,0,0,0);

  const d = new Date(dateStr.replace(/\//g,'-'));
  d.setHours(0,0,0,0);

  return d < monday; // 在本週以前
}


/* ============================
 ✅ 班表報名共用衝突檢查（前端版）
============================ */
function checkConflictFront(game, allGames, session){

  const BASE_BUFFER = 30;
  const FIELD_BUFFER = 60;

  // const tStart = new Date(game.date + ' ' + game.time).getTime();
  const tStart = new Date(game.date + ' ' + getTime(game)).getTime();
  const tDuration = Number(game.duration || 120);

  for (let g of allGames){

    if (!g.my_position) continue;
    if (g.game_id === game.game_id) continue;
    if (g.date !== game.date) continue;

    const gStart = new Date(g.date + ' ' + g.time).getTime();
    const gDuration = Number(g.duration || 120);

    const isSameField = (g.field === game.field);

    const buffer = isSameField ? BASE_BUFFER : FIELD_BUFFER;

    const tEnd = tStart + (tDuration + buffer) * 60000;
    const gEnd = gStart + (gDuration + buffer) * 60000;

    if (tStart < gEnd && tEnd > gStart){

      return {
        conflict:true,
        ref:g,
        isSameField
      };
    }
  }

  return { conflict:false };
}
