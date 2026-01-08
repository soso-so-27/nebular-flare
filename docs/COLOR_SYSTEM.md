# Nebula Flare - Color System

当アプリケーションのカラーシステムは、ブランドコンセプト「猫のいる暮らしを、そっと整える」に基づき、乳白ガラスの柔らかさと自然なアクセントカラーで構成されています。

## カラーパレット

### Brand Colors (アクセント)

| Color Name | Role | Hex / OKLCH | Semantic Usage |
| :--- | :--- | :--- | :--- |
| **Sage (セージ)** | **Primary / 軸色** | `#7CAA8E` | **「安心・継続・日常」**<br>メインアクション、完了状態、肯定的なフィードバック、お世話ログ、グラフの主線。 |
| **Peach (ピーチ)** | **Secondary / 感情** | `#E8B4A0` | **「楽しさ・体温・愛着」**<br>写真、ギャラリー、コミュニケーション要素、ハートフルなインタラクション、アクティブな選択状態。 |
| **Lavender (ラベンダー)** | **Attention / 変化** | `#B8A6D9` | **「静かな注意・変化」**<br>アラート、非日常的な出来事（異変など）、削除などの不可逆アクション、夜間の表現。 |

### Base Colors (ベース)

| Color Name | Role | Hex / OKLCH | Description |
| :--- | :--- | :--- | :--- |
| **Milky Glass (乳白)** | **Background** | `#FAF9F7` | 生成り色に近い温かみのある白。純白 (`#FFFFFF`) は極力避ける。 |
| **Slate (スレート)** | **Text / Neutral** | `#64748B` | 無彩色のグレーではなく、少し青みを含んだスレートグレーを使用し、馴染みを良くする。 |

## 実装ガイド (Tailwind CSS)

`src/app/globals.css` にて定義されており、以下のユーティリティクラスとして利用可能です。

```tsx
// 背景色
<div className="bg-brand-sage" />
<div className="bg-brand-peach" />
<div className="bg-brand-lavender" />

// テキスト色
<span className="text-brand-sage" />
<span className="text-brand-peach" />
<span className="text-brand-lavender" />

// ボーダー色
<div className="border-brand-sage" />
```

### セマンティックエイリアス

役割に応じたエイリアスも定義しています（推奨）。

*   `bg-axis` (= Sage)
*   `bg-emotion` (= Peach)
*   `bg-attention` (= Lavender)
*   `bg-base-glass` (= Milky Glass Base)

## ガラス効果 (Glassmorphism)

ブランドの核となる「乳白ガラス」表現は、透明度とブラーを組み合わせて実現します。

```tsx
// 基本的なガラスカード
<div className="bg-white/80 backdrop-blur-md border border-white/40 shadow-sm rounded-xl">
  コンテンツ
</div>
```

*   **Light Mode**: 白ベース (`bg-white/xx`) + 濃い影 (`shadow-sm` or `shadow-md`)
*   **Dark Mode**: 黒ベース (`bg-black/xx`) ではなく、スレートまたは濃紺ベースを使用し、境界線を光らせる (`border-white/10`)。
