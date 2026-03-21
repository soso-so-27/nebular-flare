# 1. 目的 / コンセプト

## 1.1 目的
猫との暮らしを「仕事化」せずに、家族で“放置OK”で回るケア管理アプリ（MVP）。

## 1.2 コンセプト（プロダクト方針）
- **最小入力で回る**：毎日頑張らせない。未チェックでも責めない。
- **固定3枚の気づき（1分）**を軸に、必要な人だけ深掘りできる。
- **AIは要約・整形・分類のみ**（診断しない／判断しない／病名推定しない）。
- **不安を煽らない**：固定の安全文／受診判断はユーザー。
- **家（世帯）で共有**：家族の連絡帳・ログ・在庫を共有。

---

# 2. 想定ユーザー / ユースケース

## 2.1 ユーザー
- 同一世帯の家族（例：ママ/パパ）
- 多頭飼い（猫を複数登録）

## 2.2 利用スタイル（2モード）
- **放置OK（デフォルト）**
  - 通知は「異常っぽい気づき」「期限」「在庫しきい値」だけ。
  - 週1まとめで“畳んで回収”。毎日入力しなくてOK。
- **毎日ちょい見**
  - 固定3枚の気づきだけで終えてOK。
  - ケアはできる範囲で。

---

# 3. 画面 / 情報設計（IA）

タブ（想定）
1) **今日（Home）**
2) **予定（Calendar）**
3) **ログ（Log）**
4) **ノート（Notes）**
5) **その他（More / Settings）**

Home には2つの表示モードがある：
- チェックリスト型（最大6枚カード表示＋残り件数）
- カードめくり型（スワイプ：右=あとで / 左=済んだ）

---

# 4. ドメインモデル（データ）

## 4.1 エンティティ一覧
- **Household**（世帯）
- **User**（家族メンバー）
- **Cat**（猫）
- **Task**（ケア/メモのタスク）
- **NoticeDef**（気づきカード定義）
- **NoticeLog**（気づきカードの記録ログ：猫別）
- **SignalDef**（体調詳細の項目定義）
- **SignalLog**（体調詳細のログ：猫別）
- **InventoryItem**（家の在庫アイテム）
- **Memo**（共有メモ：家族用連絡帳）
- **Photo**（猫アルバム写真：タグ付き）
- **Event**（通院/投薬など未来イベント）
- **Settings**（プラン、通知、しきい値、表示モード等）

## 4.2 主要フィールド（最低限）

### Cat
- id, name, age, sex

### Task
- id
- title
- group: CARE | HEALTH | INVENTORY | MEMO
- cadence: daily | weekly | monthly | once
- due: morning | evening | any | weekend | month
- dueAt（任意：onceや手動設定の場合）
- done: boolean
- later: boolean
- doneBy, doneAt, laterAt（任意）
- optional: boolean

### NoticeDef（気づきカード定義）
- id
- title
- kind: notice | moment
- cadence: daily | weekly
- due: any | evening | weekend
- choices: string[]（ボタン選択肢）
- enabled: boolean（定義が表示対象か）
- optional: boolean（任意か）
- seasonal: boolean（季節デッキか）
- season: spring | summer | autumn | winter（seasonal=trueのとき）

### NoticeLog（猫別）
- catId
- noticeId
- value（選択結果）
- at（記録時刻）
- done, doneBy, doneAt
- later, laterAt

### SignalDef / SignalLog
- SignalDef: id, label, options[]
- SignalLog（猫別）: value, at

### InventoryItem
- id
- label
- range: [minDays, maxDays]（残り日数の“レンジ”）
- last（前回アクション表示用："買った" / "まだある" など）

### Memo
- at, text

### Photo
- id
- at
- catId
- suggestedTags: string[]（推定タグ）
- confirmedTags: string[]（ユーザー確定タグ）
- note（任意）
- archived: boolean（任意）

### Event
- id
- type: vet | med | other
- title
- catId
- at（日時）
- location
- note
- archived: boolean

### Settings
- plan: Free | Pro
- aiEnabled: boolean
- engagement: passive | daily
- homeMode: checklist | cards
- weeklySummaryEnabled: boolean
- quietHours: startHour=23, endHour=7（固定でも可）
- invThresholds: { soon: number, urgent: number, critical: number }
- seasonalDeckEnabled: boolean（Pro）
- skinPackOwned: boolean（買い切り）
- skinMode: default | auto | spring | summer | autumn | winter
- photoTagAssist: boolean（Pro：写真追加後にタグ確定UIを開く）

