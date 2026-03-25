const SHEET_JUDGES = 'Judges';
const SHEET_GAMES = 'Games';
const SHEET_ATTEND = 'Attendance';

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'judges') return getJudges();
  if (action === 'games') return getGames();
  if (action === 'attendance') return getAttendance();
  
  return output({ error: 'Invalid action' });
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  if (data.action === 'attendance') return saveAttendance(data);
  
  return output({ error: 'Invalid action' });
}

function getJudges() {
  return output(readSheet(SHEET_JUDGES));
}

function getGames() {
  return output(readSheet(SHEET_GAMES));
}

function getAttendance() {
  return output(readSheet(SHEET_ATTEND));
}

function saveAttendance(data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_ATTEND);
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

function readSheet(name) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(name);
  const [header, ...rows] = sheet.getDataRange().getValues();
  return rows.map(r =>
    Object.fromEntries(r.map((v, i) => [header[i], v]))
  );
}

function output(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}