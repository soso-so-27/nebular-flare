import { NoticeDef, Task, SignalDef, CareTaskDef, InventoryItem } from "@/types";

export const QUIET_HOURS = { start: 23, end: 7 };

export const DEFAULT_TASKS: Omit<Task, "done" | "later" | "catId">[] = [
    // Daily
    { id: "t1", title: "朝ごはん", group: "CARE", cadence: "daily", due: "morning" },
    { id: "t2", title: "トイレ（すくう）", group: "CARE", cadence: "daily", due: "any" },
    { id: "t3", title: "水の交換", group: "CARE", cadence: "daily", due: "any" },
    { id: "t4", title: "夜ごはん", group: "CARE", cadence: "daily", due: "evening" },
    { id: "t5", title: "遊び 5分（任意）", group: "CARE", cadence: "daily", due: "evening", optional: true },

    // Weekly
    { id: "w1", title: "トイレ丸洗い", group: "CARE", cadence: "weekly", due: "weekend" },
    { id: "w2", title: "体重測定（どちらか）", group: "HEALTH", cadence: "weekly", due: "weekend" },
    { id: "w3", title: "爪チェック（必要なら切る）", group: "CARE", cadence: "weekly", due: "weekend", optional: true },

    // Monthly
    { id: "m1", title: "ノミ・ダニ予防（該当する場合）", group: "HEALTH", cadence: "monthly", due: "month", optional: true },
    { id: "m2", title: "給水器フィルター交換（該当する場合）", group: "CARE", cadence: "monthly", due: "month", optional: true },
    { id: "m3", title: "消耗品のまとめ買いチェック", group: "INVENTORY", cadence: "monthly", due: "month" },
];

// New CareTaskDef format with analyzed optimal settings
export const DEFAULT_CARE_TASK_DEFS: CareTaskDef[] = [
    // ごはん - 2回/日（朝+夕）がデフォルト、子猫・療養猫は3-4回に変更可能
    {
        id: "care_food",
        title: "ごはん",
        icon: "UtensilsCrossed",
        frequency: "twice-daily",
        timeOfDay: "anytime",
        mealSlots: ["morning", "evening"],
        perCat: false,
        enabled: true,
    },
    // 水 - 2回/日（朝+夕）がデフォルト、自動給水器使用者は1回に
    {
        id: "care_water",
        title: "お水",
        icon: "Droplet",
        frequency: "twice-daily",
        timeOfDay: "anytime",
        mealSlots: ["morning", "evening"],
        perCat: false,
        enabled: true,
    },
    // トイレ（すくう） - 1回/日（夕方）がデフォルト、多頭飼いは2-3回に
    {
        id: "care_litter",
        title: "トイレ",
        icon: "Trash2",
        frequency: "once-daily",
        timeOfDay: "evening",
        mealSlots: ["evening"],
        perCat: false,
        enabled: true,
    },
    // ブラッシング - 週1回がデフォルト、長毛種・換毛期は毎日に
    {
        id: "care_brush",
        title: "ブラッシング",
        icon: "Scissors",
        frequency: "weekly",
        timeOfDay: "anytime",
        perCat: true,
        enabled: false, // デフォルトは無効（必要な人が有効に）
    },
    // 遊び - 1回/日（夕方）、任意項目
    {
        id: "care_play",
        title: "遊び",
        icon: "Sparkles",
        frequency: "once-daily",
        timeOfDay: "evening",
        mealSlots: ["evening"],
        perCat: false,
        enabled: false, // デフォルトは無効（任意）
    },
    // 投薬 - 必要時のみ
    {
        id: "care_medicine",
        title: "お薬",
        icon: "Pill",
        frequency: "as-needed",
        timeOfDay: "anytime",
        perCat: true,
        enabled: false, // デフォルトは無効（必要な人が有効に）
    },
];

