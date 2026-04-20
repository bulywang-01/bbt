// ============================
// 裁判年度總覽（正式版）
// ============================

(function () {

  // ✅ 站位顯示順序（強制業務規則）
  const POSITION_ORDER = ['主審', '一壘審', '二壘審', '三壘審', '未指定'];

  function ensureDashboardModal() {
    if (document.getElementById('judgeAnnualModal')) return;

    const modal = document.createElement('div');
    modal.id = 'judgeAnnualModal';
    modal.style.cssText = `
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.45);
      display:none;
      align-items:center;
      justify-content:center;
      z-index:2000;
    `;

    modal.innerHTML = `
      <style>
        .dashboard-box{
          background:#fff;
          width:650px;
          padding:20px;
          border-radius:6px;
          font-size:14px;
        }
        .dashboard-table{
          width:100%;
          border-collapse:collapse;
          margin:8px 0 16px;
        }
        .dashboard-table th{
          background:#f3f5f7;
          border:1px solid #ddd;
          padding:8px;
          font-weight:600;
        }
        .dashboard-table td{
          border:1px solid #ddd;
          padding:8px;
          text-align:center;
        }
        .dashboard-table tr:nth-child(even) td{
          background:#fafafa;
        }
      </style>

      <div class="dashboard-box">
        <h3 id="judgeAnnualTitle">裁判年度總覽</h3>

        <div id="judgeAnnualLoading">載入中…</div>

        <div id="judgeAnnualContent" style="display:none;">
          <p>年度站場數：<b id="annualGames"></b></p>
          <p>生涯站場數：<b id="careerGames"></b></p>

          <h4>📅 月份分佈</h4>
          <table id="monthTable" class="dashboard-table"></table>

          <h4>🧍‍♂️ 站位分佈</h4>
          <table id="positionTable" class="dashboard-table"></table>
        </div>

        <div style="text-align:right;">
          <button onclick="closeJudgeAnnualDashboard()">關閉</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  // ============================
  // 對外呼叫
  // ============================
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

        document.getElementById('judgeAnnualTitle')
          .innerText = `裁判年度總覽（${res.year}）`;

        document.getElementById('annualGames')
          .innerText = res.summary.annual_games;

        document.getElementById('careerGames')
          .innerText = res.summary.career_games;

        // ===== 月份表 =====
        const mt = document.getElementById('monthTable');
        mt.innerHTML = '<tr><th>月份</th><th>場次</th></tr>';
        Object.keys(res.monthly).forEach(m => {
          mt.innerHTML += `
            <tr>
              <td>${m} 月</td>
              <td>${res.monthly[m]}</td>
            </tr>
          `;
        });

        // ===== 站位表（固定順序 / 未指定最後）=====
        const pt = document.getElementById('positionTable');
        pt.innerHTML = '<tr><th>站位</th><th>場次</th></tr>';

        POSITION_ORDER.forEach(pos => {
          if (res.positions[pos]) {
            pt.innerHTML += `
              <tr>
                <td>${pos}</td>
                <td>${res.positions[pos]}</td>
              </tr>
            `;
          }
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
