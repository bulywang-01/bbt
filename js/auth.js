function getSession() {
  const raw = localStorage.getItem('session_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getRoles(session) {
  if (!session || !session.role) return [];
  return session.role.split(',').map(r => r.trim());
}

/* ===== Role Groups ===== */
function hasJudge(roles) {
  return roles.includes('judge') || roles.includes('chief_judge');
}
function hasRecord(roles) {
  return roles.includes('record') || roles.includes('record_chief');
}
function hasAdmin(roles) {
  return roles.includes('admin');
}
function hasManage(roles) {
  return hasAdmin(roles)
    || roles.includes('chief_judge')
    || roles.includes('record_chief');
}

/* ===== Page Guards ===== */

// 裁判班表
function guardJudgePage() {
  const s = getSession();
  const r = getRoles(s);
  if (!(hasJudge(r) || hasAdmin(r))) {
    alert('您沒有權限存取裁判班表');
    location.replace('index.html');
  }
}

// 紀錄班表
function guardRecordPage() {
  const s = getSession();
  const r = getRoles(s);
  if (!(hasRecord(r) || hasAdmin(r))) {
    alert('您沒有權限存取紀錄班表');
    location.replace('index.html');
  }
}

// 管理頁
function guardAdminPage() {
  const s = getSession();
  const r = getRoles(s);
  if (!hasManage(r)) {
    alert('您沒有後端管理權限');
    location.replace('index.html');
  }
}
