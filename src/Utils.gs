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
