(async () => {
  const gamesDiv = document.getElementById('games');
  const games = await apiGet('games');

  if (!games.length) {
    gamesDiv.innerHTML = '<p>目前沒有比賽資料</p>';
    return;
  }

  games.forEach(g => {
    const div = document.createElement('div');
    div.style.border = '1px solid #ccc';
    div.style.padding = '10px';
    div.style.marginBottom = '10px';

    div.innerHTML = `
      <b>${g.date}</b>｜${g.field}<br>
      ${g.category || ''}<br>
      <a href="game.html?game_id=${g.game_id}">➡ 出勤點名</a>
    `;

    gamesDiv.appendChild(div);
  });
})();
