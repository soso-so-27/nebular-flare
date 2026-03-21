---
name: nyaruhodo-dev
description: "にゃるほど（猫の一生を記録するアプリ）の開発スキル。すべてのコード変更はこのスキルに定義されたコンセプト・アーキテクチャ・命名規則に従うこと。"
---

# にゃるほど 開発スキル

## 北極星

> **「毎日のひとコマが、この子の物語になる。」**

すべての開発判断はこのフレーズに立ち返る。

---

## コア体験ループ

1. **点を打つ** — 写真を撮る、ケアを記録する
2. **意味が生まれる** — 猫を識別し分類する（裏側で静かに。AIを表に出さない）
3. **線がつながる** — 時系列で成長の軌跡・季節の変化・生活リズムになる
4. **物語が見える** — Discover、週次ハイライト、変化のレポートが届く

---

## プロダクト原則（コード変更時に必ず確認）

- **「うちの子」が主語**: 「ペット管理」→「この子の思い出を残す」
- **AIは黒子**: 「AI分析」→「新しい発見がありました」。UI文言にAIと書かない
- **軽い入力、豊かな出力**: ユーザー操作は撮影とタップだけ
- **継続が価値**: 1日=写真、1週間=アルバム、1年=物語

### 言葉遣いルール

| ✗ 使わない | ✓ 使う |
|-----------|--------|
| 写真を管理する | この子の思い出を残す |
| ペットの健康記録 | この子のからだのこと |
| AIが分析しました | 新しい発見がありました |
| データを同期中 | 猫を見つけています |
| 設定を管理 | この子のことを教えてください |

---

## テックスタック

- Next.js 16.1.0 (App Router) / TypeScript (strict)
- React 19 / Tailwind CSS 4 / Radix UI / Framer Motion
- 状態管理: React Query (サーバーデータ) + Context (UIのみ)
- DB: Supabase PostgreSQL / Storage: Supabase Storage
- AI: OpenAI API (サーバーサイドのみ)
- 通知: Firebase Cloud Messaging
- デプロイ: Vercel

---

## アーキテクチャルール

### 状態管理
- **サーバーデータ** → React Query のみ。Context でラップしない
- **UI状態** → Context or useState
- **永続設定** → localStorage（将来Supabaseへ）

### データアクセス
- 読み取り: Supabase client → React Query hook
- 書き込み: Supabase client → React Query mutation
- サーバー処理（AI等）: Next.js API Route 経由

### データモデル（v2 主線）
主テーブル: `photos`, `photo_cat_links`, `photo_analysis_jobs`, `photo_analysis_results`, `collection_definitions`, `collection_rules`, `cat_collection_items`, `cat_collection_photos`, `discoveries`

**旧 `cat_images` テーブルは新規コードで使用禁止。**

---

## 命名規則

### ファイル名
- コンポーネント: `kebab-case.tsx`
- hooks: `use-{名前}.ts`
- ユーティリティ: `kebab-case.ts`

### コード内
- コンポーネント: `PascalCase`
- hooks: `camelCase` + `use` prefix
- 定数: `UPPER_SNAKE_CASE`
- DB カラム: `snake_case`

### アプリ名
- 対外: **にゃるほど**
- コード: `nyaruhodo`
- Supabase project: `nebular-flare`（変更不要）
- Vercel project: `catup`（変更不要）

---

## 機能優先度

| 層 | 機能 | 役割 |
|---|---|---|
| ★ コア | 写真コレクション | 「ひとコマ」を積み重ねる器 |
| ★ コア | 自動認識・分類 | 物語を育てるエンジン |
| ○ サポート | 家族共有・ケアログ | 物語を家族で育てる仕組み |
| ○ サポート | 通知・リマインダー | 物語を続けさせる仕掛け |
| △ 後期 | 足跡・ポイント経済 | ゲーミフィケーション |

---

## コード変更チェックリスト

変更前:
- [ ] コンセプト「毎日のひとコマが、この子の物語になる」に沿っているか？
- [ ] AIを表に出していないか？
- [ ] photos v2 パイプラインを使っているか？（cat_images 禁止）
- [ ] サーバーデータを Context に入れていないか？

変更後:
- [ ] `npm run lint` が通るか？
- [ ] `npm run build` が通るか？
- [ ] 既存の画面導線を壊していないか？

---

## 既知の技術的負債（Phase 0 で解消）

| 問題 | 優先度 |
|------|--------|
| api/debug-ai が env を露出 | 緊急 |
| PhotoImportWizard に Auth ヘッダがない | 高 |
| ai-worker が incoming バケットを参照（不整合） | 高 |
| deleteCatImage が avatars バケットから削除 | 高 |
| incident-context の Hook 誤用 | 中 |
| database.ts が v2 未反映 | 中 |
| config.toml が存在しない seed.sql 参照 | 中 |
| next.config.ts の型チェック/ESLint 無効化 | 中 |
| lint エラー 179件 | 中 |

---

## 参照ドキュメント

- `docs/CONCEPT.md` — コンセプトドキュメント（北極星）
- `docs/TRIAGE.md` — 残す/捨てる判断表
- `docs/BUSINESS.md` — 事業性分析・収益化方針
- `docs/DESIGN_SYSTEM.md` — UI/UXデザインシステム（カラー、タイポ、コンポーネント、モーション）
- `docs/PRODUCT_DESIGN.md` — IA・画面遷移図・データフロー・コピーライティング・アナリティクス
- `docs/TECH_OPERATIONS.md` — エラー方針・プライバシー・PWA設計
- `docs/COLOR_SYSTEM.md` — カラーシステム（既存）
