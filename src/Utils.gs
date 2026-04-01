/**
 * Date オブジェクトを "YYYY/MM/DD" 形式の文字列に変換する。
 * タイムゾーンはスクリプトのタイムゾーン設定（Asia/Tokyo）に従う。
 *
 * @param {Date} date - 変換対象の Date オブジェクト
 * @returns {string} "YYYY/MM/DD" 形式の日付文字列
 */
function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy/MM/dd');
}

/**
 * ISO 8601 形式のタイムスタンプ文字列を "YYYY/MM/DD" に変換する。
 *
 * @param {string} isoString - ISO 8601 形式の文字列（例: "2025-04-02T10:00:00Z"）
 * @returns {string} "YYYY/MM/DD" 形式の日付文字列
 */
function formatIsoTimestamp(isoString) {
  return formatDate(new Date(isoString));
}
