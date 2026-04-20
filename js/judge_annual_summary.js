(function () {

  function openJudgeAnnualSummary(year) {
    if (!document.getElementById('judgeSummaryModal')) {
      const modal = document.createElement('div');
      modal.id = 'judgeSummaryModal';
      modal.style.cssText = `
        position:fixed; inset:0;
        background:rgba(0,0,0,.45);
        display:flex; align-items:center; justify-content:center;
        z-index:3000;
      `;
      modal.innerHTML = `
        <div style="width:900px;background:#fff;padding:20px;border-radius:6px;">
          <h3 id="summaryTitle">裁判年度總表</h3>
          <table id="summaryTable" class="dashboard-table"></table>
          <div style="text-align:right">
            <button onclick="document.getElementById('judgeSummaryModal').remove()">關閉</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    fetch(API_URL + '?action=getJudgeAnnualSummary&year=' + (year || ''))
      .then(r => r.json())
      .then(res => {
        const t = document.getElementById('summaryTable');
        document.getElementById('summaryTitle').innerText =
          `裁判年度總表（${res.year}）`;

        t.innerHTML = `
          <tr>
            <th>裁判</th><th>年度</th><th>生涯</th>
            <th>主審</th><th>一壘</th><th>二壘</th><th>三壘</th><th>未指定</th>
          </tr>
        `;

        res.list.forEach(j => {
          t.innerHTML += `
            <tr>
              <td>${j.name}</td>
              <td>${j.annual}</td>
              <td>${j.career}</td>
              <td>${j.positions['主審']}</td>
              <td>${j.positions['一壘審']}</td>
              <td>${j.positions['二壘審']}</td>
              <td>${j.positions['三壘審']}</td>
              <td>${j.positions['未指定']}</td>
            </tr>
          `;
        });
      });
  }

  window.openJudgeAnnualSummary = openJudgeAnnualSummary;

})();
