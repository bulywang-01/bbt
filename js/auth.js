/*********************************************************
 * ✅ 取得 Session（純讀取，不做任何跳轉）
 *********************************************************/
function getSession(){

  try{
    // 從 localStorage 抓登入資訊
    const raw = localStorage.getItem('session_user');

    // 沒資料 → 未登入
    if (!raw) return null;

    const s = JSON.parse(raw);

    // 防呆：如果沒有 user_id → 視為壞掉
    if (!s || !s.user_id){
      localStorage.removeItem('session_user');
      return null;
    }

    return s;

  }catch(e){
    // JSON parse 壞掉 → 清掉
    localStorage.removeItem('session_user');
    return null;
  }
}


/*********************************************************
 * ✅ 強制登入檢查（只會執行一次，不會狂跳）
 *********************************************************/
function ensureLogin(){

  const session = getSession();

/*
  if (!session){

    // ✅ 防止無限 alert
    if (!window.__LOGIN_REDIRECT){
      window.__LOGIN_REDIRECT = true;

      alert('登入狀態已失效，請重新登入');

      // ✅ 強制跳登入頁
      location.replace('login.html');
    }

    return null;
  }
*/

  return session;
}

/*********************************************************
 * ✅ 初始化整個系統（核心入口）
 * 👉 所有頁面都要走這個
 *********************************************************/
function initAuth(){

  const session = ensureLogin();
  if (!session) return null;

  /*************** ✅ 設定角色 class（給 header 用） ***************/
  document.body.classList.remove(
    'role-admin',
    'role-judge',
    'role-record'
  );

  const roles = (session.role || '').split(',').map(r => r.trim());

  if (roles.includes('admin')){
    document.body.classList.add('role-admin');
  }

  if (roles.includes('judge') || roles.includes('chief_judge')){
    document.body.classList.add('role-judge');
  }

  if (roles.includes('record') || roles.includes('record_chief')){
    document.body.classList.add('role-record');
  }

  /*************** ✅ 塞使用者名字（修 undefined） ***************/
  const nameEl = document.getElementById('header-username');
  if (nameEl){
    nameEl.textContent = session.name || '';
  }

  return session;
}


/*********************************************************
 * ✅ 登出
 *********************************************************/
function logout(){

  if (!confirm('確定要登出？')) return;

  // 清掉 session
  localStorage.removeItem('session_user');

  // 回登入頁
  location.replace('login.html');
}
