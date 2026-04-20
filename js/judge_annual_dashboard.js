// ============================
// 裁判年度總覽（最小可用版）
// ============================

(function () {

  // ====== 建立 Modal（只建一次） ======
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
      <div style="
        background:#fff;
        width:420px;
        padding:20px;
        border-radius:6px;
      ">
        <h3 id="judgeAnnualTitle">裁判年度總覽</h3>

        <div id="judgeAnnualLoading" style="padding:12px 0;">
          載入中…
        </div>

        <div id="judgeAnnualContent" style="display:none;">
          <p>年度站場數：<b id="annualGames">0</b></p>
          <p>生涯站場數：<b id="careerGames">0</b></p>
        </div>

        <div style="text-align:right;margin-top:16px;">
          <button onclick="closeJudgeAnnualDashboard()">關閉</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  // ====== 對外開啟接口（給 admin / judge 用） ======
  window.openJudgeDashboard = function (userId) {
    ensureDashboardModal();

    const modal = document.getElementById('judgeAnnualModal');
    modal.style.display = 'flex';

    document.getElementById('judgeAnnualLoading').style.display = 'block';
    document.getElementById('judgeAnnualContent').style.display = 'none';

    // 呼叫後端年度總覽 API
    fetch(API_URL + '?action=getJudgeAnnualDashboard&user_id=' + userId)
      .then(r => r.text())   // ✅ 改成 text
      .then(txt => {
        console.log('RAW getJudgeAnnualDashboard =', txt);
    
        let res;
        try {
          res = JSON.parse(txt);   // ✅ 手動 parse
        } catch (e) {
          console.error('JSON parse 失敗', e);
          document.getElementById('judgeAnnualLoading').innerText = '回傳格式錯誤';
          return;
        }
    
        if (!res || res.result !== 'ok') {
          document.getElementById('judgeAnnualLoading').innerText = '載入失敗';
          return;
        }
    
        // ===== 正常顯示 =====
        document.getElementById('judgeAnnualTitle').innerText =
          `裁判年度總覽（${res.year}）`;
    
        document.getElementById('annualGames').innerText =
          res.summary.annual_games;
    
        document.getElementById('careerGames').innerText =
          res.summary.career_games;
    
        document.getElementById('judgeAnnualLoading').style.display = 'none';
        document.getElementById('judgeAnnualContent').style.display = 'block';
      })
      .catch(err => {
        console.error(err);
        document.getElementById('judgeAnnualLoading').innerText = '載入失敗';
      });
  };

  // ====== 關閉 ======
  window.closeJudgeAnnualDashboard = function () {
    const modal = document.getElementById('judgeAnnualModal');
    if (modal) modal.style.display = 'none';
  };

})();
