(async () => {
  const gamesDiv = document.getElementById('games');
  const games = await apiGet('games');

  if (!games.length) {
    gamesDiv.innerHTML = '<p>目前沒有比賽資料</p>';
    return;
  }

function formatDate(iso) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const week = ['日','一','二','三','四','五','六'][d.getDay()];
  return `${y}/${m}/${day}（${week}）`;
}

(async () => {
  const gamesDiv = document.getElementById('games');
  const games = await apiGet('games');

  games.forEach(g => {
    const div = document.createElement('div');
    div.style.border = '1px solid #ccc';
    div.style.padding = '10px';
    div.style.marginBottom = '10px';

    div.innerHTML = `
      <b>${formatDate(g.date)}</b> | ${g.field}<br>
      ${g.category || ''}<br>
      <a href="game.html?game_id=${g.game_id}">→ 出勤點名</a>
    `;

    gamesDiv.appendChild(div);
  });
})();

