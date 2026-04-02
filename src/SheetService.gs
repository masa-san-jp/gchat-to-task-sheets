/** ヘッダー行の定義（スプレッドシート 1 行目と一致させること） */
const SHEET_HEADERS = ['入力日', '入力者', 'タスク', '期日', '予備調査'];

/**
 * スプレッドシートの最終行にタスク情報を 1 行追記する。
 * スクリプトプロパティ "SHEET_ID" でスプレッドシート ID を指定する。
 *
 * @param {string} inputDate - 入力日（YYYY/MM/DD）
 * @param {string} sender    - 投稿者メールアドレス
 * @param {string} task      - タスク内容の要約
 * @param {string} dueDate   - 期日（YYYY/MM/DD または空文字）
 * @param {string} research  - 予備調査結果
 */
function writeToSheet(inputDate, sender, task, dueDate, research) {
  const sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!sheetId) {
    throw new Error('スクリプトプロパティ "SHEET_ID" が設定されていません。');
  }

  const spreadsheet = SpreadsheetApp.openById(sheetId);
  const sheet       = spreadsheet.getActiveSheet();

  ensureHeaders(sheet);

  sheet.appendRow([inputDate, sender, task, dueDate, research]);
  Logger.log(`行を追記しました: ${[inputDate, sender, task, dueDate].join(', ')}`);
}

/**
 * シートの 1 行目にヘッダーが存在しない場合のみ挿入する。
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 */
function ensureHeaders(sheet) {
  const firstRow = sheet.getRange(1, 1, 1, SHEET_HEADERS.length).getValues()[0];
  const hasHeaders = firstRow.some(cell => cell !== '');

  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, SHEET_HEADERS.length).setValues([SHEET_HEADERS]);
    Logger.log('ヘッダー行を追加しました。');
  }
}
