const RECORD_LABEL = {
  REC_MAIN: '紀錄員',
  REC_TRAINEE: '見習紀錄員',
  REC_VIDEO: '影像紀錄員'
};

function loadGames() {
  callApi({ action: 'getRecordGamesWithAssignments_admin' }, res => {
    if (!res || res.result !== 'ok') return;
    render(res.games);
  });
}

function render(games) {
  const box = document.getElementById('content');
  box.innerHTML = '';

  const grouped = groupByDateCategory(games);

  Object.keys(grouped).forEach(date => {
    const panel = document.createElement('div');
    panel.className = 'panel';

    panel.innerHTML = `<div class="game-header">${date}</div>`;

    Object.keys(grouped[date]).forEach(cat => {
      panel.insertAdjacentHTML('beforeend',
        `<div class="group-title">${cat}</div>`);

      grouped[date][cat].forEach(game => {
        panel.appendChild(renderGame(game));
      });
    });

    box.appendChild(panel);
  });
}

function renderGame(game) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="time-title">
      ${formatTime(game.time)} ｜ ${game.away_team} vs ${game.home_team}
    </div>
    <div class="pos-grid">
      ${Object.keys(RECORD_LABEL).map(r =>
        renderRecordCell(game, r)
      ).join('')}
    </div>`;
  return wrap;
}

function renderRecordCell(game, role) {
  const r = game.records[role];
  if (r.assigned) {
    return `
      <div class="pos-cell assigned">
        <div>${RECORD_LABEL[role]}</div>
        <div>${r.assigned.user_id}</div>
        <button onclick="assign('${game.game_id}','${role}')">更換</button>
      </div>`;
  }
  return `
    <div class="pos-cell">
      <div>${RECORD_LABEL[role]}</div>
      <div>${r.preferred.length ? '已報名' : '尚未報名'}</div>
      <button onclick="assign('${game.game_id}','${role}')">指派</button>
    </div>`;
}
