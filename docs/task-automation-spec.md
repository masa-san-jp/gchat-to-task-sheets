# Google Chat タスク自動化ツール 技術仕様書

-----

## 1. システム概要

Google Chat（個人スペース）に投稿されたメッセージをトリガーとして、タスク情報の抽出・予備調査・スプレッドシートへの記録を自動化するツール。

-----

## 2. 業務フロー

```
ユーザー投稿（Google Chat）
       ↓
メッセージ取得（Bot / GAS）
  - メッセージ本文
  - 投稿者メタデータ
  - 投稿日時
       ↓
Gemini API による解析
  - タスク内容の抽出
  - 期日の抽出・補完
  - 検索クエリ生成 + Google Search Grounding
       ↓
スプレッドシートへ1行追記（appendRow）
```

-----

## 3. 要件詳細

### 3-A. スプレッドシート記録項目

|項目名 |内容                        |取得ソース                 |
|----|--------------------------|----------------------|
|入力日 |チャット送信日付                  |Google Chat メタデータ     |
|入力者 |投稿者のGoogleアカウント（メールアドレス）  |Google Chat メタデータ     |
|タスク |実行すべき作業内容の要約              |投稿テキストより抽出            |
|期日  |タスクの締め切り日（「明日」「○月○日」等から補完）|投稿テキストより抽出            |
|予備調査|タスク実行に必要な基本情報・参考リンク       |Gemini + Google Search|

### 3-B. 機能要件

|機能     |詳細                          |
|-------|----------------------------|
|チャット連携 |特定スペースへの投稿をリアルタイムまたは定期実行で検知 |
|タスク抽出  |箇条書き・曖昧文章から「タスク名」「期限」を特定    |
|クエリ生成  |タスク完遂に必要な情報収集のための検索クエリを生成   |
|外部検索   |生成クエリで Web 検索し、上位結果の要約・回答を取得|
|シート書き込み|指定スプレッドシートの最終行に項目を自動入力      |

-----

## 4. 活用イメージ（例）

**ユーザーの投稿:**

> 「来週の月曜までに、新しいiPhoneのスペックと価格を調べて比較表を作っておいて」

**スプレッドシート出力結果:**

|項目  |値                                       |
|----|----------------------------------------|
|入力日 |2025/04/02                              |
|入力者 |user@example.com                        |
|タスク |新しいiPhoneのスペック比較表作成                     |
|期日  |2025/04/07（来週月曜を自動計算）                   |
|予備調査|iPhone 15/16 Pro スペック比較、最新価格、公式ストアURL など|

-----

## 5. 技術スタック

|レイヤー    |採用技術                                 |
|--------|-------------------------------------|
|プラットフォーム|Google Apps Script (GAS)             |
|インターフェース|Google Chat API（Apps Script Chat App）|
|データベース  |Google Sheets                        |
|AI・検索   |Gemini API（Google Search Grounding）  |

-----

## 6. 実装詳細

### 6-1. Google Chat との連携

**推奨方式: Apps Script Chat App**

GAS を Google Chat アプリとして登録し、`onMessage` イベントでメッセージを直接受け取る。

```javascript
function onMessage(event) {
  const message = event.message.text;
  const sender  = event.message.sender.email;
  const timestamp = event.message.createTime;
  
  processTask(message, sender, timestamp);
}
```

**代替方式: HTTP Endpoint（Webhook）**

GAS をウェブアプリとしてデプロイし、Chat 側から POST させる。リアルタイム性は同等だが、設定が若干複雑。

### 6-2. Gemini API によるタスク抽出と予備調査

**Google Search Grounding を使用した処理フロー:**

1. 投稿テキストを Gemini に渡す
1. プロンプトでタスク名・期限・検索クエリを JSON で出力するよう指示
1. Google Search Grounding を有効化し、最新情報を同時取得・要約

**プロンプト例:**

```
本日は {TODAY} です。以下のテキストから下記項目を抽出し、JSON形式で回答してください。
予備調査はGoogle検索を用いて最新の正確な情報をまとめてください。

【入力テキスト】
{USER_MESSAGE}

【出力形式】
{
  "task": "タスク内容の要約",
  "due_date": "YYYY/MM/DD（期日が不明な場合は空文字）",
  "research": "タスクに必要な情報の調査結果サマリー（URL含む）"
}
```

**Gemini API 呼び出しサンプル（GAS）:**

```javascript
function callGemini(userMessage, today) {
  const API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

  const prompt = `本日は${today}です。以下のテキストからタスク名・期日(YYYY/MM/DD)・予備調査結果をJSON形式で抽出してください。\n\n${userMessage}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ googleSearch: {} }]  // Google Search Grounding 有効化
  };

  const response = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });

  return JSON.parse(response.getContentText());
}
```

### 6-3. スプレッドシートへの書き込み

```javascript
function writeToSheet(inputDate, sender, task, dueDate, research) {
  const SHEET_ID = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();

  sheet.appendRow([inputDate, sender, task, dueDate, research]);
}
```

**エラーハンドリング:**

```javascript
function parseGeminiResponse(rawResponse) {
  try {
    const text = rawResponse.candidates[0].content.parts[0].text;
    // JSON ブロックの抽出（```json ... ``` 形式に対応）
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (e) {
    Logger.log('JSON parse error: ' + e.message);
    return {
      task: '（抽出失敗）',
      due_date: '',
      research: '（取得失敗）'
    };
  }
}
```

-----

## 7. 非機能要件・留意事項

|項目     |対策・考慮事項                                                     |
|-------|------------------------------------------------------------|
|日付計算の精度|`new Date()` で取得した今日の日付を必ずプロンプトに渡す（「明日」「来週」の誤変換防止）          |
|プライバシー |Gemini API の「データを学習に使用しない」設定（Enterprise 契約またはオプトアウト）を確認     |
|APIコスト |Gemini 1.5 Flash の無料枠（月 15 RPM / 100万トークン）内での運用可否を確認        |
|認証・スコープ|GAS の OAuth スコープ設定が必要（下記参照）                                 |
|レスポンス遅延|Grounding 付き Gemini は応答に 3〜10 秒かかる場合あり。Chat 側に「処理中…」を返す実装を推奨|

**必要な GAS OAuth スコープ:**

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/chat.bot",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

-----

## 8. 開発ステップ

### STEP 1 — スプレッドシート書き込みの確認

GAS からダミーデータを Google Sheets に `appendRow` で書き込み、スコープと接続を検証する。

### STEP 2 — Gemini API のタスク抽出テスト

Google AI Studio でプロンプトを調整し、JSON 出力の安定性を確認する。Grounding の有無でレスポンス品質を比較する。

### STEP 3 — Google Chat との接続

GAS プロジェクトを Chat アプリとして Google Cloud Console に登録し、`onMessage` でメッセージ受信できるか確認する。

### STEP 4 — 統合テスト

Chat に実際のメッセージを投稿し、スプレッドシートに正しく反映されるかをエンドツーエンドで確認する。

-----

## 9. ディレクトリ構成（GAS プロジェクト）

```
project/
├── appsscript.json       # スコープ・Chat アプリ設定
├── Code.gs               # onMessage エントリーポイント
├── GeminiService.gs      # Gemini API 呼び出し・レスポンス解析
├── SheetService.gs       # スプレッドシート書き込み
└── Utils.gs              # 日付フォーマット等ユーティリティ
```

-----

*最終更新: 2025/04/02*
