# にゃるほど UI/UX デザインシステム v1.0

> **デザインの北極星: 写真が主役。UIは消える。時間が物語になる。**

参考: Apple Photos（iOS）のCollections体験の猫特化版

---

## 1. デザイン原則

### 1-1. 写真ファースト

写真は常にUIの主役。背景、余白、UIパーツはすべて「写真を引き立てるための舞台装置」。
Apple Photosと同様に、UIは写真の邪魔をしない。コントロールは必要な時だけ現れる。

**具体的に:**
- 写真のサムネイルは角丸なし、または極小角丸（2-4px）で素材感を活かす
- グリッドの隙間は最小限（2px）で写真同士が密に並ぶ
- 写真を開いたときは全画面表示、UIはオーバーレイ
- 背景色は写真が映える落ち着いたニュートラルカラー

### 1-2. 静かなインテリジェンス

AIの存在を感じさせない。「勝手に整理されていた」「いつの間にか図鑑が育っていた」という体験。
Apple Photosの「Memories」「Collections」が自動生成されるのと同じ感覚。

**具体的に:**
- 「AI分析中」のような表示はしない
- 新しい発見は通知ではなく、コレクション画面に自然に現れる
- 分類結果はユーザーが確認できるが、押し付けない

### 1-3. 時間軸のナビゲーション

Apple Photosのように、スクロールが時間旅行になる。上にスクロールすると過去に遡り、
コレクションが時間の区切りを可視化する。

**具体的に:**
- メインビューは時系列グリッド（上が最新）
- 月/年のセパレーターで時間の流れを可視化
- ピンチで日/月/年の粒度を切り替え（将来的に）
- 「1年前の今日」は時間軸の中で自然にハイライト

### 1-4. 片手操作の最適化

スマホで猫と暮らしながら使うアプリ。もう片方の手は猫を撫でている。

**具体的に:**
- 重要な操作は画面下半分に集中
- タブバーは下部固定（Apple Photos iOS 26のように、スクロール時に縮小）
- スワイプ操作を多用（戻る、削除、お気に入り）
- 撮影ボタンは常にアクセス可能な位置に

---

## 2. カラーシステム

### 2-1. 基本方針

写真が主役なので、UIカラーは抑制的。温かみのあるニュートラルを基調にする。
現行の `theme_color: #FAF9F7` を踏襲し、発展させる。

### 2-2. カラーパレット

```
/* ── ベース（背景・表面） ── */
--bg-primary:      #FAF9F7;    /* 温かいオフホワイト（現行継続） */
--bg-secondary:    #F3F1EE;    /* 少しだけ沈んだサーフェス */
--bg-tertiary:     #E8E5E1;    /* カード背景、区切り */
--bg-elevated:     #FFFFFF;    /* モーダル、シート */

/* ── テキスト ── */
--text-primary:    #1A1A1A;    /* 本文 */
--text-secondary:  #6B6560;    /* 補助テキスト、日付、ラベル */
--text-tertiary:   #9B9590;    /* プレースホルダー、ヒント */
--text-inverse:    #FFFFFF;    /* 暗い背景上のテキスト */

/* ── アクセント ── */
--accent-primary:  #E8946A;    /* 温かいコーラル — 猫の温もり、通知、CTA */
--accent-soft:     #F5D5C3;    /* アクセントの薄い版 — タグ背景、選択状態 */
--accent-discover: #7EB5A6;    /* 穏やかなセージグリーン — 発見、図鑑の成長 */
--accent-story:    #C4A882;    /* 落ち着いたゴールド — 物語、ハイライト、プレミアム */

/* ── システム ── */
--border:          #E0DCD8;    /* ボーダー、デバイダー */
--border-subtle:   #EDEAE7;    /* 微かなボーダー */
--overlay:         rgba(0,0,0,0.4);  /* 写真オーバーレイ */
--shadow:          0 2px 8px rgba(0,0,0,0.06);  /* カードシャドウ */

/* ── ダークモード ── */
--dark-bg-primary:    #121212;
--dark-bg-secondary:  #1E1E1E;
--dark-bg-tertiary:   #2A2A2A;
--dark-text-primary:  #F0EDEA;
--dark-text-secondary:#9B9590;
--dark-border:        #333333;
```