---

# 5. 機能要件（画面別）

## 5.1 TopBar（猫切替）
- アクティブ猫の表示（名前/性別/年齢）
- 猫ボタンで activeCatId を切替
- Pro/Free バッジ表示
- スキン状態表示（label + icon）

---

## 5.2 今日（Home）

### 5.2.1 固定枠（FixedRow）
表示例：
- 放置OKの場合：
  - **週1まとめ（日曜18:00）**
  - 「異常っぽいは即時」「深夜は朝に回す」「週1まとめは直近7日を畳む」
  - ボタン：
    - まとめプレビュー開閉
    - “今週は静かに”（=週1まとめだけOFF。異常即時はONのまま）
- 家族メモ未読（例）の固定カード

### 5.2.2 今日のカード（最大6枚）
- 先頭に **気づき（固定3枚）** を1つのグループカードとして表示
- 次にケア/メモ/思い出を優先順で埋めて最大6枚
- 残り件数を表示し「残りをカードで消化」導線

**気づき（固定3枚）**
- 初期固定（常にenabled=trueで表示対象）
  - 食欲、いつも通り？（choices: いつも通り / ちょっと違う）
  - トイレ、いつも通り？（choices: いつも通り / 気になる）
  - 吐いた？（choices: なし / あり）
- 「あとで」で later=true（記録は未完のまま）
- 選択で done=true & value保存
- **異常扱い条件**：value が「ちょっと違う / 気になる / あり」

**季節デッキ（+2枚、Pro）**
- 固定3枚は崩さず、季節カードを追加2枚まで表示。
- 季節カード定義は常駐（enabled切替で出し分け）。
- More設定：季節デッキ ON/OFF（Proのみ）
- 実装ルール（推奨）：
  - seasonalDeckEnabled=true のとき、現在季節(seasonKey)の2件を enabled=true
  - OFF のとき、全季節カードを enabled=false
- 表示上は「Pro」バッジを付ける。

**思い出（任意）**
- 「今日のかわいい、1枚残す？」（choices: 撮る / 今度）
- optional=true

**ケア（Task）カード**
- 表示対象：done=false && later=false && group!=MEMO
- 期限ラベル表示（後述の期限計算）
- ボタン：あとで（later=true）/ 済んだ（done=true）

**気にしておくこと（Task group=MEMO）**
- 表示対象：done=false && later=false && group=MEMO
- ボタン：あとで / 済んだ

### 5.2.3 1行メモ（あとで）
- 入力→「積む」
- Taskとして追加：
  - group=MEMO, cadence=once, later=true, optional=true
  - dueAt = **3日後 20:00**

### 5.2.4 体調（任意の詳細）
- SignalDef の選択肢をボタンで記録（猫別）
- 例：食欲（◎/○/△/×）、嘔吐（なし/あり）、便（普通/ゆるい/硬い/なし）

### 5.2.5 補充のめやす（家）
- InventoryItem を一覧表示
- 在庫しきい値（設定値）で urgency を計算
- アクション：
  - 「買った」→ range=[10,21], last="買った"
  - 「まだある」→ rangeを増やす（例：min+2, max+3）, last="まだある"

### 5.2.6 共有メモ（家）
- Textarea入力→保存
- memos.items に [{at, text}, ...] で追加
- 最新2件を表示

---

## 5.3 Home（カードめくり型）

### 5.3.1 表示
- view切替：未チェック / あとで / 済んだ
- リストは以下を統合して表示：
  - Task（ケア + メモ）
  - Notice（気づき + 思い出）

### 5.3.2 並び順（優先順位 + 期限）
- priorityGroup:
  - 0: 異常っぽい気づき
  - 0.8: 通常の気づき
  - 1: いつものケア
  - 1.7: メモ（気にしておく）
  - 2: 思い出
- 同priority内は bucket（overdue/now/today/week/month/later）→ dueAt 昇順

### 5.3.3 操作
- スワイプ：
  - 右（+90px以上）= あとで
  - 左（-90px以下）= 済んだ
- 画面下のボタンでも「あとで」「済んだ」可能
- 「元に戻す」：直近操作を undo（task / notice 両方対応）
- Notice の場合：済んだ時に value を持たせる（選択肢がある場合はその値）

