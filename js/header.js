// header.js（全站共用，唯一角色邏輯）
(function () {
  const session = JSON.parse(localStorage.getItem('session_user') || '{}');
  if (!session || !session.role) return;

  const roles = session.role.split(',').map(r => r.trim());
  const isAdmin = roles.includes('admin');
  const header = document.getElementById('app-header');
  if (!header) return;

  // ✅ admin：全開
  if (isAdmin) {
    header.querySelectorAll('.item').forEach(el => {
      el.style.display = 'flex';
    });
    return;
  }

  // 裁判 / 裁判長
  if (roles.includes('judge') || roles.includes('chief_judge')) {
    header.querySelectorAll('.item.judge').forEach(el => {
      el.style.display = 'flex';
    });
  }

  // 紀錄 / 紀錄長
  if (roles.includes('record') || roles.includes('record_chief')) {
    header.querySelectorAll('.item.record').forEach(el => {
      el.style.display = 'flex';
    });
  }
})();
