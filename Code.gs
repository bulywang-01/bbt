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
    const sheet = SpreadsheetApp.getActive()
      .getSheetByName(SHEET_ATTEND);

    // ✅ 防止重複點名
    const existing = sheet.getDataRange().getValues();
    const duplicated = existing.some(
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
  const sheet = SpreadsheetApp.getActive()
    .getSheetByName(name);
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
