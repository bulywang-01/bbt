// header.js
window.initHeader = function () {
  const session = JSON.parse(localStorage.getItem('session_user') || '{}');
  if (!session || !session.role) return;

  const roles = session.role.split(',').map(r => r.trim());
  const header = document.getElementById('app-header');
  if (!header) return;

  const isAdmin = roles.includes('admin');

  if (isAdmin) {
    header.querySelectorAll('.item').forEach(el => {
      el.style.display = 'flex';
    });
    return;
  }

  if (roles.includes('judge') || roles.includes('chief_judge')) {
    header.querySelectorAll('.item.judge').forEach(el => {
      el.style.display = 'flex';
    });
  }

  if (roles.includes('record') || roles.includes('record_chief')) {
    header.querySelectorAll('.item.record').forEach(el => {
      el.style.display = 'flex';
    });
  }
};