---

## 5.4 予定（Calendar）

### 5.4.1 未来イベントの管理
- Event一覧（未来＋直近24h以降を最大6件）
- イベント追加（モック）：
  - 2日後 11:00 に vet 予定を追加
  - 同時に Task(MEMO) を自動生成（前日 20:00、later=true）

### 5.4.2 イベントの操作
- 「メモに積む」：イベント→MEMOタスク生成（前日20:00、later=true）
- 「済んだ」：event.archived=true

### 5.4.3 週1まとめ通知設定
- weeklySummaryEnabled のON/OFF
- 表示：日曜 18:00 固定

---

## 5.5 ログ（Log）

### 5.5.1 気になるだけ
- enabledなnoticeのうち kind!=moment を一覧
- **異常っぽい（通知対象）**だけ抽出して上に表示

### 5.5.2 該当写真（Pro）
- abnormal（異常っぽい）があるとき、タグマッピングで写真を抽出
  - 食欲異常 → タグ「食事」
  - トイレ異常 → タグ「トイレ」
  - 吐いた → タグ「吐いた」「体調」
- Proのみ表示（Freeはプロモ表示）

### 5.5.3 病院用：直近7日まとめ（1枚）（Pro + AI ON）
- 生成内容（AI＝整形のみ）
  - 直近7日まとめのテキスト
  - 「気になる（ユーザー選択）」
  - 「体調（任意の詳細）」
  - 「関連写真（タグ）」
  - 「質問したいこと（テンプレ）」
  - 固定の注意文（診断しない／受診はユーザー判断）
- 出力：
  - 生成する（モック）
  - コピー
  - 印刷/PDF（ブラウザ印刷）

---

## 5.6 ノート（Notes）

### 5.6.1 共有メモ
- memoを保存し履歴表示
- 既存メモを「カードにする（あとで）」で MEMOタスク化（dueAt=3日後20:00、later=true）

### 5.6.2 猫アルバム（Pro）
- 写真の価値は「保存」ではなく **タグ→検索→週報/病院用まとめ** につながる入力

**検索**
- テキスト検索（タグ＋noteを含む）
- タグフィルタ（例：食事/トイレ/吐いた/遊び/寝姿/体調/病院/その他）

**タグ補助（ハイブリッド）**
- suggestedTags（推定）を出す
- confirmedTags（確定）をユーザーが任意で付ける
- effectiveTags の決定ルール：
  1) confirmedTags があればそれを優先
  2) なければ suggestedTags
  3) 互換のため tags（旧）も許容

**写真追加後の挙動（photoTagAssist）**
- ONの場合、写真追加直後にタグ確定UIを開く

**タグを整えるUI（Pro）**
- 推定タグを採用（確定へコピー）
- 確定をクリア
- 追加タグのトグル
- note入力

---

## 5.7 その他（More / Settings）

### 5.7.1 プラン
- Free / Pro 切替（モック）
- Proで解放：
  - 季節デッキ
  - 病院用まとめ
  - アルバム強化（無制限/タグ補助/検索）

### 5.7.2 利用スタイル
- passive（放置OK）/ daily（毎日ちょい見）

### 5.7.3 AI（要約・整形）
- ON/OFF
- ON時のみ：
  - 週報の短文化（AIで短く）
  - 病院用まとめ生成

### 5.7.4 ホーム表示モード
- checklist / cards 切替

### 5.7.5 季節デッキ（Pro）
- ON/OFF
- 現在季節の表示（春夏秋冬）
- ON時にのみ該当季節の2件を有効化して出す（実装）

### 5.7.6 スキン（見た目だけ課金・買い切り）
- skinPackOwned=false の場合：購入導線
- owned=true の場合：
  - skinMode: default / auto / spring / summer / autumn / winter
  - autoの場合は現在季節に追従
- **注意**：見た目だけ。通知・記録ロジックは変えない。

### 5.7.7 在庫しきい値（通知）
- invThresholds を編集可能
  - soon（注意）
  - urgent（そろそろ）
  - critical（今すぐ）
- **整合性自動補正**：critical ≤ urgent ≤ soon

### 5.7.8 写真タグ補助（Pro）
- photoTagAssist ON/OFF

### 5.7.9 気づきカード（追加）
- optional な notice を個別に enabled 切替