### 2-3. アクセントカラーの使い分け

| カラー | 用途 | 使う場面 |
|--------|------|---------|
| コーラル `#E8946A` | 主アクション、通知、新着 | 撮影ボタン、未読バッジ、CTA |
| セージ `#7EB5A6` | 発見、図鑑、成長 | 新しい図鑑エントリ、発見カード |
| ゴールド `#C4A882` | 物語、ハイライト、プレミアム | 週次ハイライト、1年前の今日、Pro機能 |
| ソフトコーラル `#F5D5C3` | 選択状態、タグ | 選択中の猫フィルター、AIタグ背景 |

---

## 3. タイポグラフィ

### 3-1. フォント選定

```
/* メインフォント — Zen Maru Gothic（現行使用中） */
/* 丸みのある和文フォント。「うちの子」の温かさに合う */
--font-primary: 'Zen Maru Gothic', system-ui, sans-serif;

/* 英数字・UI要素 — システムフォント */
--font-ui: system-ui, -apple-system, sans-serif;

/* 数字（日付、統計） — tabular-nums で揃える */
font-variant-numeric: tabular-nums;
```

### 3-2. タイプスケール

```
--text-xs:    0.6875rem;  /* 11px — タイムスタンプ、メタデータ */
--text-sm:    0.8125rem;  /* 13px — 補助ラベル、タグ */
--text-base:  0.9375rem;  /* 15px — 本文 */
--text-lg:    1.0625rem;  /* 17px — セクションタイトル */
--text-xl:    1.3125rem;  /* 21px — 画面タイトル */
--text-2xl:   1.6875rem;  /* 27px — ヒーローテキスト */
--text-3xl:   2.125rem;   /* 34px — 大きな数字、統計 */
```

### 3-3. フォントウェイト

- **Regular (400)** — 本文、説明
- **Medium (500)** — ラベル、ナビゲーション
- **Bold (700)** — タイトル、強調（控えめに使用）

---

## 4. レイアウトシステム

### 4-1. 画面構成（Apple Photos インスパイア）

```
┌──────────────────────────┐
│  ステータスバー           │
├──────────────────────────┤
│                          │
│  コンテンツエリア         │
│  （写真グリッド /         │
│   コレクション /          │
│   図鑑 /                 │
│   猫プロフィール）        │
│                          │
│                          │
│                          │
│                          │
├──────────────────────────┤
│  [ホーム] [図鑑] [📷] [猫] [カレンダー] │
└──────────────────────────┘
```

### 4-2. タブバー（下部ナビゲーション）

Apple Photosのタブバーを参考に：
- **5タブ**: ホーム / 図鑑 / 撮影（中央・強調） / うちの子 / カレンダー
- スクロール時にタブバーが縮小（アイコンのみ表示）
- スクロール上方向でタブバーが復帰
- 撮影ボタンは他より大きく、アクセントカラー

```
タブアイコン: Lucide Icons（現行使用中）
アクティブ: accent-primary (#E8946A) + ラベル表示
非アクティブ: text-tertiary (#9B9590) + ラベル非表示（縮小時）
```

### 4-3. グリッドシステム

**写真グリッド（ホーム・ライブラリ）:**
- 3列グリッド（デフォルト）
- gap: 2px（Apple Photos準拠、写真間の隙間を最小に）
- アスペクト比: 1:1（正方形サムネイル）
- 月のセパレーター: テキスト左寄せ、ボーダーなし

**コレクショングリッド（図鑑）:**
- 2列グリッド
- gap: 12px
- 角丸: 12px
- カード内に写真 + タイトル + 進捗

**詳細ビュー:**
- 全幅写真
- 下からスワイプでメタデータ表示

### 4-4. スペーシング

```
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;

/* セクション間: space-8 (32px) */
/* カード内パディング: space-4 (16px) */
/* グリッドギャップ: space-3 (12px) — 写真グリッドは 2px */
```

---

## 5. コンポーネントスタイル

### 5-1. カード

