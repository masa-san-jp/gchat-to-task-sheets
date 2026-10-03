# gchat-to-task-sheets

Google Chat の内容をタスクシートへ流し込む自動化ツールです。  
An automation tool that turns Google Chat content into task-sheet entries.

## 概要

この README は、このリポジトリの役割を示すための最小 README です。
詳細な使い方、設計、運用ルールが必要な場合は今後追加します。

## 用例と設計思想

架空の依頼「来週月曜までに候補サービスの仕様を比較する」を投稿すると、タスク名、期日、予備調査を抽出し、入力日・入力者とともにシートへ追記する流れです。「予備調査」は着手を助ける検索結果の要約であり、比較表の完成やタスクの実行完了を意味しません。日付・参照URL・結論は利用者が確認します。

[仕様書](docs/task-automation-spec.md)が目指すのは、チャットで思いついた仕事を記録し直す負担を減らし、調査の入口も同時に残すことです。曖昧な入力を整理するAIと、確認して実行する人の役割を分けて使います。

## 技術構成と利用の前提

- [src/Code.gs](src/Code.gs)の `onMessage` がChatイベントを受け、Geminiで解析した結果をSheetsへ記録した後、同期的に結果を返信します。
- [GeminiService.gs](src/GeminiService.gs)が検索Groundingを含むAPI呼び出しと応答解析、[SheetService.gs](src/SheetService.gs)がシート追記、[Utils.gs](src/Utils.gs)が日付処理を担当します。
- Apps Scriptへの配置、Chatアプリ登録、OAuth権限とスクリプトプロパティの設定は利用環境で必要です。リポジトリを取得しただけでは動きません。
- 投稿本文はGeminiへ、投稿者のメールアドレス・タスク等は設定したシートへ渡ります。Googleのサービス内でも送信・共有は発生するため、対象スペースと保存先の権限を確認します。

## 成立と展開

確認できる履歴では[2026年4月1日に仕様に基づくGASソースを追加](https://github.com/masa-san-jp/gchat-to-task-sheets/commit/26edc1e587256474e2494f7898f991494e38ab0d)し、4月2日にレビュー修正を含めて取り込んでいます。仕様書の更新日表記と、Git上の実装時期は区別してください。

まず架空の投稿でSheets書き込み、Gemini抽出、Chat受信を順に確認し、最後に一連の処理を検証する手順が仕様書にあります。個人用のタスク収集が起点であり、チーム利用へ広げる場合は閲覧範囲・重複記録・期限の誤解釈を別途検討します。継続的な本番稼働やタスク自動実行の実績はここでは主張しません。

