/** Gemini API のエンドポイント（gemini-2.0-flash） */
const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Gemini API を呼び出し、タスク情報と予備調査を取得する。
 * Google Search Grounding を有効化して最新情報を参照させる。
 *
 * @param {string} userMessage - チャットの投稿テキスト
 * @param {string} today       - 今日の日付文字列（YYYY/MM/DD）
 * @returns {Object} Gemini API のレスポンス（生 JSON）
 */
function callGemini(userMessage, today) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('スクリプトプロパティ "GEMINI_API_KEY" が設定されていません。');
  }

  const endpoint = `${GEMINI_ENDPOINT}?key=${apiKey}`;
  const prompt   = buildPrompt(userMessage, today);

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    tools: [{ googleSearch: {} }],  // Google Search Grounding を有効化
    generationConfig: {
      temperature: 0.2              // 出力の安定性を高めるため低めに設定
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(endpoint, options);
  const statusCode = response.getResponseCode();

  if (statusCode !== 200) {
    Logger.log(`Gemini API エラー (HTTP ${statusCode}): ${response.getContentText()}`);
    throw new Error(`Gemini API が HTTP ${statusCode} を返しました。`);
  }

  return JSON.parse(response.getContentText());
}

/**
 * Gemini へ渡すプロンプトを生成する。
 *
 * @param {string} userMessage - チャットの投稿テキスト
 * @param {string} today       - 今日の日付文字列（YYYY/MM/DD）
 * @returns {string} プロンプト文字列
 */
function buildPrompt(userMessage, today) {
  return `本日は ${today} です。以下のテキストから下記項目を抽出し、必ず JSON 形式のみで回答してください。
予備調査は Google 検索を用いて最新の正確な情報をまとめてください。
余分な説明文・マークダウンコードブロックは不要です。JSON オブジェクトだけを返してください。

【入力テキスト】
${userMessage}

【出力形式】
{
  "task": "タスク内容の要約（簡潔に）",
  "due_date": "YYYY/MM/DD（期日が不明な場合は空文字）",
  "research": "タスクに必要な情報の調査結果サマリー（参考 URL も含める）"
}`;
}

/**
 * Gemini API のレスポンスを解析し、タスク情報オブジェクトを返す。
 *
 * @param {Object} rawResponse - callGemini() が返す生 JSON
 * @returns {{ task: string, due_date: string, research: string } | null}
 *   解析成功時はオブジェクト、失敗時は null
 */
function parseGeminiResponse(rawResponse) {
  try {
    const candidate = rawResponse.candidates && rawResponse.candidates[0];
    if (!candidate) {
      throw new Error('candidates が空です。');
    }

    // 安全フィルタ等によりコンテンツが生成されなかった場合
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      throw new Error(`生成が中断されました（期待値: STOP, 実際: ${candidate.finishReason}）`);
    }

    const text = candidate.content.parts[0].text.trim();

    // JSON ブロック（```json ... ``` 形式にも対応）を抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON オブジェクトが見つかりませんでした。レスポンス: ' + text);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // 必須キーの存在確認
    if (typeof parsed.task     === 'undefined') parsed.task     = '（抽出失敗）';
    if (typeof parsed.due_date === 'undefined') parsed.due_date = '';
    if (typeof parsed.research === 'undefined') parsed.research = '（取得失敗）';

    return parsed;
  } catch (e) {
    Logger.log('parseGeminiResponse エラー: ' + e.message);
    return {
      task:     '（抽出失敗）',
      due_date: '',
      research: '（取得失敗）'
    };
  }
}
