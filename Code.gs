const SHEET_JUDGES = 'Judges';
const SHEET_GAMES = 'Games';
const SHEET_ATTEND = 'Attendance';

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'judges') return getSheet(SHEET_JUDGES);
  if (action === 'games') return getSheet(SHEET_GAMES);
  if (action === 'attendance') return getSheet(SHEET_ATTEND);
  return output({ error: 'invalid action' });
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);

  if (data.action === 'attendance') {
    const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_ATTEND);
    const rows = sheet.getDataRange().getValues();

    // ✅ 防重複點名
    const duplicated = rows.some(
      r => r[0] === data.game_id && r[1] === data.judge_id
    );
    if (duplicated) {
      return output({ result: 'duplicate' });
    }

    sheet.appendRow([
      data.game_id,
      data.judge_id,
      data.role,
      data.attend,
      data.note || '',
      new Date()
    ]);

    return output({ result: 'ok' });
  }

  return output({ error: 'invalid post' });
}

function getSheet(name) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(name);
  const [header, ...rows] = sheet.getDataRange().getValues();
  return output(
    rows.map(r =>
      Object.fromEntries(r.map((v, i) => [header[i], v]))
    )
  );
}

function output(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

if (data.action === 'login') {
  const users = getSheetRaw('Users');
  const user = users.find(
    u => u.username === data.username && u.password === data.password
  );
  if (!user) return output({ result:'fail' });
  return output({ result:'ok', role:user.role, judge_id:user.judge_id });
}

function getSheetRaw(name){
  const s=SpreadsheetApp.getActive().getSheetByName(name);
  const [h,...r]=s.getDataRange().getValues();
  return r.map(row=>Object.fromEntries(row.map((v,i)=>[h[i],v])));
}

/* ========= 新增裁判（診斷版） ========= */
if (action === 'add_judge') {
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_JUDGES);
    if (!sheet) {
      return jsonp(callback, { result: 'fail', message: '找不到 Judges Sheet' });
    }

    const rows = sheet.getDataRange().getValues();
    const name = String(e.parameter.name || '').trim();
    if (!name) {
      return jsonp(callback, { result: 'fail', message: '缺少姓名' });
    }

    let maxNum = 0;
    for (let i = 1; i < rows.length; i++) {
      const id = rows[i][0];
      if (typeof id === 'string' && id.startsWith('U')) {
        const num = parseInt(id.substring(1), 10);
        if (!isNaN(num)) maxNum = Math.max(maxNum, num);
      }
    }

    const newId = 'U' + String(maxNum + 1).padStart(3, '0');
    sheet.appendRow([newId, name]);

    return jsonp(callback, {
      result: 'ok',
      judge_id: newId,
      debug: 'appendRow 成功'
    });

  } catch (err) {
    return jsonp(callback, {
      result: 'fail',
      message: err.toString()
    });
  }
}
