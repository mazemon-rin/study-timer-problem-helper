# 問題解説アプリ

スマートフォンで問題画像をGeminiで解析し、回答と追加質問を復習保存する個人向けWebアプリです。

## 構成

- `index.html` / `style.css`: 画面
- `app.js`: 画像解析、追加質問、復習
- `config.js`: 変更しやすい設定値
- `netlify/functions/solve-problem.mjs`: APIキーを隠してGeminiへ接続

## 初回設定

1. Google AI StudioでAPIキーを取得します。
2. Netlifyの環境変数に `GEMINI_API_KEY` を登録します。
3. 必要なら `GEMINI_MODEL` を変更します。
4. Netlifyでこのフォルダを公開します。

ローカル確認は `npm install` の後に `npm run dev` を使用します。APIキー、`.env`、`node_modules` はGitHubへ公開しません。

学習記録と問題画像は端末のlocalStorageに保存します。画像やAIの解答は完全ではないため、必ず教科書や先生の説明でも確認してください。

## 将来の統合

保存データには `schemaVersion` と `sourceApp` を付けています。将来、Study Tracker側でこの形式を読み込む変換処理を追加すれば、学習記録・問題履歴を統合できます。既存アプリのLocalStorageキーとは分離しています。


## Vercel公開

GitHubリポジトリをVercelへImportし、Environment Variablesに `GEMINI_API_KEY` と `GEMINI_MODEL=gemini-3.5-flash` を登録します。Vercel Functionsは `api/solve-problem.js` です。
