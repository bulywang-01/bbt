/* ===== Session & Role Utils ===== */

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

/* ===== Role Helpers ===== */

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
  return (
    roles.includes('admin') ||
    roles.includes('chief_judge') ||
    roles.includes('record_chief')
  );
}

/* ===== Page Guards ===== */

function guardJudgePage() {
  const session = getSession();
  const roles = getRoles(session);
  if (!(hasJudge(roles) || hasAdmin(roles))) {
    alert('您沒有權限存取裁判班表');
    location.replace('index.html');
  }
}

function guardRecordPage() {
  const session = getSession();
  const roles = getRoles(session);
  if (!(hasRecord(roles) || hasAdmin(roles))) {
    alert('您沒有權限存取紀錄班表');
    location.replace('index.html');
  }
}

function guardAdminPage() {
  const session = getSession();
  const roles = getRoles(session);
  if (!hasManage(roles)) {
    alert('您沒有後端管理權限');
    location.replace('index.html');
  }
}
