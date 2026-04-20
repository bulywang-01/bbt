// ============================
// 裁判年度總覽
// ============================

(function () {

  function ensureDashboardModal() {
    if (document.getElementById('judgeAnnualModal')) return;

    const modal = document.createElement('div');
    modal.id = 'judgeAnnualModal';
    modal.style.cssText = `
      position:fixed;
      left:0; top:0;
      width:100%; height:100%;
      background:rgba(0,0,0,.5);
      display:none;
      align-items:center;
      justify-content:center;
      z-index:2000;
    `;

    modal.innerHTML = `
      <div style="background:#fff;width:600px;padding:20px;border-radius:6px;">
        <h3 id="judgeAnnualTitle">裁判年度總覽</h3>

        <div id="judgeAnnualLoading">載入中…</div>

        <div id="judgeAnnualContent" style="display:none;">
          <p>年度站場數：<b id="annualGames"></b></p>
          <p>生涯站場數：<b id="careerGames"></b></p>

          <h4>📅 月份分佈</h4>
          <table border="1" width="100%" id="monthTable"></table>

          <h4>🧍‍♂️ 站位分佈</h4>
          <table border="1" width="100%" id="positionTable"></table>
        </div>

        <div style="text-align:right;margin-top:12px;">
          <button onclick="closeJudgeAnnualDashboard()">關閉</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  window.openJudgeDashboard = function (userId) {
    ensureDashboardModal();

    document.getElementById('judgeAnnualModal').style.display = 'flex';
    document.getElementById('judgeAnnualLoading').style.display = 'block';
    document.getElementById('judgeAnnualContent').style.display = 'none';

    fetch(API_URL + '?action=getJudgeAnnualDashboard&user_id=' + userId)
      .then(r => r.json())
      .then(res => {
        if (!res || res.result !== 'ok') {
          document.getElementById('judgeAnnualLoading').innerText = '載入失敗';
          return;
        }

        document.getElementById('judgeAnnualTitle').innerText =
          `裁判年度總覽（${res.year}）`;

        document.getElementById('annualGames').innerText =
          res.summary.annual_games;
        document.getElementById('careerGames').innerText =
          res.summary.career_games;

        /** ===== 月份表 ===== */
        const mt = document.getElementById('monthTable');
        mt.innerHTML = '<tr><th>月份</th><th>場次</th></tr>';
        Object.keys(res.monthly).forEach(m => {
          mt.innerHTML += `<tr><td>${m} 月</td><td>${res.monthly[m]}</td></tr>`;
        });

        /** ===== 站位表 ===== */
        const pt = document.getElementById('positionTable');
        pt.innerHTML = '<tr><th>站位</th><th>場次</th></tr>';
        Object.keys(res.positions).forEach(p => {
          pt.innerHTML += `<tr><td>${p}</td><td>${res.positions[p]}</td></tr>`;
        });

        document.getElementById('judgeAnnualLoading').style.display = 'none';
        document.getElementById('judgeAnnualContent').style.display = 'block';
      })
      .catch(() => {
        document.getElementById('judgeAnnualLoading').innerText = '載入失敗';
      });
  };

  window.closeJudgeAnnualDashboard = function () {
    document.getElementById('judgeAnnualModal').style.display = 'none';
  };

})();
