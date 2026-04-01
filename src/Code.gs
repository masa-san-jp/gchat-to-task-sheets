/**
 * Google Chat からメッセージを受け取るエントリーポイント。
 * Chat アプリとして GAS を登録した場合に呼び出される。
 *
 * @param {Object} event - Google Chat から渡されるイベントオブジェクト
 * @returns {Object} Chat へ返すレスポンスオブジェクト
 */
function onMessage(event) {
  try {
    const message   = event.message.text;
    const sender    = event.message.sender.email;
    const timestamp = event.message.createTime;

    // 処理中であることを即時返答
    const processingReply = { text: '⏳ タスクを処理中です。しばらくお待ちください...' };

    processTask(message, sender, timestamp);

    return processingReply;
  } catch (e) {
    Logger.log('onMessage error: ' + e.message);
    return { text: '❌ エラーが発生しました。管理者に連絡してください。' };
  }
}

/**
 * メッセージからタスクを抽出し、スプレッドシートに記録するメイン処理。
 *
 * @param {string} message   - チャットの投稿テキスト
 * @param {string} sender    - 投稿者のメールアドレス
 * @param {string} timestamp - 投稿日時（ISO 8601 文字列）
 */
function processTask(message, sender, timestamp) {
  const today     = formatDate(new Date());
  const inputDate = timestamp ? formatDate(new Date(timestamp)) : today;

  const geminiResult = callGemini(message, today);
  const parsed       = parseGeminiResponse(geminiResult);

  if (!parsed) {
    Logger.log('Gemini レスポンスの解析に失敗しました。');
    return;
  }

  writeToSheet(inputDate, sender, parsed.task, parsed.due_date, parsed.research);
  Logger.log('スプレッドシートへの書き込みが完了しました。');
}