```css
.card {
  background: var(--bg-elevated);
  border-radius: 12px;
  box-shadow: var(--shadow);
  overflow: hidden;
}
/* 写真カードはシャドウなし、角丸なし（グリッド内） */
/* コレクションカードはシャドウあり、角丸12px */
```

### 5-2. ボタン

```css
/* プライマリ（CTA） */
.btn-primary {
  background: var(--accent-primary);
  color: white;
  border-radius: 100px; /* pill shape */
  padding: 12px 24px;
  font-weight: 500;
}

/* セカンダリ */
.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-radius: 100px;
}

/* ゴースト（写真上のオーバーレイボタン） */
.btn-ghost {
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(8px);
  color: white;
  border-radius: 100px;
}
```

### 5-3. タグ / バッジ

```css
/* AIタグ（図鑑カテゴリ、ポーズなど） */
.tag {
  background: var(--accent-soft);
  color: var(--text-primary);
  border-radius: 100px;
  padding: 4px 12px;
  font-size: var(--text-sm);
}

/* 発見バッジ */
.badge-discover {
  background: var(--accent-discover);
  color: white;
  border-radius: 100px;
  padding: 2px 8px;
  font-size: var(--text-xs);
}
```

### 5-4. シート（ボトムシート）

Apple Photosの詳細ビューを参考に：
```css
.sheet {
  background: var(--bg-elevated);
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 24px rgba(0,0,0,0.08);
  /* ドラッグハンドル */
}
.sheet-handle {
  width: 36px;
  height: 5px;
  background: var(--border);
  border-radius: 100px;
  margin: 8px auto;
}
```

---

## 6. モーション / アニメーション

### 6-1. 基本方針

Apple Photos同様、アニメーションは「自然で滑らか」。派手さより心地よさ。

### 6-2. イージング

```css
--ease-out:    cubic-bezier(0.16, 1, 0.3, 1);    /* 主要トランジション */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* バウンス感のある操作 */
--ease-subtle: cubic-bezier(0.4, 0, 0.2, 1);      /* 微細な変化 */
```

### 6-3. デュレーション

```css
--duration-fast:   150ms;  /* ホバー、タップ反応 */
--duration-normal: 250ms;  /* 画面遷移、モーダル */
--duration-slow:   400ms;  /* シート、大きな変化 */
```

### 6-4. 具体的なアニメーション

| 場面 | アニメーション | 実装 |
|------|-------------|------|
| 写真タップ → 全画面 | 拡大トランジション（元位置から全画面へ） | Framer Motion layoutId |
| 図鑑エントリ解放 | 柔らかいスケールアップ + フェードイン | Framer Motion spring |
| タブ切り替え | クロスフェード（200ms） | CSS transition |
| ボトムシート表示 | 下からスライドアップ | Framer Motion animate |
| 新しい発見カード | 左からスライドイン + 微かなバウンス | Framer Motion spring |
| プルトゥリフレッシュ | 回転する猫の肉球アイコン | CSS animation |

---

## 7. アイコノグラフィ

### 7-1. アイコンセット

Lucide Icons を基本セットとして使用（現行継続）。

### 7-2. タブアイコンのマッピング

| タブ | アイコン | 説明 |
|------|---------|------|
| ホーム | `Home` or `Image` | ライブラリ / メインフィード |
| 図鑑 | `BookOpen` or `Grid3x3` | コレクション / 図鑑 |
| 撮影 | `Camera` | 中央の強調ボタン |
| うちの子 | `Cat` (custom) or `Heart` | 猫プロフィール |
| カレンダー | `Calendar` | 日別ビュー |

### 7-3. カスタム要素（将来）

- 猫の肉球アイコン（ローディング、足跡ポイント）
- 図鑑の棚アイコン（コレクション）
- 発見のキラキラアイコン（Discover）

---

## 8. 画面別デザインガイドライン

### 8-1. ホーム（コレクションビュー）

Apple Photosの「Library + Collections」ハイブリッドビューを参考に：

- **上部**: 最近の写真グリッド（3列、時系列）
- **下にスクロール**: コレクション群が現れる
  - 「最近の日々」（Recent Days）
  - 「うちの子たち」（猫ごとの自動コレクション）
  - 「発見」（新しい図鑑エントリ候補）
  - 「思い出」（週次ハイライト、季節の振り返り）
