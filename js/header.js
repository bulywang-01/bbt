// header.js（每頁都共用）
const session = JSON.parse(localStorage.getItem('session_user') || '{}');
document.getElementById('u_name').textContent = session.name || '';

const roles = (session.role || '').split(',');
document.querySelectorAll('[class*="role-"]').forEach(el => el.style.display = 'none');

roles.forEach(r => {
  document.querySelectorAll('.role-' + r).forEach(el => el.style.display = 'inline-block');
});
