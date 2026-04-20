(function () {

  window.openJudgeAnnualSummary = function (year) {
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
        <style>
          .summary-box{
            background:#fff;
            width:95%;
            max-width:1100px;
            padding:20px;
            border-radius:6px;
            font-size:14px;
          }
          .summary-loading{
            text-align:center;
            padding:32px;
            color:#555;
          }
          .summary-table{
            width:100%;
            border-collapse:collapse;
            margin-top:12px;
          }
          .summary-table th{
            background:#f2f4f7;
            border:1px solid #ddd;
            padding:8px;
            font-weight:600;
            text-align:center;
            white-space:nowrap;
          }
          .summary-table td{
            border:1px solid #ddd;
            padding:8px;
            text-align:center;
          }
          .summary-table td.name{
            text-align:left;
            font-weight:500;
          }
          .summary-table tr:nth-child(even){
            background:#fafafa;
          }
        </style>

        <div class="summary-box">
          <h3 id="summaryTitle">裁判年度總表</h3>

          <div id="summaryLoading" class="summary-loading">
            ⏳ 載入年度統計資料中…
          </div>

          <table id="summaryTable" class="summary-table" style="display:none;"></table>

          <div style="text-align:right;margin-top:16px;">
            <button onclick="document.getElementById('judgeSummaryModal').remove()">關閉</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    // ===== 開始載入 =====
    const loading = document.getElementById('summaryLoading');
    const table = document.getElementById('summaryTable');
    loading.style.display = 'block';
    table.style.display = 'none';

    fetch(API_URL + '?action=getJudgeAnnualSummary&year=' + (year || ''))
      .then(r => r.json())
      .then(res => {
        document.getElementById('summaryTitle').innerText =
          `裁判年度總表（${res.year}）`;

        table.innerHTML = `
          <tr>
            <th>裁判</th>
            <th>年度</th>
            <th>生涯</th>
            <th>主審</th>
            <th>一壘</th>
            <th>二壘</th>
            <th>三壘</th>
            <th>未指定</th>
          </tr>
        `;

        res.list.forEach(j => {
          table.innerHTML += `
            <tr>
              <td class="name">${j.name}</td>
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

        loading.style.display = 'none';
        table.style.display = 'table';
      })
      .catch(() => {
        loading.innerText = '❌ 載入失敗，請稍後重試';
      });
  };

})();