- 各コレクションは横スクロール可能なカルーセル

### 8-2. 図鑑

- 2列グリッドのコレクションカード
- 各カードに代表写真 + タイトル + 達成率のプログレスバー
- 未解放のエントリはシルエット（影絵）表示で期待感を演出
- タップで図鑑ページ（写真 + 解説 + タイムライン）

### 8-3. 撮影フロー

- カメラ起動 → 撮影 → 即座にプレビュー
- 猫の自動検出結果を小さく表示（「麦くんかも？」）
- ユーザーが確認 → 保存 → コレクションに追加
- 複数枚インポート時はウィザード形式

### 8-4. 猫プロフィール

- ヒーロー写真（大きく表示）
- 基本情報（名前、年齢、特徴）
- タイムライン（この子の物語の時間軸表示）
- 図鑑の達成率
- ケア記録（物語の背景として）

### 8-5. カレンダー

- 月ビュー + 日ごとのドット（写真がある日）
- 日タップでその日の写真 + ケア記録を表示
- Apple Photosの「日別ビュー」に近い体験

---

## 9. レスポンシブ対応

### 9-1. ブレークポイント

```css
/* モバイルファースト（PWA主体） */
--bp-sm:  375px;   /* iPhone SE */
--bp-md:  390px;   /* iPhone 15 */
--bp-lg:  428px;   /* iPhone 15 Plus */
--bp-xl:  768px;   /* iPad（将来対応） */
```

### 9-2. グリッド調整

| 画面幅 | 写真グリッド | コレクショングリッド |
|--------|------------|-------------------|
| 〜375px | 3列 | 1列 |
| 376〜428px | 3列 | 2列 |
| 429px〜 | 4列 | 2-3列 |

---

## 10. アクセシビリティ

- カラーコントラスト比: WCAG AA準拠（4.5:1以上）
- タッチターゲット: 最小44×44px
- 画像にはalt属性（猫の名前 + 日付）
- モーション: `prefers-reduced-motion` 対応
- フォントサイズ: ユーザー設定を尊重（rem単位使用）

---

## 11. Tailwind CSS 4 での実装ガイド

### 11-1. カスタムテーマ（globals.css）

```css
@theme {
  --color-bg-primary: #FAF9F7;
  --color-bg-secondary: #F3F1EE;
  --color-bg-tertiary: #E8E5E1;
  --color-bg-elevated: #FFFFFF;

  --color-text-primary: #1A1A1A;
  --color-text-secondary: #6B6560;
  --color-text-tertiary: #9B9590;

  --color-accent: #E8946A;
  --color-accent-soft: #F5D5C3;
  --color-discover: #7EB5A6;
  --color-story: #C4A882;

  --color-border: #E0DCD8;
  --color-border-subtle: #EDEAE7;
}
```

### 11-2. よく使うクラスの組み合わせ

```html
<!-- 写真グリッド -->
<div class="grid grid-cols-3 gap-[2px]">

<!-- コレクションカード -->
<div class="bg-bg-elevated rounded-xl shadow-sm overflow-hidden">

<!-- セクションタイトル -->
<h2 class="text-lg font-bold text-text-primary px-4 py-2">

<!-- タグ -->
<span class="bg-accent-soft text-text-primary text-sm rounded-full px-3 py-1">

<!-- プライマリボタン -->
<button class="bg-accent text-white rounded-full px-6 py-3 font-medium">
```

---

## 12. shadcn/ui カスタマイズ方針

現行の shadcn/ui (new-york スタイル) をベースに、以下をカスタマイズ：

- `components.json` の `baseColor` を `neutral` → カスタムに変更
- Dialog / Sheet のスタイルをデザインシステムに合わせる
- Button のバリアントに `ghost-overlay`（写真上用）を追加
- Badge に `discover` / `story` バリアントを追加

---

*このデザインシステムは、コンセプト「毎日のひとコマが、この子の物語になる」を視覚的に体現するためのガイドラインです。写真が主役、UIは黒子、時間が物語になる——この原則に沿ってデザイン判断を行ってください。*
