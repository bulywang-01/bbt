// js/auth.js

function getSession() {
  const raw = localStorage.getItem('session_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function getRoles(session) {
  if (!session || !session.role) return [];
  return session.role.split(',').map(r => r.trim());
}

/* ========== 頁面門禁 ========== */
function guardAdminPage() {
  const session = getSession();
  if (!session) {
    location.replace('login.html');
    return;
  }

  const roles = getRoles(session);
  const allowed =
    roles.includes('admin') ||
    roles.includes('chief_judge') ||
    roles.includes('record_chief');

  if (!allowed) {
    alert('您沒有管理權限');
    location.replace('index.html');
  }
}

/* ========== Header 初始化（關鍵） ========== */
function initHeaderVisibility() {
  const session = getSession();
  if (!session) return;

  const roles = getRoles(session);

  const nameEl = document.getElementById('u_name');
  if (nameEl) {
    nameEl.textContent = session.name || '';
  }

  if (
    roles.includes('admin') ||
    roles.includes('judge') ||
    roles.includes('chief_judge')
  ) {
    document
      .querySelectorAll('.nav-judge')
      .forEach(el => (el.style.display = 'inline-flex'));
  }

  if (
    roles.includes('admin') ||
    roles.includes('record') ||
    roles.includes('record_chief')
  ) {
    document
      .querySelectorAll('.nav-record')
      .forEach(el => (el.style.display = 'inline-flex'));
  }

  if (
    roles.includes('admin') ||
    roles.includes('chief_judge') ||
    roles.includes('record_chief')
  ) {
    document
      .querySelectorAll('.nav-admin')
      .forEach(el => (el.style.display = 'inline-flex'));
  }
}

/* ========== 登出 ========= */
function logout() {
  if (!confirm('確定要登出？')) return;
  localStorage.clear();
  location.replace('login.html');
}