export const DEFAULT_NOTICE_DEFS: NoticeDef[] = [
    // ========== 食事カテゴリ ==========
    {
        id: "n_appetite",
        title: "食欲、いつも通り？",
        kind: "notice",
        cadence: "daily",
        due: "any",
        choices: ["いつも通り", "少なめ", "食べない"],
        enabled: true,
        optional: false,
        inputType: "ok-notice",
        category: "eating",
        required: true,
        alertLabel: "食欲：回復確認",
    },
    {
        id: "n_water",
        title: "お水、飲んでる？",
        kind: "notice",
        cadence: "daily",
        due: "any",
        choices: ["普通", "多め", "少なめ", "飲んでない"],
        enabled: false, // 高齢猫・療養中の人が有効化
        optional: true,
        inputType: "choice",
        category: "eating",
        required: false,
        alertLabel: "飲水：回復確認",
    },

    // ========== トイレカテゴリ ==========
    {
        id: "n_toilet",
        title: "トイレ、いつも通り？",
        kind: "notice",
        cadence: "daily",
        due: "any",
        choices: ["いつも通り", "気になる"],
        enabled: true,
        optional: false,
        inputType: "ok-notice",
        category: "toilet",
        required: true,
        alertLabel: "トイレ：回復確認",
    },
    {
        id: "n_poop",
        title: "うんち、どうだった？",
        kind: "notice",
        cadence: "daily",
        due: "any",
        choices: ["普通", "ゆるい", "硬い", "なし"],
        enabled: false, // 詳細記録したい人が有効化
        optional: true,
        inputType: "choice",
        category: "toilet",
        required: false,
        alertLabel: "うんち：状態確認",
    },
    {
        id: "n_pee",
        title: "おしっこ、回数は？",
        kind: "notice",
        cadence: "daily",
        due: "any",
        choices: ["普通", "多い", "少ない", "血混じり"],
        enabled: false, // 尿路系トラブル経験者が有効化
        optional: true,
        inputType: "choice",
        category: "toilet",
        required: false,
        alertLabel: "おしっこ：状態確認",
    },

    // ========== 健康カテゴリ ==========
    {
        id: "n_vomit",
        title: "吐いた？",
        kind: "notice",
        cadence: "daily",
        due: "any",
        choices: ["なし", "1回", "2回以上"],
        enabled: true,
        optional: false,
        inputType: "count",
        category: "health",
        required: false,
        alertLabel: "嘔吐：その後の様子",
    },
    {
        id: "n_energy",
        title: "元気度、いつも通り？",
        kind: "notice",
        cadence: "daily",
        due: "any",
        choices: ["元気", "普通", "おとなしい", "ぐったり"],
        enabled: true,
        optional: false,
        inputType: "choice",
        category: "health",
        required: true,
        alertLabel: "元気：回復確認",
    },
    {
        id: "n_weight",
        title: "体重測った？",
        kind: "notice",
        cadence: "weekly",
        due: "weekend",
        choices: ["測った", "スキップ"],
        enabled: false, // 体重管理したい人が有効化
        optional: true,
        inputType: "count", // 数値入力
        category: "health",
        required: false,
    },

    // ========== 行動カテゴリ ==========
    {
        id: "n_behavior",
        title: "いつもより甘えん坊？",
        kind: "notice",
        cadence: "daily",
        due: "any",
        choices: ["いつも通り", "甘えん坊", "距離ある"],
        enabled: false,
        optional: true,
        inputType: "choice",
        category: "behavior",
        required: false,
        alertLabel: "行動：様子見",
    },
    {
        id: "n_scratch",
        title: "かゆがってる？毛づくろい多い？",
        kind: "notice",
        cadence: "daily",
        due: "any",
        choices: ["普通", "多め", "気になる"],
        enabled: false, // 皮膚トラブル経験者が有効化
        optional: true,
        inputType: "ok-notice",
        category: "behavior",
        required: false,
        alertLabel: "皮膚：様子見",
    },

    // ========== モーメント（写真） ==========
    {
        id: "n_photo",
        title: "今日のかわいい、1枚残す？",
        kind: "moment",
        cadence: "daily",
        due: "evening",
        choices: ["撮る", "今度"],
        enabled: true,
        optional: true,
        inputType: "ok-notice",
        category: "behavior",
        required: false,
    },
];

export const SEASONAL_NOTICE_DEFS: NoticeDef[] = [
    {
        id: "sn_spring_1",
        title: "換毛（毛）、いつもより多い？",
        kind: "notice",
        cadence: "daily",
        due: "any",
        choices: ["ふつう", "多い", "かなり多い"],
        enabled: false,
        optional: true,
        seasonal: true,
        season: "spring",
        inputType: "choice",
        category: "health",
        required: false,
    },
    // 他の季節も同様に追加
];

export const SIGNAL_DEFS: SignalDef[] = [
    { id: "s1", label: "食欲（詳細）", options: ["◎", "○", "△", "×"] },
    { id: "s2", label: "嘔吐（詳細）", options: ["なし", "あり"] },
    { id: "s3", label: "便（詳細）", options: ["普通", "ゆるい", "硬い", "なし"] },
];

// Default inventory items with analyzed optimal settings
export const DEFAULT_INVENTORY_ITEMS: InventoryItem[] = [
    // ========== 必須アイテム ==========
    {
        id: "inv_food",
        label: "フード",
        range: [7, 14], // 1-2週間分
        stockLevel: "full",
        purchaseMemo: "", // ブランド名などを記入
        alertEnabled: true,
    },
    {
        id: "inv_litter",
        label: "猫砂",
        range: [7, 14],
        stockLevel: "full",
        purchaseMemo: "",
        alertEnabled: true,
    },

    // ========== 一般アイテム ==========
    {
        id: "inv_treats",
        label: "おやつ",
        range: [14, 30], // 2-4週間サイクル
        stockLevel: "full",
        purchaseMemo: "",
        alertEnabled: false, // デフォルト無効（必須ではない）
    },
    {
        id: "inv_deodorant",
        label: "消臭アイテム",
        range: [14, 30],
        stockLevel: "full",
        purchaseMemo: "ゴミ袋、消臭スプレーなど",
        alertEnabled: true,
    },

    // ========== システムトイレ派向け ==========
    {
        id: "inv_sheets",
        label: "ペットシーツ",
        range: [14, 30],
        stockLevel: "full",
        purchaseMemo: "",
        alertEnabled: false, // 使わない人は無効のまま
    },

    // ========== 療養中向け ==========
    {
        id: "inv_medicine",
        label: "薬・サプリ",
        range: [7, 14],
        stockLevel: "full",
        purchaseMemo: "",
        alertEnabled: false, // 使う人だけ有効化
    },

    // ========== その他 ==========
    {
        id: "inv_scratcher",
        label: "爪とぎ",
        range: [30, 60], // 1-2ヶ月サイクル
        stockLevel: "full",
        purchaseMemo: "",
        alertEnabled: false,
    },
    {
        id: "inv_filter",
        label: "給水器フィルター",
        range: [30, 45], // 1-1.5ヶ月サイクル
        stockLevel: "full",
        purchaseMemo: "",
        alertEnabled: false, // 自動給水器使用者向け
    },
];