### 5.7.10 家族（招待）
- 招待QR（モック）
- メンバー表示（例：ママ/パパ）

---

# 6. 通知 / 週報（要件）

## 6.1 通知対象
- **異常っぽい気づき**（ちょっと違う / 気になる / あり）
- **在庫しきい値**（minDaysが閾値を下回る）
- **期限**（ケアタスクのoverdue / now など、運用はMVPで最小）

## 6.2 Quiet Hours（深夜抑制）
- quietHours: 23:00〜07:00
- 異常通知が深夜に発生した場合：**朝7:00に繰り延べ**

## 6.3 週1まとめ（放置OKの柱）
- 毎週 **日曜 18:00**
- 対象期間：直近7日（今日含む）
- 内容（短文通知 + 詳細テキスト）
  - 気になる件数（異常っぽい）
  - 補充件数（在庫警告）
  - 未チェック上位3件（ケア）
  - 共有メモ最新2件
  - Proの場合：今週の写真ハイライト3枚（※実装は後でも可）
- weeklySummaryEnabled=false のとき：
  - **週1まとめ通知のみOFF**
  - 異常即時はONのまま

## 6.4 週報プレビュー / 共有
- 週報テキストを
  - コピー
  - 印刷/PDF（ブラウザ印刷）

---

# 7. 期限計算 / バケット（実装ルール）

## 7.1 dueAtの計算
- daily:
  - morning → 9:00
  - evening → 20:00
  - any → 23:59
- weekly:
  - 次の日曜 18:00（実装は「今週末」扱い）
- monthly:
  - 月末 20:00
- once:
  - dueAt をそのまま使う

## 7.2 bucket
- overdue（期限過ぎ）
- now（3時間以内）
- today（同日）
- week（7日以内）
- month（31日以内）
- later
- done

---

# 8. AI要件（絶対条件）

## 8.1 AIの禁止事項
- 診断・病名推定・治療提案をしない
- 不確かな断定をしない

## 8.2 AIがやること（MVP）
- 週報の短文化（要約）
- 病院用まとめの整形（ログを見せやすい文章に整える）

## 8.3 出力に必ず入れる文言
- 「本資料は記録の要約です。診断は行いません。」
- 「不安が強い／ぐったり等があれば、早めに受診を検討してください。」

---

# 9. プラン / 課金（MVPルール）

## 9.1 Free
- 固定3枚の気づき
- 基本ケア・在庫・共有メモ
- 予定（未来イベント）
- ログ閲覧（簡易）

## 9.2 Pro（サブスク想定）
- 季節デッキ（+2枚）
- 猫アルバム強化（無制限/検索/タグ補助）
- 病院用まとめ（直近7日 1枚）
- 週報の写真ハイライト（任意）

## 9.3 スキン（買い切り）
- 見た目のみ変更（ロジック非変更）
- default / auto / season指定

---

# 10. 非機能要件（最低限）

- モバイル中心で軽いUI（1分で終わる）
- オフライン/低電波でも最低限入力が落ちない設計（将来）
- データは世帯共有が前提（権限：家族のみ）
- 監査ログ（誰が記録したか doneBy など）は保持

---

# 11. MVP実装の優先順位（推奨）

1) 猫切替 + 固定3枚気づき + 記録保存
2) タスク（ケア/メモ）+ あとで/済んだ + 期限計算
3) 共有メモ
4) 在庫（レンジ+2タップ）+ しきい値
5) 週1まとめ生成（テキスト）+ コピー/PDF
6) Pro：アルバム（タグ検索）
7) Pro：病院用まとめ生成
8) 季節デッキON/OFF（現在季節連動）
9) スキン（買い切り）

---

# 12. 受け入れ基準（サンプル）

- 固定3枚の気づきは、毎日ホームで必ず見える
- 気づきで「ちょっと違う/気になる/あり」を選ぶと abnormal として集計される
- 週1まとめは日曜18:00に生成でき、異常件数/補充件数/未チェック上位3件が出る
- weeklySummaryEnabledをOFFにしても、異常即時（または朝繰り延べ）は維持される
- 在庫しきい値は critical ≤ urgent ≤ soon に自動補正される
- 写真のタグは confirmedTags が優先され、ない場合に suggestedTags が使われる
- AIの出力には必ず「診断しない」注意文が含まれる

