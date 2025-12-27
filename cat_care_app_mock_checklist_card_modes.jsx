import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  CalendarDays,
  ClipboardList,
  NotebookPen,
  Activity,
  Settings,
  Bell,
  ShoppingCart,
  Cat,
  Users,
  Check,
  Timer,
  AlertTriangle,
  Heart,
  Sparkles,
  FileText,
  Wand2,
  SlidersHorizontal,
  Tag,
  Sun,
  Leaf,
  Snowflake,
  Flower2,
} from "lucide-react";
import { Image as ImageIcon } from "lucide-react";

/**
 * CatCare Mock
 * 目的：猫との暮らしを「仕事化」せず、放置OKで回る。
 *
 * AIのおすすめ方針（MVP）
 * - AIは「要約・整形・分類」だけ（診断しない／判断しない）
 * - ユーザーが操作しなくても効く（裏側で整える）
 * - 不安を煽らない（固定の安全文／受診判断はユーザー）
 *
 * 追加（今回）
 * - 季節デッキ（春夏秋冬）：固定3枚はそのまま、季節の気づきを+2枚（ProでON/OFF）
 * - スキン（見た目）課金：季節スキンパック（買い切りモック）＋自動切替
 *
 * 既存（前回）
 * - 在庫しきい値（7/3/1日）を設定で調整できる
 * - 写真タグ：ユーザー選択＋推定（ハイブリッド）
 */

const QUIET_HOURS = { start: 23, end: 7 };
const fmt = (d) => d.toLocaleString(undefined, { month: "short", day: "numeric" });

function seasonKeyFromDate(d) {
  const m = d.getMonth() + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}
function seasonLabel(k) {
  if (k === "spring") return "春";
  if (k === "summer") return "夏";
  if (k === "autumn") return "秋";
  return "冬";
}

function skinMeta(key) {
  // 色は増やさず、雰囲気だけを薄く変える（“見た目だけ”課金の安全設計）
  if (key === "spring") return { key, label: "春", Icon: Flower2, bg: "bg-muted/10" };
  if (key === "summer") return { key, label: "夏", Icon: Sun, bg: "bg-muted/20" };
  if (key === "autumn") return { key, label: "秋", Icon: Leaf, bg: "bg-muted/10" };
  if (key === "winter") return { key, label: "冬", Icon: Snowflake, bg: "bg-muted/20" };
  return { key: "default", label: "デフォルト", Icon: Sparkles, bg: "" };
}

const sampleCats = [
  { id: "c1", name: "麦", age: "2才", sex: "オス" },
  { id: "c2", name: "雨", age: "2才", sex: "オス" },
];

// 家（共通）のケア
const defaultTasks = [
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

// 家（共通）の在庫（残り日数の“レンジ”だけ持つ）
const defaultInventory = [
  { id: "i1", label: "猫砂", range: [3, 6] },
  { id: "i2", label: "フード", range: [5, 9] },
  { id: "i3", label: "消臭（ゴミ袋含む）", range: [2, 4] },
];

// 猫ごとの体調ログ（テンプレ）
const defaultSignalDefs = [
  { id: "s1", label: "食欲（詳細）", options: ["◎", "○", "△", "×"] },
  { id: "s2", label: "嘔吐（詳細）", options: ["なし", "あり"] },
  { id: "s3", label: "便（詳細）", options: ["普通", "ゆるい", "硬い", "なし"] },
];

/**
 * 気づきカード（テンプレ）
 * - 初期3枚固定
 * - 追加は設定でON/OFF（慣れてきたら）
 * - kind: notice / moment
 */
const defaultNoticeDefs = [
  // 初期3枚（固定）
  {
    id: "n1",
    title: "食欲、いつも通り？",
    kind: "notice",
    cadence: "daily",
    due: "any",
    choices: ["いつも通り", "ちょっと違う"],
    enabled: true,
    optional: false,
  },
  {
    id: "n2",
    title: "トイレ、いつも通り？",
    kind: "notice",
    cadence: "daily",
    due: "any",
    choices: ["いつも通り", "気になる"],
    enabled: true,
    optional: false,
  },
  {
    id: "n3",
    title: "吐いた？",
    kind: "notice",
    cadence: "daily",
    due: "any",
    choices: ["なし", "あり"],
    enabled: true,
    optional: false,
  },

  // 慣れてきたら（ON/OFF）
  {
    id: "n4",
    title: "いつもより甘えん坊？",
    kind: "notice",
    cadence: "daily",
    due: "any",
    choices: ["いつも通り", "甘えん坊", "距離ある"],
    enabled: false,
    optional: true,
  },
  {
    id: "n5",
    title: "走り回った？",
    kind: "notice",
    cadence: "daily",
    due: "evening",
    choices: ["ふつう", "多め", "少なめ"],
    enabled: false,
    optional: true,
  },
  {
    id: "n6",
    title: "目ヤニ・鼻水",
    kind: "notice",
    cadence: "daily",
    due: "any",
    choices: ["なし", "少し", "気になる"],
    enabled: false,
    optional: true,
  },

  // 思い出（任意）
  {
    id: "n7",
    title: "今日のかわいい、1枚残す？（任意）",
    kind: "moment",
    cadence: "daily",
    due: "evening",
    choices: ["撮る", "今度"],
    enabled: true,
    optional: true,
  },
];

// 季節デッキ：固定3枚はそのまま、季節の気づきを+2枚（ProでON/OFF）
const seasonalNoticeDefs = [
  // 春
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
  },
  {
    id: "sn_spring_2",
    title: "目やに・くしゃみ、増えた？",
    kind: "notice",
    cadence: "daily",
    due: "any",
    choices: ["なし", "少し", "気になる"],
    enabled: false,
    optional: true,
    seasonal: true,
    season: "spring",
  },

  // 夏
  {
    id: "sn_summer_1",
    title: "水、飲めてる？",
    kind: "notice",
    cadence: "daily",
    due: "any",
    choices: ["いつも通り", "少なめ", "気になる"],
    enabled: false,
    optional: true,
    seasonal: true,
    season: "summer",
  },
  {
    id: "sn_summer_2",
    title: "暑がってるサイン（床にのびる等）",
    kind: "notice",
    cadence: "daily",
    due: "any",
    choices: ["なし", "ある", "かなり"],
    enabled: false,
    optional: true,
    seasonal: true,
    season: "summer",
  },

  // 秋
  {
    id: "sn_autumn_1",
    title: "食欲、増えた？",
    kind: "notice",
    cadence: "daily",
    due: "any",
    choices: ["ふつう", "増えた", "減った"],
    enabled: false,
    optional: true,
    seasonal: true,
    season: "autumn",
  },
  {
    id: "sn_autumn_2",
    title: "体重、ちょい増えた？（感覚でOK）",
    kind: "notice",
    cadence: "weekly",
    due: "weekend",
    choices: ["変わらない", "ちょい増", "ちょい減"],
    enabled: false,
    optional: true,
    seasonal: true,
    season: "autumn",
  },

  // 冬
  {
    id: "sn_winter_1",
    title: "乾燥でフケ/かゆそう？",
    kind: "notice",
    cadence: "daily",
    due: "any",
    choices: ["なし", "少し", "気になる"],
    enabled: false,
    optional: true,
    seasonal: true,
    season: "winter",
  },
  {
    id: "sn_winter_2",
    title: "水を飲む量、減ってない？",
    kind: "notice",
    cadence: "daily",
    due: "any",
    choices: ["いつも通り", "少なめ", "気になる"],
    enabled: false,
    optional: true,
    seasonal: true,
    season: "winter",
  },
];

// 既存の通知定義に、季節デッキを“常駐（OFF）”で追加
// ※ログ初期化の都合で、定義は常に存在させ、enabled を切り替える
seasonalNoticeDefs.forEach((n) => defaultNoticeDefs.push(n));

// --------- Inventory thresholds (editable) ----------
// soon: 7日以下で「注意」、urgent: 3日以下で「そろそろ」、critical: 1日以下で「今すぐ"
function clampInt(v, min, max) {
  const n = Number.isFinite(v) ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function normalizeInvThresholds(t) {
  // ルール：critical <= urgent <= soon になるように補正
  const soon = clampInt(t?.soon ?? 7, 1, 60);
  const urgent = clampInt(t?.urgent ?? 3, 1, 60);
  const critical = clampInt(t?.critical ?? 1, 1, 60);

  const a = Math.max(1, Math.min(soon, 60));
  const b = Math.max(1, Math.min(urgent, a));
  const c = Math.max(1, Math.min(critical, b));
  return { soon: a, urgent: b, critical: c };
}

function invUrgency(minDays, thresholds) {
  const t = normalizeInvThresholds(thresholds);
  const d = clampInt(minDays ?? 0, 0, 365);
  if (d <= t.critical) return "danger";
  if (d <= t.urgent) return "warn";
  if (d <= t.soon) return "soon";
  return "ok";
}

function pillForUrgency(u) {
  if (u === "danger") return <Badge variant="destructive">今すぐ</Badge>;
  if (u === "warn") return <Badge variant="secondary">そろそろ</Badge>;
  if (u === "soon") return <Badge variant="outline">注意</Badge>;
  return <Badge variant="outline">通常</Badge>;
}

// --------- Photo tags (hybrid) ----------
// confirmedTags があればそれを優先、なければ suggestedTags（または旧 tags）
function photoEffectiveTags(p) {
  const confirmed = p?.confirmedTags ?? p?.tagsConfirmed;
  if (Array.isArray(confirmed) && confirmed.length) return confirmed;
  const suggested = p?.suggestedTags ?? p?.tagsSuggested;
  if (Array.isArray(suggested) && suggested.length) return suggested;
  return Array.isArray(p?.tags) ? p.tags : [];
}

function photoHasTag(p, tag) {
  return photoEffectiveTags(p).includes(tag);
}

function TopBar({ cats, activeCatId, setActiveCatId, skinLabel: skinLabelText, SkinIcon, isPro }) {
  const active = cats.find((c) => c.id === activeCatId);
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center">
            <Cat className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-semibold leading-tight">
              {active?.name}{" "}
              <span className="text-muted-foreground text-sm font-normal">
                {active?.sex}・{active?.age}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">猫との暮らしを、気負わず続けるためのモック（AIは要約・整形だけ）</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 mr-1">
            <Badge variant={isPro ? "secondary" : "outline"}>{isPro ? "Pro" : "Free"}</Badge>
            <Badge variant="outline" className="inline-flex items-center gap-1">
              {SkinIcon ? <SkinIcon className="h-3.5 w-3.5" /> : null}
              <span>スキン：{skinLabelText}</span>
            </Badge>
          </div>
          {cats.map((c) => (
            <Button
              key={c.id}
              variant={c.id === activeCatId ? "default" : "outline"}
              size="sm"
              className="rounded-xl"
              onClick={() => setActiveCatId(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FixedRow({ icon: Icon, title, desc, ctaLeft, ctaRight }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold">{title}</div>
            <Badge variant="outline">固定</Badge>
          </div>
          <div className="text-sm text-muted-foreground mt-1">{desc}</div>
          <div className="mt-3 flex gap-2">{ctaLeft}{ctaRight}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// --------- Deadline helpers ----------
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function endOfMonth(d) {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  last.setHours(20, 0, 0, 0);
  return last;
}
function nextDueAt(item, now) {
  if (item?.dueAt) return new Date(item.dueAt);
  const n = new Date(now);

  if (item.cadence === "daily") {
    const due = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    if (item.due === "morning") due.setHours(9, 0, 0, 0);
    else if (item.due === "evening") due.setHours(20, 0, 0, 0);
    else due.setHours(23, 59, 0, 0);
    return due;
  }

  if (item.cadence === "weekly") {
    const due = new Date(n);
    const day = due.getDay();
    const add = (7 - day) % 7;
    due.setDate(due.getDate() + add);
    due.setHours(18, 0, 0, 0);
    return due;
  }

  if (item.cadence === "monthly") {
    return endOfMonth(n);
  }

  const fallback = new Date(n);
  fallback.setHours(23, 59, 0, 0);
  return fallback;
}
function bucketFor(item, now) {
  if (item.done) return "done";
  const due = nextDueAt(item, now);
  const diffMs = due.getTime() - now.getTime();

  if (diffMs < 0) return "overdue";
  if (diffMs <= 3 * 60 * 60 * 1000) return "now";
  if (sameDay(due, now)) return "today";
  if (diffMs <= 7 * 24 * 60 * 60 * 1000) return "week";
  if (diffMs <= 31 * 24 * 60 * 60 * 1000) return "month";
  return "later";
}

function isAbnormalNotice(item) {
  const v = item.value;
  if (!v) return false;
  return ["ちょっと違う", "気になる", "あり"].includes(v);
}

function priorityGroup(item) {
  // 0: 危険/異常っぽい気づき
  // 0.8: いつもの気づき
  // 1: いつものケア
  // 1.7: 気にしておくこと（あとでメモ）
  // 2: 思い出（任意）
  const source = item.source;
  const kind = item.kind;

  if (source === "notice" && kind === "notice" && isAbnormalNotice(item)) return 0;
  if (source === "notice" && kind === "notice") return 0.8;
  if (source === "task" && item.group === "MEMO") return 1.7;
  if (source === "task") return 1;
  if (source === "notice" && kind === "moment") return 2;
  return 3;
}

// --------- “AI” helpers（モック：要約/整形だけ） ----------
function aiShortWeeklyText(digest) {
  const parts = [];
  if (digest.abnormalCount > 0) parts.push(`気になる ${digest.abnormalCount}件`);
  else parts.push("気になるは特になし");

  if (digest.stockWarn.length > 0) parts.push(`補充 ${digest.stockWarn.length}件`);
  else parts.push("補充は特になし");

  if (digest.openCareTop.length > 0) parts.push(`未チェック ${digest.openCareTop.length}件`);
  else parts.push("未チェックなし");

  const hint = digest.abnormalCount > 0
    ? "不安なら無理せず病院へ。ログはそのまま見せられます。"
    : "この調子でOK。気づき3つだけでも続けば十分。";

  return `今週は ${parts.join("／")}。${hint}`;
}

function aiVetOnePager({ catName, abnormal, signals, photos }) {
  const lines = [];
  lines.push("【直近7日まとめ（病院用）】");
  lines.push(`対象：${catName}`);
  lines.push("※本資料は記録の要約です。診断は行いません。");
  lines.push("");

  lines.push("■ 気になる（ユーザー選択）");
  if (!abnormal.length) lines.push("・特になし");
  else abnormal.forEach((n) => lines.push(`・${n.title}：${n.value}`));

  lines.push("");
  lines.push("■ 体調（任意の詳細）");
  const anySignal = signals.some((s) => !!s.value);
  if (!anySignal) lines.push("・未記録");
  else signals.filter((s) => !!s.value).forEach((s) => lines.push(`・${s.label}：${s.value}`));

  lines.push("");
  lines.push("■ 関連写真（タグ）");
  if (!photos?.length) lines.push("・該当なし");
  else {
    const top = photos.slice(0, 6);
    top.forEach((p) => lines.push(`・${new Date(p.at).toLocaleString()}：${photoEffectiveTags(p).join("/")}`));
  }

  lines.push("");
  lines.push("■ メモ（質問したいこと）");
  lines.push("・（例）嘔吐の頻度が増えたときの受診目安は？");
  lines.push("・（例）食欲が△の日が続いたらどうする？");

  lines.push("");
  lines.push("不安が強い／ぐったり／水も飲めない等があれば、早めに受診を検討してください。");

  return lines.join("\n");
}

// --------- Share helpers (copy / print-to-PDF) ----------
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(String(text ?? ""));
    return true;
  } catch (e) {
    // Fallback (older browsers)
    try {
      const ta = document.createElement("textarea");
      ta.value = String(text ?? "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function openPrintWindow(title, text) {
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return;
  const safeTitle = String(title ?? "");
  const safeText = String(text ?? "");
  w.document.open();
  w.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${safeTitle}</title>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 24px; }
  h1 { font-size: 16px; margin: 0 0 12px; }
  pre { white-space: pre-wrap; font-size: 12px; line-height: 1.55; }
  .note { margin-top: 10px; font-size: 11px; color: #555; }
</style>
</head>
<body>
  <h1>${safeTitle}</h1>
  <pre>${safeText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
  <div class="note">※ブラウザの印刷からPDF保存できます。</div>
  <script>setTimeout(()=>window.print(), 50);</script>
</body>
</html>`);
  w.document.close();
}

function weeklyDigestToText(digest, aiEnabled) {
  const d = digest;
  const lines = [];
  lines.push("【週1まとめ】");
  lines.push(`期間：${d?.meta?.period ?? ""}`);
  lines.push(`配信：${d?.meta?.scheduledAt ?? ""}`);
  if (d?.meta?.invRule) lines.push(d.meta.invRule);
  if (d?.meta?.abnormalRule) lines.push(d.meta.abnormalRule);
  lines.push("");

  lines.push("■ サマリー");
  lines.push(`・気になる：${d?.abnormalCount ?? 0}件`);
  lines.push(`・補充：${(d?.stockWarn ?? []).length}件`);
  lines.push(`・未チェック（上位）：${(d?.openCareTop ?? []).length}件`);
  if (aiEnabled) {
    lines.push("");
    lines.push("■ AIで短く（要約）");
    lines.push(aiShortWeeklyText(d));
  }

  lines.push("");
  lines.push("■ 気になる（異常っぽい）");
  if ((d?.perCat ?? []).every((x) => (x.abnormal ?? []).length === 0)) {
    lines.push("・特になし");
  } else {
    (d?.perCat ?? []).filter((x) => (x.abnormal ?? []).length).forEach((x) => {
      lines.push(`・${x.cat?.name ?? ""}`);
      x.abnormal.forEach(({ def, log }) => lines.push(`  - ${def.title}：${log.value}`));
    });
  }

  lines.push("");
  lines.push("■ 補充・期限");
  if ((d?.stockWarn ?? []).length === 0) lines.push("・特になし");
  else (d.stockWarn ?? []).forEach((it) => lines.push(`・${it.label}：残り ${it.range?.[0]}〜${it.range?.[1]}日（${it.urgency}）`));

  lines.push("");
  lines.push("■ 未チェック（上位3件）");
  if ((d?.openCareTop ?? []).length === 0) lines.push("・なし");
  else (d.openCareTop ?? []).forEach((t) => lines.push(`・${t.title}：期限 ${humanDue(t.dueAt)}`));

  lines.push("");
  lines.push("■ 共有メモ（最新）");
  if ((d?.recentShared ?? []).length === 0) lines.push("・なし");
  else (d.recentShared ?? []).forEach((m) => lines.push(`・${new Date(m.at).toLocaleString()}：${m.text}`));

  lines.push("");
  lines.push("※本まとめは記録の整形です。診断は行いません。");

  return lines.join("\n");
}

function humanDue(d) {
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function buildWeeklyDigest({ cats, noticeDefs, noticeLogs, tasks, inventory, memos, photos, isPro, quietHours, weeklySummaryEnabled, invThresholds }) {
  const enabled = noticeDefs.filter((n) => n.enabled);

  const perCat = cats.map((c) => {
    const logs = noticeLogs?.[c.id] ?? {};
    const abnormal = enabled
      .filter((n) => n.kind === "notice")
      .map((n) => ({ def: n, log: logs[n.id] ?? {} }))
      .filter(({ log }) => ["ちょっと違う", "気になる", "あり"].includes(log.value));

    const moments = enabled
      .filter((n) => n.kind === "moment")
      .map((n) => ({ def: n, log: logs[n.id] ?? {} }))
      .filter(({ log }) => !!log.value);

    return { cat: c, abnormal, moments };
  });

  const now = new Date();

  // Inventory urgency computed
  const invComputed = (inventory ?? []).map((it) => ({
    ...it,
    urgency: invUrgency(it?.range?.[0] ?? 0, invThresholds),
  }));

  // Photo highlights (Pro): 今週のハイライト写真3枚（“それっぽく”）
  const highlightPhotos = (() => {
    if (!isPro) return [];
    const within7 = (d) => now.getTime() - new Date(d).getTime() <= 7 * 24 * 60 * 60 * 1000;
    const recent = (photos ?? [])
      .filter((p) => !p.archived)
      .map((p) => ({ ...p, at: new Date(p.at) }))
      .filter((p) => within7(p.at));

    const abnormalWanted = perCat.some((x) => x.abnormal.length > 0);
    const wantedTags = ["吐いた", "体調", "トイレ", "食事"];
    const pool = abnormalWanted
      ? recent.filter((p) => photoEffectiveTags(p).some((t) => wantedTags.includes(t)))
      : recent;

    const sorted = pool.sort((a, b) => b.at.getTime() - a.at.getTime());
    const out = [];
    const seen = new Set();
    for (const p of sorted) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
      if (out.length >= 3) break;
    }
    return out;
  })();

  const bucketOrder = { overdue: 0, now: 1, today: 2, week: 3, month: 4, later: 5, done: 9 };

  const openCare = tasks
    .filter((t) => !t.done && t.group !== "MEMO")
    .map((t) => ({ ...t, dueAt: nextDueAt(t, now), bucket: bucketFor(t, now) }))
    .sort((a, b) => (bucketOrder[a.bucket] ?? 6) - (bucketOrder[b.bucket] ?? 6) || a.dueAt.getTime() - b.dueAt.getTime());

  const openMemos = tasks
    .filter((t) => !t.done && t.group === "MEMO")
    .map((t) => ({ ...t, dueAt: nextDueAt(t, now), bucket: bucketFor(t, now) }))
    .slice(0, 3);

  const stockWarn = invComputed.filter((it) => it.urgency !== "ok");
  const recentShared = (memos?.items ?? []).slice(0, 2);
  const abnormalCount = perCat.reduce((acc, x) => acc + x.abnormal.length, 0);

  return {
    meta: {
      scheduledAt: "日曜 18:00",
      period: "直近7日（今日含む）",
      weeklySummaryEnabled,
      abnormalRule: `異常っぽいは即時（深夜 ${quietHours.start}:00〜${quietHours.end}:00 は朝${quietHours.end}:00 に回す）`,
      invRule: `在庫しきい値：注意 ${normalizeInvThresholds(invThresholds).soon}日 / そろそろ ${normalizeInvThresholds(invThresholds).urgent}日 / 今すぐ ${normalizeInvThresholds(invThresholds).critical}日`,
    },
    abnormalCount,
    perCat,
    stockWarn,
    openCareTop: openCare.slice(0, 3),
    openMemos,
    recentShared,
    highlightPhotos,
  };
}

function WeeklyDigestPreview({ cats, noticeDefs, noticeLogs, tasks, inventory, memos, photos, isPro, quietHours, weeklySummaryEnabled, aiEnabled, invThresholds }) {
  const digest = useMemo(
    () => buildWeeklyDigest({ cats, noticeDefs, noticeLogs, tasks, inventory, memos, photos, isPro, quietHours, weeklySummaryEnabled, invThresholds }),
    [cats, noticeDefs, noticeLogs, tasks, inventory, memos, photos, isPro, quietHours, weeklySummaryEnabled, invThresholds]
  );

  const digestText = useMemo(() => weeklyDigestToText(digest, aiEnabled), [digest, aiEnabled]);

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><Bell className="h-4 w-4" /> 週1まとめ（プレビュー）</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => copyToClipboard(digestText)}>コピー</Button>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => openPrintWindow("週1まとめ", digestText)}>印刷/PDF</Button>
            <Badge variant={digest.meta.weeklySummaryEnabled ? "secondary" : "outline"}>{digest.meta.weeklySummaryEnabled ? "通知ON" : "通知OFF"}</Badge>
            <Badge variant="outline">{digest.meta.scheduledAt}</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="rounded-2xl border p-3">
          <div className="text-sm font-semibold">通知（短文サンプル）</div>
          <div className="mt-2 text-sm">
            {digest.abnormalCount > 0 ? (
              <>今週のまとめ：<span className="font-semibold">気になる {digest.abnormalCount}件</span>／補充 {digest.stockWarn.length}件／未チェック {digest.openCareTop.length}件</>
            ) : (
              <>今週のまとめ：気になるは特になし／補充 {digest.stockWarn.length}件／未チェック {digest.openCareTop.length}件</>
            )}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">期間：{digest.meta.period}</div>
          <div className="mt-1 text-xs text-muted-foreground">{digest.meta.abnormalRule}</div>
          <div className="mt-1 text-xs text-muted-foreground">{digest.meta.invRule}</div>
          <div className="mt-1 text-xs text-muted-foreground">※「今週は静かに」は週1まとめのみOFF（異常即時はONのまま）</div>
        </div>

        <div className="rounded-2xl border p-3">
          <div className="font-medium flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><Wand2 className="h-4 w-4" /> AIで短く（要約）</span>
            <Badge variant={aiEnabled ? "secondary" : "outline"}>{aiEnabled ? "AI ON" : "AI OFF"}</Badge>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {aiEnabled ? aiShortWeeklyText(digest) : "AIがOFFです（要約は表示しません）"}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">※AIは要約・整形のみ。診断や病名推定はしません。</div>
        </div>

        <div className="rounded-2xl border p-3">
          <div className="font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> 気になる（異常っぽい）</div>
          <div className="mt-2 space-y-2">
            {digest.perCat.every((x) => x.abnormal.length === 0) ? (
              <div className="text-sm text-muted-foreground">今週は特になし（記録が少ないと出ません）</div>
            ) : (
              digest.perCat.filter((x) => x.abnormal.length).map((x) => (
                <div key={x.cat.id} className="rounded-2xl bg-muted/30 p-3">
                  <div className="text-sm font-semibold">{x.cat.name}</div>
                  <div className="mt-2 space-y-1">
                    {x.abnormal.map(({ def, log }) => (
                      <div key={def.id} className="text-sm flex items-center justify-between gap-2">
                        <span>{def.title}</span>
                        <Badge variant="destructive">{log.value}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border p-3">
          <div className="font-medium flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> 補充・期限</div>
          <div className="mt-2 space-y-2">
            {digest.stockWarn.length === 0 ? (
              <div className="text-sm text-muted-foreground">補充の注意はなし</div>
            ) : (
              digest.stockWarn.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-2">
                  <div className="text-sm flex items-center gap-2">
                    {it.label}
                    {pillForUrgency(it.urgency)}
                  </div>
                  <Badge variant="outline">残り {it.range[0]}〜{it.range[1]}日</Badge>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border p-3">
          <div className="font-medium flex items-center gap-2"><ClipboardList className="h-4 w-4" /> 未チェック（上位3件）</div>
          <div className="mt-2 space-y-2">
            {digest.openCareTop.length === 0 ? (
              <div className="text-sm text-muted-foreground">未チェックなし</div>
            ) : (
              digest.openCareTop.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2">
                  <div className="text-sm">{t.title}</div>
                  <Badge variant={t.bucket === "overdue" ? "destructive" : "outline"}>期限：{humanDue(t.dueAt)}</Badge>
                </div>
              ))
            )}

            {digest.openMemos.length ? (
              <div className="mt-3 rounded-2xl bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">気にしておくこと（あとで）</div>
                <div className="mt-2 space-y-1">
                  {digest.openMemos.map((m) => (
                    <div key={m.id} className="text-sm flex items-center justify-between gap-2">
                      <span>{m.title}</span>
                      <Badge variant="outline">期限：{humanDue(m.dueAt)}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border p-3">
          <div className="font-medium flex items-center gap-2"><Sparkles className="h-4 w-4" /> 思い出（任意）</div>
          <div className="mt-2 space-y-2">
            {digest.perCat.every((x) => x.moments.length === 0) ? (
              <div className="text-sm text-muted-foreground">今週はまだなし</div>
            ) : (
              digest.perCat.filter((x) => x.moments.length).map((x) => (
                <div key={x.cat.id} className="flex items-center justify-between gap-2">
                  <div className="text-sm">{x.cat.name}</div>
                  <Badge variant="outline">{x.moments.map((m) => m.log.value).join(" / ")}</Badge>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border p-3">
          <div className="font-medium flex items-center gap-2"><NotebookPen className="h-4 w-4" /> 共有メモ（最新2件）</div>
          <div className="mt-2 space-y-2">
            {digest.recentShared.length === 0 ? (
              <div className="text-sm text-muted-foreground">今週はまだありません</div>
            ) : (
              digest.recentShared.map((m, idx) => (
                <div key={idx} className="rounded-2xl bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">{m.at.toLocaleString()}</div>
                  <div className="mt-1 text-sm">{m.text}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --------- Checklist Home ----------
function ChecklistHome({
  activeCatId,
  tasks,
  setTasks,
  inventory,
  setInventory,
  memos,
  setMemos,
  photos,
  isPro,
  noticeDefs,
  noticeLogs,
  setNoticeLogs,
  signalDefs,
  signalLogs,
  setSignalLogs,
  engagement,
  weeklySummaryEnabled,
  setWeeklySummaryEnabled,
  setMode,
  aiEnabled,
  invThresholds,
}) {
  const today = useMemo(() => new Date(), []);
  const [showWeeklyPreview, setShowWeeklyPreview] = useState(false);

  const fixed = [
    engagement === "passive"
      ? {
          id: "fx1",
          icon: Bell,
          title: weeklySummaryEnabled ? "放置OK：週1まとめ（日曜18:00）" : "放置OK：週1まとめ（OFF）",
          desc: `週1まとめは「直近7日（今日含む）」を畳みます。異常っぽい（ちょっと違う/気になる/あり）は即時。深夜 ${QUIET_HOURS.start}:00〜${QUIET_HOURS.end}:00 は朝${QUIET_HOURS.end}:00に回します。${weeklySummaryEnabled ? "" : "（週1まとめ通知はOFF中。異常即時はON）"}`,
          left: (
            <Button size="sm" className="rounded-xl" onClick={() => setShowWeeklyPreview((v) => !v)}>
              {showWeeklyPreview ? "プレビューを閉じる" : "まとめプレビュー"}
            </Button>
          ),
          right: (
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setWeeklySummaryEnabled((v) => !v)}>
              {weeklySummaryEnabled ? "今週は静かに" : "週1まとめを戻す"}
            </Button>
          ),
        }
      : {
          id: "fx1",
          icon: Bell,
          title: "毎日ちょい見：1分でOK",
          desc: "まずは気づき3つ → あとは気分で。未チェックでも責めません。",
          left: <Button size="sm" className="rounded-xl">今からやる</Button>,
          right: <Button size="sm" variant="outline" className="rounded-xl">あとで</Button>,
        },
    {
      id: "fx2",
      icon: Users,
      title: "家族メモ未読（例）",
      desc: "『昨日ちょっと吐いたかも』が投稿されています。",
      left: <Button size="sm" className="rounded-xl">見た</Button>,
      right: <Button size="sm" variant="outline" className="rounded-xl">コメント</Button>,
    },
  ];

  const enabledNoticeDefs = useMemo(() => noticeDefs.filter((n) => n.enabled), [noticeDefs]);

  const notices = useMemo(
    () => enabledNoticeDefs.map((n) => ({ ...n, ...(noticeLogs?.[activeCatId]?.[n.id] ?? { done: false, later: false }) })),
    [enabledNoticeDefs, noticeLogs, activeCatId]
  );

  const signals = useMemo(
    () => signalDefs.map((s) => ({ ...s, ...(signalLogs?.[activeCatId]?.[s.id] ?? {}) })),
    [signalDefs, signalLogs, activeCatId]
  );

  const [quickMemo, setQuickMemo] = useState("");
  function addQuickMemo() {
    const text = quickMemo.trim();
    if (!text) return;

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 3);
    dueAt.setHours(20, 0, 0, 0);

    setTasks((prev) => [
      {
        id: `q_${Date.now()}`,
        title: text,
        group: "MEMO",
        cadence: "once",
        due: "any",
        dueAt,
        later: true,
        optional: true,
      },
      ...prev,
    ]);
    setQuickMemo("");
  }

  function markTaskDone(id) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              done: true,
              later: false,
              doneBy: "ママ",
              doneAt: new Date(),
            }
          : t
      )
    );
  }

  function markTaskLater(id) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, later: true, laterAt: new Date() } : t)));
  }

  function setSignal(id, value) {
    setSignalLogs((prev) => {
      const catMap = prev?.[activeCatId] ?? {};
      return { ...(prev ?? {}), [activeCatId]: { ...catMap, [id]: { value, at: new Date() } } };
    });
  }

  function setNotice(id, value) {
    setNoticeLogs((prev) => {
      const catMap = prev?.[activeCatId] ?? {};
      return {
        ...(prev ?? {}),
        [activeCatId]: {
          ...catMap,
          [id]: {
            ...(catMap[id] ?? {}),
            value,
            at: new Date(),
            done: true,
            later: false,
            doneBy: "ママ",
            doneAt: new Date(),
          },
        },
      };
    });
  }

  function noticeLater(id) {
    setNoticeLogs((prev) => {
      const catMap = prev?.[activeCatId] ?? {};
      const prevOne = catMap[id] ?? {};
      return { ...(prev ?? {}), [activeCatId]: { ...catMap, [id]: { ...prevOne, later: true, laterAt: new Date() } } };
    });
  }

  const fixedNotice = useMemo(() => {
    return notices.filter((n) => n.kind === "notice" && n.optional === false).slice(0, 3);
  }, [notices]);

  const seasonalNotices = useMemo(() => {
    return notices.filter((n) => n.kind === "notice" && n.seasonal).slice(0, 2);
  }, [notices]);

  const momentCard = useMemo(() => notices.find((n) => n.kind === "moment" && n.enabled), [notices]);

  const openCare = useMemo(() => {
    const now = new Date();
    const list = (tasks ?? [])
      .filter((t) => !t.done && !t.later && t.group !== "MEMO")
      .map((t) => ({ ...t, dueAt: nextDueAt(t, now), bucket: bucketFor(t, now) }));
    const bucketOrder = { overdue: 0, now: 1, today: 2, week: 3, month: 4, later: 5, done: 9 };
    list.sort((a, b) => (bucketOrder[a.bucket] ?? 6) - (bucketOrder[b.bucket] ?? 6) || a.dueAt.getTime() - b.dueAt.getTime());
    return list;
  }, [tasks]);

  const openMemos = useMemo(() => (tasks ?? []).filter((t) => !t.done && !t.later && t.group === "MEMO"), [tasks]);

  const visibleCards = useMemo(() => {
    const cards = [];
    cards.push({ type: "noticeGroup" });
    openCare.slice(0, 3).forEach((t) => cards.push({ type: "care", data: t }));
    if (momentCard) cards.push({ type: "moment", data: momentCard });
    if (cards.length < 6 && openMemos.length) cards.push({ type: "memo", data: openMemos[0] });
    const needed = 6 - cards.length;
    if (needed > 0) {
      openCare.slice(3, 3 + needed).forEach((t) => cards.push({ type: "care", data: t }));
    }
    return cards.slice(0, 6);
  }, [openCare, momentCard, openMemos]);

  const remainingCount = useMemo(() => {
    const openCareCount = (tasks ?? []).filter((t) => !t.done && !t.later && t.group !== "MEMO").length;
    const openMemoCount = (tasks ?? []).filter((t) => !t.done && !t.later && t.group === "MEMO").length;
    const openNoticeCount = notices.filter((n) => !n.done && !n.later).length;

    const shownCare = visibleCards.filter((c) => c.type === "care").length;
    const shownMemo = visibleCards.filter((c) => c.type === "memo").length;
    const shownMoment = visibleCards.filter((c) => c.type === "moment").length;

    const shownNotices = fixedNotice.length + shownMoment;

    const totalOpen = openCareCount + openMemoCount + openNoticeCount;
    const shown = shownCare + shownMemo + shownNotices;
    return Math.max(0, totalOpen - shown);
  }, [tasks, notices, visibleCards, fixedNotice.length]);

  function invAction(id, action) {
    setInventory((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        if (action === "bought") return { ...it, range: [10, 21], last: "買った" };
        if (action === "still") {
          const [a, b] = it.range;
          return { ...it, range: [Math.max(1, a + 2), b + 3], last: "まだある" };
        }
        return it;
      })
    );
  }

  const invComputed = useMemo(() => (inventory ?? []).map((it) => ({ ...it, urgency: invUrgency(it?.range?.[0] ?? 0, invThresholds) })), [inventory, invThresholds]);
  const tNorm = useMemo(() => normalizeInvThresholds(invThresholds), [invThresholds]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {fixed.map((f) => (
          <FixedRow key={f.id} icon={f.icon} title={f.title} desc={f.desc} ctaLeft={f.left} ctaRight={f.right} />
        ))}
      </div>

      {showWeeklyPreview ? (
        <WeeklyDigestPreview
          cats={sampleCats}
          noticeDefs={noticeDefs}
          noticeLogs={noticeLogs}
          tasks={tasks}
          inventory={inventory}
          memos={memos}
          photos={photos}
          isPro={isPro}
          quietHours={QUIET_HOURS}
          weeklySummaryEnabled={weeklySummaryEnabled}
          aiEnabled={aiEnabled}
          invThresholds={invThresholds}
        />
      ) : null}

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /> 今日のカード（最大6枚）</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{fmt(today)}</Badge>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setMode("cards")}>カードで消化</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {visibleCards.map((c, idx) => {
            if (c.type === "noticeGroup") {
              const seasonForDisplay = seasonalNotices[0]?.season;
              return (
                <div key={`ng_${idx}`} className="rounded-2xl border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium flex items-center gap-2"><Heart className="h-4 w-4" /> 気づき（3つ）</div>
                    <Badge variant="outline">固定</Badge>
                  </div>
                  <div className="mt-2 space-y-2">
                    {fixedNotice.map((n) => (
                      <div key={n.id} className="rounded-2xl bg-muted/30 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold leading-tight">{n.title}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {n.value
                                ? `記録：${n.value}（${new Date(n.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}）`
                                : "未記録"}
                              {isAbnormalNotice(n) ? <span className="ml-2 inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />気になる</span> : null}
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="rounded-xl text-muted-foreground" onClick={() => noticeLater(n.id)}>
                            あとで
                          </Button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {n.choices?.map((op) => (
                            <Button
                              key={op}
                              size="sm"
                              variant={n.value === op ? "default" : "outline"}
                              className="rounded-xl"
                              onClick={() => setNotice(n.id, op)}
                            >
                              {op}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {seasonalNotices.length ? (
                    <>
                      <Separator className="my-3" />
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium flex items-center gap-2"><Sparkles className="h-4 w-4" /> 季節（{seasonLabel(seasonForDisplay)}）</div>
                        <Badge variant={isPro ? "secondary" : "outline"}>{isPro ? "Pro" : "Pro"}</Badge>
                      </div>
                      <div className="mt-2 space-y-2">
                        {seasonalNotices.map((n) => (
                          <div key={n.id} className="rounded-2xl bg-muted/30 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-sm font-semibold leading-tight">
                                  {n.title}{" "}
                                  <span className="text-xs text-muted-foreground">（季節）</span>
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {n.value
                                    ? `記録：${n.value}（${new Date(n.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}）`
                                    : "未記録"}
                                  {isAbnormalNotice(n) ? <span className="ml-2 inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />気になる</span> : null}
                                </div>
                              </div>
                              <Button size="sm" variant="ghost" className="rounded-xl text-muted-foreground" onClick={() => noticeLater(n.id)}>
                                あとで
                              </Button>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {n.choices?.map((op) => (
                                <Button
                                  key={op}
                                  size="sm"
                                  variant={n.value === op ? "default" : "outline"}
                                  className="rounded-xl"
                                  onClick={() => setNotice(n.id, op)}
                                >
                                  {op}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">※固定3枚は崩さず、季節は+2枚だけ。</div>
                    </>
                  ) : null}

                  <div className="mt-2 text-xs text-muted-foreground">※通知対象は「ちょっと違う/気になる/あり」だけ。</div>
                </div>
              );
            }

            if (c.type === "care") {
              const t = c.data;
              return (
                <div key={t.id} className="rounded-2xl border p-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold leading-tight">{t.title}{t.optional ? <span className="text-xs text-muted-foreground">（任意）</span> : null}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      期限：{t.dueAt ? humanDue(t.dueAt) : "—"}
                      {t.bucket === "overdue" ? <span className="ml-2 inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />期限切れ</span> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => markTaskLater(t.id)}>あとで</Button>
                    <Button size="sm" className="rounded-xl" onClick={() => markTaskDone(t.id)}>済んだ</Button>
                  </div>
                </div>
              );
            }

            if (c.type === "moment") {
              const n = c.data;
              return (
                <div key={n.id} className="rounded-2xl border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium flex items-center gap-2"><Sparkles className="h-4 w-4" /> 思い出（任意）</div>
                    <Badge variant="outline">気分でOK</Badge>
                  </div>
                  <div className="mt-2 text-sm font-semibold">{n.title}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(n.choices ?? []).map((op) => (
                      <Button
                        key={op}
                        size="sm"
                        variant={n.value === op ? "default" : "outline"}
                        className="rounded-xl"
                        onClick={() => setNotice(n.id, op)}
                      >
                        {op}
                      </Button>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">※やらない日があってOK。暮らしの温度を保つ枠。</div>
                </div>
              );
            }

            if (c.type === "memo") {
              const m = c.data;
              return (
                <div key={m.id} className="rounded-2xl border p-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium flex items-center gap-2"><NotebookPen className="h-4 w-4" /> 気にしておくこと</div>
                    <div className="mt-1 text-sm font-semibold">{m.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">期限：{m.dueAt ? humanDue(new Date(m.dueAt)) : "—"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => markTaskLater(m.id)}>あとで</Button>
                    <Button size="sm" className="rounded-xl" onClick={() => markTaskDone(m.id)}>済んだ</Button>
                  </div>
                </div>
              );
            }

            return null;
          })}

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="text-xs text-muted-foreground">残り {remainingCount} 件（多い日はカードめくりへ）</div>
            <Button size="sm" className="rounded-xl" onClick={() => setMode("cards")}>残りをカードで消化</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><NotebookPen className="h-4 w-4" /> 1行メモ（あとで）</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xs text-muted-foreground">思いついたら1行だけ。後でカードに出ます。</div>
          <div className="mt-2 flex gap-2">
            <Input
              value={quickMemo}
              onChange={(e) => setQuickMemo(e.target.value)}
              placeholder="例）猫砂を買う／病院で聞く：嘔吐の回数／爪切り"
              className="rounded-2xl"
            />
            <Button className="rounded-xl" onClick={addQuickMemo}>積む</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> 体調（任意の詳細）</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {signals.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border p-3">
              <div>
                <div className="font-medium">{s.label}</div>
                <div className="text-xs text-muted-foreground">
                  {s.value ? `記録：${s.value}（${new Date(s.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}）` : "未記録"}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                {s.options.map((op) => (
                  <Button key={op} size="sm" variant={s.value === op ? "default" : "outline"} className="rounded-xl" onClick={() => setSignal(s.id, op)}>
                    {op}
                  </Button>
                ))}
              </div>
            </div>
          ))}
          <div className="text-xs text-muted-foreground">※診断はしません。家族に共有できる形で「残る」ことを優先。</div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> 補充のめやす（家）</span>
            <Badge variant="outline">しきい値：注意 {tNorm.soon} / そろそろ {tNorm.urgent} / 今すぐ {tNorm.critical}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {invComputed.map((it) => (
            <div key={it.id} className="flex items-start justify-between gap-3 rounded-2xl border p-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="font-medium">{it.label}</div>
                  {pillForUrgency(it.urgency)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  目安：残り {it.range[0]}〜{it.range[1]} 日っぽい {it.last ? `・前回：${it.last}` : ""}
                </div>
              </div>
              <div className="flex flex-col gap-2 min-w-[120px]">
                <Button size="sm" className="rounded-xl" onClick={() => invAction(it.id, "bought")}>買った</Button>
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => invAction(it.id, "still")}>まだある</Button>
              </div>
            </div>
          ))}
          <div className="text-xs text-muted-foreground">※まずは「買った/まだある」の2タップで精度を育てる。購入は外部ECにリンク。</div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> 共有メモ（家）</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <Textarea
            placeholder="例）右目が少し赤いかも／夜中に鳴いてた…"
            value={memos.draft}
            onChange={(e) => setMemos((p) => ({ ...p, draft: e.target.value }))}
            className="rounded-2xl"
          />
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">家族に共有（未読管理は後で実装）</div>
            <Button
              className="rounded-xl"
              onClick={() => {
                if (!memos.draft.trim()) return;
                setMemos((p) => ({ ...p, items: [{ at: new Date(), text: p.draft }, ...p.items], draft: "" }));
              }}
            >
              保存
            </Button>
          </div>
          <Separator />
          <div className="space-y-2">
            {memos.items.length === 0 ? (
              <div className="text-sm text-muted-foreground">まだありません。</div>
            ) : (
              memos.items.slice(0, 2).map((m, idx) => (
                <div key={idx} className="rounded-2xl border p-3">
                  <div className="text-xs text-muted-foreground">{m.at.toLocaleString()}</div>
                  <div className="mt-1 text-sm">{m.text}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --------- Slack-like Card Home ----------
function SlackCardHome({ activeCatId, tasks, setTasks, noticeDefs, noticeLogs, setNoticeLogs, engagement }) {
  const [view, setView] = useState("todo");
  const [cursor, setCursor] = useState(0);
  const [history, setHistory] = useState([]);
  const [quickMemo, setQuickMemo] = useState("");

  function addQuickMemo() {
    const text = quickMemo.trim();
    if (!text) return;

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 3);
    dueAt.setHours(20, 0, 0, 0);

    setTasks((prev) => [
      { id: `q_${Date.now()}`, title: text, group: "MEMO", cadence: "once", due: "any", dueAt, later: true, optional: true },
      ...prev,
    ]);

    setQuickMemo("");
    setView("later");
    setCursor(0);
    setHistory([]);
  }

  const now = useMemo(() => new Date(), []);
  const enabledNoticeDefs = useMemo(() => noticeDefs.filter((n) => n.enabled), [noticeDefs]);

  const notices = useMemo(
    () => enabledNoticeDefs.map((n) => ({ ...n, ...(noticeLogs?.[activeCatId]?.[n.id] ?? { done: false, later: false }) })),
    [enabledNoticeDefs, noticeLogs, activeCatId]
  );

  const list = useMemo(() => {
    const enriched = [
      ...tasks.map((t) => ({ ...t, source: "task", kind: t.group === "MEMO" ? "memo" : "care" })),
      ...notices.map((n) => ({ ...n, source: "notice" })),
    ].map((it) => {
      const dueAt = nextDueAt(it, now);
      const bucket = bucketFor(it, now);
      return { ...it, dueAt, bucket, later: !!it.later };
    });

    const filtered = enriched.filter((it) => {
      if (view === "done") return !!it.done;
      if (view === "later") return !it.done && !!it.later;
      return !it.done && !it.later;
    });

    const bucketOrder = { overdue: 0, now: 1, today: 2, week: 3, month: 4, later: 5, done: 9 };

    filtered.sort((a, b) => {
      const pa = priorityGroup(a);
      const pb = priorityGroup(b);
      if (pa !== pb) return pa - pb;

      const ba = bucketOrder[a.bucket] ?? 6;
      const bb = bucketOrder[b.bucket] ?? 6;
      if (ba !== bb) return ba - bb;

      return a.dueAt.getTime() - b.dueAt.getTime();
    });

    return filtered;
  }, [tasks, notices, view, now]);

  const remainingAll = useMemo(() => tasks.filter((t) => !t.done).length + notices.filter((n) => !n.done).length, [tasks, notices]);
  const remainingNow = useMemo(() => tasks.filter((t) => !t.done && !t.later).length + notices.filter((n) => !n.done && !n.later).length, [tasks, notices]);

  const current = list[Math.min(cursor, Math.max(0, list.length - 1))];

  function markDone(id, answer) {
    if (String(id).startsWith("n") || String(id).startsWith("sn_")) {
      setNoticeLogs((prev) => {
        const catMap = prev?.[activeCatId] ?? {};
        const prevOne = catMap[id] ?? {};
        return {
          ...(prev ?? {}),
          [activeCatId]: {
            ...catMap,
            [id]: {
              ...prevOne,
              done: true,
              later: false,
              value: answer ?? prevOne.value ?? "記録した",
              at: new Date(),
              doneBy: "パパ",
              doneAt: new Date(),
            },
          },
        };
      });
      return;
    }

    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: true, later: false, doneBy: "パパ", doneAt: new Date() } : t)));
  }

  function markLater(id) {
    if (String(id).startsWith("n") || String(id).startsWith("sn_")) {
      setNoticeLogs((prev) => {
        const catMap = prev?.[activeCatId] ?? {};
        const prevOne = catMap[id] ?? {};
        return { ...(prev ?? {}), [activeCatId]: { ...catMap, [id]: { ...prevOne, later: true, laterAt: new Date() } } };
      });
      return;
    }

    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, later: true, laterAt: new Date() } : t)));
  }

  function goNext() {
    setCursor((c) => Math.min(c + 1, Math.max(0, list.length - 1)));
  }

  function later() {
    if (!current) return;
    setHistory((h) => [...h, { id: current.id, prevDone: !!current.done, prevLater: !!current.later, prevValue: current.value }]);
    markLater(current.id);
    goNext();
  }

  function done() {
    if (!current) return;
    setHistory((h) => [...h, { id: current.id, prevDone: !!current.done, prevLater: !!current.later, prevValue: current.value }]);
    markDone(current.id, current.value);
    goNext();
  }

  function undo() {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));

    if (String(last.id).startsWith("n") || String(last.id).startsWith("sn_")) {
      setNoticeLogs((prev) => {
        const catMap = prev?.[activeCatId] ?? {};
        return {
          ...(prev ?? {}),
          [activeCatId]: {
            ...catMap,
            [last.id]: { ...(catMap[last.id] ?? {}), done: last.prevDone, later: last.prevLater, value: last.prevValue },
          },
        };
      });
    } else {
      setTasks((prev) => prev.map((t) => (t.id === last.id ? { ...t, done: last.prevDone, later: last.prevLater } : t)));
    }

    setCursor((c) => Math.max(0, c - 1));
  }

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  function onPointerDown(e) {
    setDragging(true);
    setDragX(0);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragging) return;
    setDragX((x) => Math.max(-160, Math.min(160, x + e.movementX)));
  }
  function onPointerUp() {
    setDragging(false);
    if (dragX <= -90) {
      setDragX(0);
      done();
      return;
    }
    if (dragX >= 90) {
      setDragX(0);
      later();
      return;
    }
    setDragX(0);
  }

  const isNotice = current?.source === "notice" && current?.kind === "notice";
  const isMoment = current?.source === "notice" && current?.kind === "moment";
  const isMemo = current?.source === "task" && current?.group === "MEMO";

  const headerBadge = view === "todo" ? "未チェック" : view === "later" ? "あとで" : "済んだ";

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">カードめくり（シンプル）</CardTitle>
            <Badge variant={engagement === "passive" ? "outline" : "secondary"}>{engagement === "passive" ? "放置OK" : "毎日ちょい見"}</Badge>
            <Badge variant="secondary">{headerBadge}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">残り 合計 {remainingAll}</Badge>
            <Badge variant="outline">残り（今） {remainingNow}</Badge>
            <Button variant="ghost" size="sm" className="rounded-xl" onClick={undo} disabled={history.length === 0}>
              元に戻す
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="rounded-xl" variant={view === "todo" ? "default" : "outline"} onClick={() => { setView("todo"); setCursor(0); setHistory([]); }}>
              未チェック
            </Button>
            <Button size="sm" className="rounded-xl" variant={view === "later" ? "default" : "outline"} onClick={() => { setView("later"); setCursor(0); setHistory([]); }}>
              あとで
            </Button>
            <Button size="sm" className="rounded-xl" variant={view === "done" ? "default" : "outline"} onClick={() => { setView("done"); setCursor(0); setHistory([]); }}>
              済んだ
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">左右スワイプ：右=あとで / 左=済んだ</div>
        </div>

        <div className="mt-3 rounded-2xl border p-3">
          <div className="text-xs text-muted-foreground">思いついたら1行 → 「あとで」に積まれます（未完了でも責めない）</div>
          <div className="mt-2 flex gap-2">
            <Input value={quickMemo} onChange={(e) => setQuickMemo(e.target.value)} placeholder="例）猫砂を買う／病院で聞くこと" className="rounded-2xl" />
            <Button className="rounded-xl" onClick={addQuickMemo}>メモを積む</Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div
          className="relative overflow-hidden rounded-2xl border"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="absolute inset-0 flex">
            <div className="flex-1 bg-muted/30 p-4 flex items-center justify-start">
              <div className="text-xs text-muted-foreground">→ あとで</div>
            </div>
            <div className="flex-1 bg-muted/30 p-4 flex items-center justify-end">
              <div className="text-xs text-muted-foreground">済んだ ←</div>
            </div>
          </div>

          <div className="relative p-4" style={{ transform: `translateX(${dragX}px)`, transition: dragging ? "none" : "transform 160ms ease" }}>
            {current ? (
              <div className="rounded-2xl bg-background border p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center">
                    {isNotice ? <Heart className="h-5 w-5" /> : isMoment ? <Sparkles className="h-5 w-5" /> : isMemo ? <NotebookPen className="h-5 w-5" /> : <Cat className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold leading-tight">{current.title}{current.optional ? <span className="text-xs text-muted-foreground">（任意）</span> : null}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          期限：{current.dueAt ? current.dueAt.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                          {current.bucket === "overdue" ? <span className="ml-2 inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />期限切れ</span> : null}
                          {isNotice && isAbnormalNotice(current) ? <span className="ml-2 inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />気になる</span> : null}
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {isNotice ? (current.seasonal ? "季節" : "気づき") : isMoment ? "思い出" : isMemo ? "メモ" : "ケア"}
                      </Badge>
                    </div>

                    {isNotice && current.choices?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {current.choices.map((op) => (
                          <Button
                            key={op}
                            size="sm"
                            variant={current.value === op ? "default" : "outline"}
                            className="rounded-xl"
                            onClick={() => {
                              setHistory((h) => [...h, { id: current.id, prevDone: !!current.done, prevLater: !!current.later, prevValue: current.value }]);
                              markDone(current.id, op);
                              goNext();
                            }}
                          >
                            {op}
                          </Button>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-3 text-xs text-muted-foreground">
                      {isNotice
                        ? "どちらか1タップでOK（記録が残ります）"
                        : isMoment
                        ? "任意：気分がのる日に"
                        : isMemo
                        ? "メモ：あとで片付けたいこと。できたら『済んだ』にするだけ。"
                        : "『あとで』は未チェックのまま後回しリストへ移動します。"}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-sm text-muted-foreground">このリストにはカードがありません。</div>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <Button variant="outline" className="rounded-xl w-full" onClick={later} disabled={!current || view === "done"}>
            あとで
          </Button>
          <Button className="rounded-xl w-full" onClick={done} disabled={!current || view === "done"}>
            {isNotice || isMoment ? "記録した" : "済んだ"}
          </Button>
        </div>

        <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
          <span>{Math.min(cursor + 1, list.length)} / {list.length}</span>
          <span>※並び：異常っぽい気づき → 気づき → ケア → 思い出</span>
        </div>
      </CardContent>
    </Card>
  );
}

function CalendarTabScreen({ weeklySummaryEnabled, setWeeklySummaryEnabled, events, setEvents, cats, activeCatId, setTasks }) {
  const now = useMemo(() => new Date(), []);

  const upcoming = useMemo(() => {
    const list = (events ?? [])
      .filter((e) => !e.archived)
      .map((e) => ({ ...e, at: new Date(e.at) }))
      .filter((e) => e.at.getTime() >= now.getTime() - 24 * 60 * 60 * 1000)
      .sort((a, b) => a.at.getTime() - b.at.getTime());
    return list.slice(0, 6);
  }, [events, now]);

  function addSampleEvent() {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(11, 0, 0, 0);
    const cat = cats.find((c) => c.id === activeCatId);
    setEvents((prev) => [
      {
        id: `e_${Date.now()}`,
        type: "vet",
        title: "通院（追加サンプル）",
        catId: activeCatId,
        at: d.toISOString(),
        location: "◯◯動物病院",
        note: "持ち物：診察券 / メモ",
      },
      ...(prev ?? []),
    ]);

    const dueAt = new Date(d);
    dueAt.setDate(dueAt.getDate() - 1);
    dueAt.setHours(20, 0, 0, 0);
    setTasks((prev) => [
      {
        id: `q_${Date.now()}_vet`,
        title: `通院：${cat?.name ?? "猫"}で聞くこと（メモ）`,
        group: "MEMO",
        cadence: "once",
        due: "any",
        dueAt,
        later: true,
        optional: true,
      },
      ...(prev ?? []),
    ]);
  }

  function eventTypeBadge(type) {
    if (type === "vet") return <Badge variant="secondary">通院</Badge>;
    if (type === "med") return <Badge variant="outline">投薬/予防</Badge>;
    return <Badge variant="outline">予定</Badge>;
  }

  function toMemo(e) {
    const cat = cats.find((c) => c.id === e.catId);
    const dueAt = new Date(e.at);
    dueAt.setDate(dueAt.getDate() - 1);
    dueAt.setHours(20, 0, 0, 0);

    setTasks((prev) => [
      {
        id: `q_${Date.now()}_ev`,
        title: `${e.title}：${cat?.name ?? "猫"}（持ち物/聞くこと）`,
        group: "MEMO",
        cadence: "once",
        due: "any",
        dueAt,
        later: true,
        optional: true,
      },
      ...(prev ?? []),
    ]);
  }

  function archiveEvent(id) {
    setEvents((prev) => (prev ?? []).map((e) => (e.id === id ? { ...e, archived: true } : e)));
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> 予定（通院・投薬）</span>
            <Button size="sm" className="rounded-xl" onClick={addSampleEvent}>予定を追加（モック）</Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {upcoming.length === 0 ? (
            <div className="text-sm text-muted-foreground">予定はまだありません。必要な人だけ使える場所（放置OK）</div>
          ) : (
            upcoming.map((e) => {
              const cat = cats.find((c) => c.id === e.catId);
              return (
                <div key={e.id} className="rounded-2xl border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground">{e.at.toLocaleString(undefined, { month: "short", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" })}</div>
                      <div className="mt-1 font-medium">{e.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {cat ? `${cat.name}・` : ""}{e.location ? `場所：${e.location}` : ""}
                      </div>
                      {e.note ? <div className="mt-1 text-xs text-muted-foreground">{e.note}</div> : null}
                    </div>
                    <div className="flex items-center gap-2">{eventTypeBadge(e.type)}</div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => toMemo(e)}>メモに積む</Button>
                    <Button size="sm" className="rounded-xl" onClick={() => archiveEvent(e.id)}>済んだ</Button>
                  </div>
                </div>
              );
            })
          )}

          <div className="text-xs text-muted-foreground pt-1">※カレンダーは「未来のイベント」専用。ケアは“今日”で十分、を守る。</div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><Bell className="h-4 w-4" /> 週1まとめ通知</span>
            <div className="flex items-center gap-2">
              <Badge variant={weeklySummaryEnabled ? "secondary" : "outline"}>{weeklySummaryEnabled ? "ON" : "OFF"}</Badge>
              <Badge variant="outline">日曜 18:00</Badge>
              <Switch checked={weeklySummaryEnabled} onCheckedChange={(v) => setWeeklySummaryEnabled(!!v)} />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground space-y-2">
          <div>直近7日（今日含む）を畳んで「気になる / 補充 / 未チェック」だけ送る。</div>
          <div>“今週は静かに” = 週1まとめのみOFF（異常っぽい即時はONのまま）。</div>
        </CardContent>
      </Card>
    </div>
  );
}

function LogScreen({ activeCatId, signalDefs, signalLogs, noticeDefs, noticeLogs, cats, photos, isPro, aiEnabled }) {
  const enabled = noticeDefs.filter((n) => n.enabled);
  const notices = enabled
    .map((n) => ({ ...n, ...(noticeLogs?.[activeCatId]?.[n.id] ?? {}) }))
    .filter((n) => n.kind !== "moment");
  const moments = enabled
    .map((n) => ({ ...n, ...(noticeLogs?.[activeCatId]?.[n.id] ?? {}) }))
    .filter((n) => n.kind === "moment");

  const signals = signalDefs.map((s) => ({ ...s, ...(signalLogs?.[activeCatId]?.[s.id] ?? {}) }));
  const cat = (cats ?? []).find((c) => c.id === activeCatId);

  const abnormal = useMemo(() => notices.filter((n) => ["ちょっと違う", "気になる", "あり"].includes(n.value)), [notices]);

  const abnormalPhotos = useMemo(() => {
    if (!isPro) return [];
    if (abnormal.length === 0) return [];

    const tags = new Set();
    for (const n of abnormal) {
      if (n.id === "n1") tags.add("食事");
      if (n.id === "n2") tags.add("トイレ");
      if (n.id === "n3") {
        tags.add("吐いた");
        tags.add("体調");
      }
    }

    const list = (photos ?? [])
      .filter((p) => !p.archived)
      .map((p) => ({ ...p, at: new Date(p.at) }))
      .filter((p) => p.catId === activeCatId)
      .filter((p) => photoEffectiveTags(p).some((t) => tags.has(t)))
      .sort((a, b) => b.at.getTime() - a.at.getTime());

    return list.slice(0, 6);
  }, [photos, abnormal, activeCatId, isPro]);

  const [vetText, setVetText] = useState("");
  function generateVetText() {
    const text = aiVetOnePager({
      catName: cat?.name ?? "猫",
      abnormal,
      signals,
      photos: abnormalPhotos,
    });
    setVetText(text);
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><Activity className="h-4 w-4" /> ログ（{cat?.name ?? "猫"}）</span>
            <Badge variant="outline">病院にも使える</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="rounded-2xl border p-3">
            <div className="font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> 気になるだけ</div>
            <div className="mt-2 space-y-2">
              {abnormal.length === 0 ? (
                <div className="text-sm text-muted-foreground">いまのところ特になし（記録が少ないと出ません）</div>
              ) : (
                abnormal.map((n) => (
                  <div key={n.id} className="flex items-center justify-between gap-2">
                    <div className="text-sm">
                      {n.title}{" "}
                      {n.seasonal ? <span className="text-xs text-muted-foreground">（季節）</span> : null}
                    </div>
                    <Badge variant="destructive">{n.value}</Badge>
                  </div>
                ))
              )}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">通知対象もここ（ちょっと違う/気になる/あり）だけ。</div>

            <div className="mt-3 rounded-2xl bg-muted/30 p-3">
              <div className="font-medium flex items-center gap-2"><ImageIcon className="h-4 w-4" /> 該当写真</div>
              {!isPro ? (
                <div className="mt-2 text-sm text-muted-foreground">Proで「気になる ↔ 写真」を紐づけて、病院にもそのまま出せます</div>
              ) : abnormalPhotos.length === 0 ? (
                <div className="mt-2 text-sm text-muted-foreground">該当する写真はまだありません</div>
              ) : (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {abnormalPhotos.map((p) => (
                    <div key={p.id} className="rounded-2xl border overflow-hidden">
                      <div className={`h-16 ${p.tone === "a" ? "bg-muted" : p.tone === "b" ? "bg-muted/60" : p.tone === "c" ? "bg-muted/40" : "bg-muted/20"}`} />
                      <div className="p-2">
                        <div className="text-[10px] text-muted-foreground">{new Date(p.at).toLocaleString()}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {photoEffectiveTags(p).slice(0, 2).map((t) => (
                            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full border bg-background">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium flex items-center gap-2"><FileText className="h-4 w-4" /> 病院用：直近7日まとめ（1枚）</div>
              <div className="flex items-center gap-2">
                <Badge variant={aiEnabled ? "secondary" : "outline"}>{aiEnabled ? "AI ON" : "AI OFF"}</Badge>
                <Badge variant={isPro ? "secondary" : "outline"}>{isPro ? "Pro" : "Proで解放"}</Badge>
              </div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">気になる／体調（任意）／該当写真を、診察で見せやすい形に整えます（診断はしません）。</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button className="rounded-xl" onClick={generateVetText} disabled={!isPro || !aiEnabled}>生成する（モック）</Button>
              <Button variant="outline" className="rounded-xl" onClick={() => copyToClipboard(vetText)} disabled={!vetText}>コピー</Button>
              <Button variant="outline" className="rounded-xl" onClick={() => openPrintWindow("病院用：直近7日まとめ", vetText)} disabled={!vetText}>印刷/PDF</Button>
            </div>
            {vetText ? (
              <pre className="mt-3 whitespace-pre-wrap text-xs rounded-2xl border bg-muted/30 p-3">{vetText}</pre>
            ) : (
              <div className="mt-3 text-xs text-muted-foreground">※MVPでは「テキスト生成」まで。PDF/共有は次フェーズ。</div>
            )}
          </div>

          <div className="rounded-2xl border p-3">
            <div className="font-medium">気づき（最新）</div>
            <div className="mt-2 space-y-2">
              {notices.map((n) => (
                <div key={n.id} className="flex items-center justify-between gap-2">
                  <div className="text-sm">
                    {n.title}
                    {n.seasonal ? <span className="ml-2 text-xs text-muted-foreground">（季節）</span> : null}
                    {n.at ? <span className="ml-2 text-xs text-muted-foreground">{new Date(n.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span> : null}
                  </div>
                  <Badge variant="outline">{n.value ?? "未記録"}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border p-3">
            <div className="font-medium">体調ログ（任意・最新）</div>
            <div className="mt-2 space-y-2">
              {signals.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2">
                  <div className="text-sm">
                    {s.label}
                    {s.at ? <span className="ml-2 text-xs text-muted-foreground">{new Date(s.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span> : null}
                  </div>
                  <Badge variant="outline">{s.value ?? "未記録"}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border p-3">
            <div className="font-medium flex items-center gap-2"><Sparkles className="h-4 w-4" /> 思い出（任意）</div>
            <div className="mt-2 space-y-2">
              {moments.every((m) => !m.value) ? (
                <div className="text-sm text-muted-foreground">まだなし</div>
              ) : (
                moments.filter((m) => !!m.value).map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2">
                    <div className="text-sm">{m.title}</div>
                    <Badge variant="outline">{m.value}</Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-muted/40 p-3 text-xs text-muted-foreground">将来：直近7日まとめ（PDF/共有）／フィルタ（食事・排泄・投薬）／家族共有</div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotesScreen({ memos, setMemos, setTasks, photos, setPhotos, cats, activeCatId, isPro, aiEnabled, photoTagAssist, setPhotoTagAssist }) {
  const [draft, setDraft] = useState(memos.draft ?? "");

  // Album (Pro)
  const tagPresets = ["食事", "トイレ", "吐いた", "遊び", "寝姿", "体調", "病院", "その他"];
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("all");
  const [selectedPhotoId, setSelectedPhotoId] = useState(null);

  function saveMemo() {
    const text = (draft ?? "").trim();
    if (!text) return;
    setMemos((p) => ({ ...p, items: [{ at: new Date(), text }, ...(p.items ?? [])], draft: "" }));
    setDraft("");
  }

  function toCard(text) {
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 3);
    dueAt.setHours(20, 0, 0, 0);

    setTasks((prev) => [
      {
        id: `q_${Date.now()}_note`,
        title: text,
        group: "MEMO",
        cadence: "once",
        due: "any",
        dueAt,
        later: true,
        optional: true,
      },
      ...(prev ?? []),
    ]);
  }

  function addMockPhoto() {
    const now = new Date();
    const catId = activeCatId;

    // 擬似：自動タグ推定（実装では画像分類/メタデータ/選択の組合せ）
    const pick = tagPresets[Math.floor(Math.random() * 5)];
    const extra = Math.random() > 0.75 ? "体調" : undefined;
    const suggestedTags = Array.from(new Set([pick, extra].filter(Boolean)));

    const id = `p_${Date.now()}`;
    setPhotos((prev) => [
      {
        id,
        at: now,
        catId,
        suggestedTags,
        confirmedTags: [],
        note: "",
        tone: ["a", "b", "c", "d"][Math.floor(Math.random() * 4)],
      },
      ...(prev ?? []),
    ]);

    if (photoTagAssist) setSelectedPhotoId(id);
  }

  function updatePhoto(id, patch) {
    setPhotos((prev) => (prev ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function toggleConfirmedTag(photo, t) {
    const cur = new Set(photo?.confirmedTags ?? []);
    if (cur.has(t)) cur.delete(t);
    else cur.add(t);
    updatePhoto(photo.id, { confirmedTags: Array.from(cur) });
  }

  function acceptSuggested(photo) {
    updatePhoto(photo.id, { confirmedTags: Array.from(new Set([...(photo.suggestedTags ?? [])])) });
  }

  function clearConfirmed(photo) {
    updatePhoto(photo.id, { confirmedTags: [] });
  }

  const filtered = useMemo(() => {
    const list = (photos ?? []).filter((p) => !p.archived);
    return list.filter((p) => {
      const catOk = !p.catId || p.catId === activeCatId;
      const tagOk = tag === "all" ? true : photoHasTag(p, tag);
      const hay = `${photoEffectiveTags(p).join(" ")} ${(p.note ?? "")}`.toLowerCase();
      const qOk = !q ? true : hay.includes(q.toLowerCase());
      return catOk && tagOk && qOk;
    });
  }, [photos, activeCatId, tag, q]);

  const cat = (cats ?? []).find((c) => c.id === activeCatId);
  const selectedPhoto = useMemo(() => (photos ?? []).find((p) => p.id === selectedPhotoId), [photos, selectedPhotoId]);

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><NotebookPen className="h-4 w-4" /> ノート（共有メモ）</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <Textarea
            placeholder="例）右目が少し赤いかも／夜中に鳴いてた…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="rounded-2xl"
          />
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">仕事化しない“連絡帳”。必要ならカードに変換できます。</div>
            <Button className="rounded-xl" onClick={saveMemo}>保存</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">メモ一覧</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {(memos.items ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground">まだありません。</div>
          ) : (
            (memos.items ?? []).map((m, idx) => (
              <div key={idx} className="rounded-2xl border p-3">
                <div className="text-xs text-muted-foreground">{new Date(m.at).toLocaleString()}</div>
                <div className="mt-1 text-sm">{m.text}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => toCard(m.text)}>カードにする（あとで）</Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> 猫アルバム（{cat?.name ?? "猫"}）</span>
            <div className="flex items-center gap-2">
              <Badge variant={aiEnabled ? "secondary" : "outline"}>{aiEnabled ? "AI ON" : "AI OFF"}</Badge>
              <Badge variant={isPro ? "secondary" : "outline"}>{isPro ? "Pro" : "Proで解放"}</Badge>
              <Button size="sm" className="rounded-xl" onClick={addMockPhoto} disabled={!isPro}>写真を追加（モック）</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="text-xs text-muted-foreground">
            写真は「保存」ではなく、<span className="font-medium">タグ → 検索 → 週報/病院用まとめ</span>につながる入力。
          </div>

          <div className="flex items-center justify-between rounded-2xl border p-3">
            <div>
              <div className="font-medium flex items-center gap-2"><Tag className="h-4 w-4" /> タグ補助（ハイブリッド）</div>
              <div className="text-xs text-muted-foreground">推定タグを出し、最後は家の人が軽く確定（任意）。</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={photoTagAssist ? "secondary" : "outline"}>{photoTagAssist ? "追加後に確認" : "確認しない"}</Badge>
              <Switch checked={photoTagAssist} onCheckedChange={(v) => setPhotoTagAssist(!!v)} disabled={!isPro} />
            </div>
          </div>

          {!isPro ? (
            <div className="rounded-2xl border p-3">
              <div className="font-medium">Proでできること</div>
              <ul className="mt-2 text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>アルバム無制限（世帯・多頭）</li>
                <li>自動タグ（推定）＋確定（ユーザー選択）</li>
                <li>タグ検索・キーワード検索</li>
                <li>病院用「直近7日まとめ」に該当写真を自動で添付</li>
              </ul>
              <div className="mt-3 flex gap-2">
                <Button className="rounded-xl">Proにする（モック）</Button>
                <Button variant="outline" className="rounded-xl">あとで</Button>
              </div>
            </div>
          ) : null}

          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="検索：吐いた／トイレ／寝姿…" className="rounded-2xl" />

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={tag === "all" ? "default" : "outline"} className="rounded-xl" onClick={() => setTag("all")}>すべて</Button>
            {tagPresets.slice(0, 5).map((t) => (
              <Button key={t} size="sm" variant={tag === t ? "default" : "outline"} className="rounded-xl" onClick={() => setTag(t)}>
                {t}
              </Button>
            ))}
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setTag("その他")}>…</Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {filtered.length === 0 ? (
              <div className="col-span-3 text-sm text-muted-foreground">写真はまだありません。</div>
            ) : (
              filtered.slice(0, 9).map((p) => {
                const effective = photoEffectiveTags(p);
                const hasConfirmed = Array.isArray(p.confirmedTags) && p.confirmedTags.length > 0;
                return (
                  <button
                    key={p.id}
                    className="rounded-2xl border overflow-hidden text-left"
                    onClick={() => setSelectedPhotoId(p.id)}
                  >
                    <div className={`h-24 ${p.tone === "a" ? "bg-muted" : p.tone === "b" ? "bg-muted/60" : p.tone === "c" ? "bg-muted/40" : "bg-muted/20"}`} />
                    <div className="p-2 space-y-1">
                      <div className="text-[10px] text-muted-foreground flex items-center justify-between gap-2">
                        <span>{new Date(p.at).toLocaleString()}</span>
                        <span className="inline-flex items-center gap-1">
                          <span className={`h-2 w-2 rounded-full ${hasConfirmed ? "bg-foreground" : "bg-muted-foreground"}`} />
                          <span>{hasConfirmed ? "確定" : "推定"}</span>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {effective.slice(0, 3).map((t) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full border bg-background">{t}</span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {selectedPhoto && isPro ? (
            <div className="rounded-2xl border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> タグを整える</div>
                <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setSelectedPhotoId(null)}>閉じる</Button>
              </div>

              <div className="mt-2 text-xs text-muted-foreground">推定をそのまま使ってもOK。必要なときだけ確定してください。</div>

              <div className="mt-3 rounded-2xl bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">推定タグ</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(selectedPhoto.suggestedTags ?? photoEffectiveTags(selectedPhoto)).map((t) => (
                    <Button
                      key={t}
                      size="sm"
                      variant={photoHasTag(selectedPhoto, t) ? "default" : "outline"}
                      className="rounded-xl"
                      onClick={() => toggleConfirmedTag(selectedPhoto, t)}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" className="rounded-xl" onClick={() => acceptSuggested(selectedPhoto)}>推定を採用（確定）</Button>
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => clearConfirmed(selectedPhoto)}>確定をクリア</Button>
                </div>
              </div>

              <div className="mt-3 rounded-2xl bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">追加タグ（任意）</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tagPresets.map((t) => (
                    <Button
                      key={t}
                      size="sm"
                      variant={(selectedPhoto.confirmedTags ?? []).includes(t) ? "default" : "outline"}
                      className="rounded-xl"
                      onClick={() => toggleConfirmedTag(selectedPhoto, t)}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <Textarea
                  value={selectedPhoto.note ?? ""}
                  onChange={(e) => updatePhoto(selectedPhoto.id, { note: e.target.value })}
                  placeholder="メモ（任意）：例）夜中に吐いた／病院前日"
                  className="rounded-2xl"
                />
              </div>

              <div className="mt-2 text-xs text-muted-foreground">※MVPの精度設計：推定（AI）＋確定（人）で、検索/週報/病院用の“外れ”を減らす。</div>
            </div>
          ) : null}

          <div className="text-xs text-muted-foreground">MVPでは推定は擬似。実装では（1）ユーザー選択（2）画像分類（3）週報生成時の推定の組合せが現実的。</div>
        </CardContent>
      </Card>
    </div>
  );
}

function MoreScreen({
  mode,
  setMode,
  notices,
  setNotices,
  engagement,
  setEngagement,
  weeklySummaryEnabled,
  setWeeklySummaryEnabled,
  aiEnabled,
  setAiEnabled,
  invThresholds,
  setInvThresholds,
  photoTagAssist,
  setPhotoTagAssist,
  isPro,
  setIsPro,
  seasonalDeckEnabled,
  setSeasonalDeckEnabled,
  seasonKey,
  skinPackOwned,
  setSkinPackOwned,
  skinMode,
  setSkinMode,
}) {
  const t = useMemo(() => normalizeInvThresholds(invThresholds), [invThresholds]);

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> その他（設定/家族/通知）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border p-3">
            <div>
              <div className="font-medium">プラン（モック）</div>
              <div className="text-xs text-muted-foreground">Proで季節デッキ/病院用まとめ/アルバム強化</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isPro ? "secondary" : "outline"}>{isPro ? "Pro" : "Free"}</Badge>
              <Switch checked={isPro} onCheckedChange={(v) => setIsPro(!!v)} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border p-3">
            <div>
              <div className="font-medium">利用スタイル</div>
              <div className="text-xs text-muted-foreground">デフォルトは「放置OK」</div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="rounded-xl" variant={engagement === "passive" ? "default" : "outline"} onClick={() => setEngagement("passive")}>
                放置OK
              </Button>
              <Button size="sm" className="rounded-xl" variant={engagement === "daily" ? "default" : "outline"} onClick={() => setEngagement("daily")}>
                毎日ちょい見
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border p-3 text-xs text-muted-foreground space-y-1">
            {engagement === "passive" ? (
              <>
                <div className="font-medium text-foreground">放置OKの方針</div>
                <div>・通知は「異常っぽい気づき」「期限」「在庫しきい値」だけ</div>
                <div>・異常っぽいは基本即時（深夜 {QUIET_HOURS.start}:00〜{QUIET_HOURS.end}:00 は朝{QUIET_HOURS.end}:00）</div>
                <div>・週1まとめで“未チェックを畳んで”回収（毎日入力しなくてOK）</div>
              </>
            ) : (
              <>
                <div className="font-medium text-foreground">毎日ちょい見の方針</div>
                <div>・固定3枚の気づきカードだけは“1分”で終わる</div>
                <div>・ケアはできる範囲でOK（未チェックでも責めない）</div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between rounded-2xl border p-3">
            <div>
              <div className="font-medium">AI（要約・整形）</div>
              <div className="text-xs text-muted-foreground">週報の短文化／病院用まとめ（Pro）に使います</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={aiEnabled ? "secondary" : "outline"}>{aiEnabled ? "ON" : "OFF"}</Badge>
              <Switch checked={aiEnabled} onCheckedChange={(v) => setAiEnabled(!!v)} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border p-3">
            <div>
              <div className="font-medium">ホーム表示</div>
              <div className="text-xs text-muted-foreground">チェックリスト型 / カードめくり型を切替</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">チェック</span>
              <Switch checked={mode === "cards"} onCheckedChange={(v) => setMode(v ? "cards" : "checklist")} />
              <span className="text-xs">カード</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border p-3">
            <div>
              <div className="font-medium flex items-center gap-2"><Timer className="h-4 w-4" /> 季節デッキ（春夏秋冬）</div>
              <div className="text-xs text-muted-foreground">固定3枚は崩さず、季節の気づきを+2枚。</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={!isPro ? "outline" : seasonalDeckEnabled ? "secondary" : "outline"}>{!isPro ? "Pro" : seasonalDeckEnabled ? "ON" : "OFF"}</Badge>
              <Badge variant="outline">{seasonLabel(seasonKey)}</Badge>
              <Switch checked={seasonalDeckEnabled} onCheckedChange={(v) => setSeasonalDeckEnabled(!!v)} disabled={!isPro} />
            </div>
          </div>

          <div className="rounded-2xl border p-3">
            <div className="font-medium flex items-center gap-2"><Sparkles className="h-4 w-4" /> スキン（見た目）</div>
            <div className="text-xs text-muted-foreground mt-1">写真共有の邪魔をしない「見た目だけ」の課金枠（モック）。</div>

            {!skinPackOwned ? (
              <div className="mt-3 rounded-2xl bg-muted/30 p-3">
                <div className="text-sm font-medium">季節スキンパック（買い切り・モック）</div>
                <div className="mt-1 text-xs text-muted-foreground">春/夏/秋/冬 ＋ 自動切替（季節に合わせて変わる）</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button className="rounded-xl" onClick={() => setSkinPackOwned(true)}>購入する</Button>
                  <Button variant="outline" className="rounded-xl" onClick={() => setSkinMode("default")}>今はいい</Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="rounded-xl" variant={skinMode === "default" ? "default" : "outline"} onClick={() => setSkinMode("default")}>デフォルト</Button>
                  <Button size="sm" className="rounded-xl" variant={skinMode === "auto" ? "default" : "outline"} onClick={() => setSkinMode("auto")}>自動（季節）</Button>
                  <Button size="sm" className="rounded-xl" variant={skinMode === "spring" ? "default" : "outline"} onClick={() => setSkinMode("spring")}>春</Button>
                  <Button size="sm" className="rounded-xl" variant={skinMode === "summer" ? "default" : "outline"} onClick={() => setSkinMode("summer")}>夏</Button>
                  <Button size="sm" className="rounded-xl" variant={skinMode === "autumn" ? "default" : "outline"} onClick={() => setSkinMode("autumn")}>秋</Button>
                  <Button size="sm" className="rounded-xl" variant={skinMode === "winter" ? "default" : "outline"} onClick={() => setSkinMode("winter")}>冬</Button>
                </div>
                <div className="text-xs text-muted-foreground">※見た目だけ。通知・記録ロジックは変えません。</div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border p-3">
            <div className="font-medium flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> 在庫しきい値（通知）</div>
            <div className="text-xs text-muted-foreground mt-1">「残り日数（下限）」がこの値を下回ったら通知や週報に出ます。</div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-2xl border p-3">
                <div className="text-xs text-muted-foreground">注意（〜）</div>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    value={t.soon}
                    onChange={(e) => setInvThresholds((p) => normalizeInvThresholds({ ...p, soon: parseInt(e.target.value || "0", 10) }))}
                    className="rounded-2xl"
                  />
                  <span className="text-xs text-muted-foreground">日</span>
                </div>
              </div>
              <div className="rounded-2xl border p-3">
                <div className="text-xs text-muted-foreground">そろそろ（〜）</div>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    value={t.urgent}
                    onChange={(e) => setInvThresholds((p) => normalizeInvThresholds({ ...p, urgent: parseInt(e.target.value || "0", 10) }))}
                    className="rounded-2xl"
                  />
                  <span className="text-xs text-muted-foreground">日</span>
                </div>
              </div>
              <div className="rounded-2xl border p-3">
                <div className="text-xs text-muted-foreground">今すぐ（〜）</div>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    value={t.critical}
                    onChange={(e) => setInvThresholds((p) => normalizeInvThresholds({ ...p, critical: parseInt(e.target.value || "0", 10) }))}
                    className="rounded-2xl"
                  />
                  <span className="text-xs text-muted-foreground">日</span>
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">※整合性は自動補正（今すぐ ≤ そろそろ ≤ 注意）。</div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border p-3">
            <div>
              <div className="font-medium flex items-center gap-2"><Tag className="h-4 w-4" /> 写真タグ補助</div>
              <div className="text-xs text-muted-foreground">追加後に「推定→確定」を軽くできるように。</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={!isPro ? "outline" : photoTagAssist ? "secondary" : "outline"}>{!isPro ? "Pro" : photoTagAssist ? "ON" : "OFF"}</Badge>
              <Switch checked={photoTagAssist} onCheckedChange={(v) => setPhotoTagAssist(!!v)} disabled={!isPro} />
            </div>
          </div>

          <div className="rounded-2xl border p-3">
            <div className="font-medium flex items-center gap-2"><Timer className="h-4 w-4" /> 気づきカード（追加）</div>
            <div className="text-xs text-muted-foreground mt-1">初期3枚に加え、慣れてきたらONにする項目です</div>
            <div className="mt-3 space-y-2">
              {notices.filter((n) => n.optional && !n.seasonal).map((n) => (
                <div key={n.id} className="flex items-center justify-between rounded-2xl border p-2">
                  <div>
                    <div className="text-sm font-medium">{n.title}</div>
                    <div className="text-xs text-muted-foreground">{n.kind === "moment" ? "思い出" : "気づき"}</div>
                  </div>
                  <Switch checked={!!n.enabled} onCheckedChange={(v) => setNotices((prev) => prev.map((x) => (x.id === n.id ? { ...x, enabled: v } : x)))} />
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> 家族</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <div>招待QR（モック）</div>
                <div className="rounded-2xl border p-2 flex items-center justify-between"><span>ママ</span><Badge variant="outline">参加中</Badge></div>
                <div className="rounded-2xl border p-2 flex items-center justify-between"><span>パパ</span><Badge variant="outline">参加中</Badge></div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4" /> 通知</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-center justify-between rounded-2xl border p-2">
                  <span>週1まとめ</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={weeklySummaryEnabled ? "secondary" : "outline"}>{weeklySummaryEnabled ? "ON" : "OFF"}</Badge>
                    <Badge variant="secondary">日曜 18:00</Badge>
                    <Switch checked={weeklySummaryEnabled} onCheckedChange={(v) => setWeeklySummaryEnabled(!!v)} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-2xl border p-2"><span>異常っぽい（即時）</span><Badge variant="outline">深夜 {QUIET_HOURS.start}:00〜{QUIET_HOURS.end}:00 は朝{QUIET_HOURS.end}:00</Badge></div>
                <div className="flex items-center justify-between rounded-2xl border p-2"><span>在庫しきい値</span><Badge variant="outline">注意 {t.soon} / そろそろ {t.urgent} / 今すぐ {t.critical}</Badge></div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Check className="h-4 w-4" /> バッジ</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">継続モチベ用途（タブには出さず、ここに格納）</CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> プラン</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <div>Pro：季節デッキ / アルバム無制限 / 自動タグ / 病院用まとめ / 共有強化</div>
                <div>スキン：買い切り（見た目だけ）</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CatCareMock() {
  const [isPro, setIsPro] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(true);

  // Seasonal deck (Pro)
  const [seasonalDeckEnabled, setSeasonalDeckEnabled] = useState(true);

  // Skin pack (one-time mock)
  const [skinPackOwned, setSkinPackOwned] = useState(false);
  const [skinMode, setSkinMode] = useState("default"); // default | auto | spring | summer | autumn | winter

  // Inventory notification thresholds
  const [invThresholds, setInvThresholds] = useState(() => normalizeInvThresholds({ soon: 7, urgent: 3, critical: 1 }));

  // Photo tagging assist: add photo -> open tag confirm UI
  const [photoTagAssist, setPhotoTagAssist] = useState(true);

  // Photo album (Pro mock)
  const [photos, setPhotos] = useState(() => {
    const now = new Date();
    const mk = (minsAgo, catId, tags, tone) => ({
      id: `p_${minsAgo}_${catId}`,
      at: new Date(now.getTime() - minsAgo * 60 * 1000),
      catId,
      // 旧データは suggested に寄せる
      suggestedTags: tags,
      confirmedTags: [],
      note: "",
      tone,
    });
    return [
      mk(60, "c1", ["寝姿"], "a"),
      mk(220, "c1", ["食事"], "b"),
      mk(480, "c2", ["遊び"], "c"),
      mk(980, "c2", ["トイレ"], "d"),
      mk(1320, "c1", ["吐いた", "体調"], "b"),
    ];
  });

  const [events, setEvents] = useState(() => {
    const d1 = new Date();
    d1.setDate(d1.getDate() + 1);
    d1.setHours(11, 0, 0, 0);

    const d2 = new Date();
    d2.setDate(d2.getDate() + 14);
    d2.setHours(9, 0, 0, 0);

    return [
      { id: "e1", type: "vet", title: "通院（例）", catId: "c1", at: d1.toISOString(), location: "◯◯動物病院", note: "持ち物：診察券 / メモ" },
      { id: "e2", type: "med", title: "予防薬（例）", catId: "c2", at: d2.toISOString(), location: "自宅", note: "ノミ・ダニ（該当する場合）" },
    ];
  });

  const [activeCatId, setActiveCatId] = useState(sampleCats[0].id);
  const [tab, setTab] = useState("today");
  const [mode, setMode] = useState("checklist");
  const [engagement, setEngagement] = useState("passive");
  const [weeklySummaryEnabled, setWeeklySummaryEnabled] = useState(true);

  // Core data
  const [tasks, setTasks] = useState(() => {
    // 少しだけ未チェックが残る初期値（“責めない”設計）
    const base = defaultTasks.map((t, idx) => ({
      ...t,
      done: idx === 0 ? true : false,
      later: false,
      doneBy: idx === 0 ? "ママ" : undefined,
      doneAt: idx === 0 ? new Date() : undefined,
    }));
    return base;
  });

  const [inventory, setInventory] = useState(() => defaultInventory.map((x) => ({ ...x, last: "まだある" })));

  const [memos, setMemos] = useState(() => ({
    draft: "",
    items: [
      { at: new Date(Date.now() - 2 * 60 * 60 * 1000), text: "（例）今朝、雨が少し早起きで鳴いてた" },
      { at: new Date(Date.now() - 26 * 60 * 60 * 1000), text: "（例）麦、食欲はいつも通り。トイレもOK" },
    ],
  }));

  const [noticeDefs, setNotices] = useState(() => defaultNoticeDefs.map((n) => ({ ...n })));
  const [noticeLogs, setNoticeLogs] = useState(() => ({
    c1: {
      n1: { value: "いつも通り", done: true, at: new Date(Date.now() - 40 * 60 * 1000), doneBy: "ママ" },
      n2: { value: "いつも通り", done: true, at: new Date(Date.now() - 38 * 60 * 1000), doneBy: "ママ" },
      n3: { value: "なし", done: true, at: new Date(Date.now() - 36 * 60 * 1000), doneBy: "ママ" },
    },
    c2: {
      n1: { value: "いつも通り", done: true, at: new Date(Date.now() - 60 * 60 * 1000), doneBy: "パパ" },
      n2: { value: "いつも通り", done: true, at: new Date(Date.now() - 58 * 60 * 1000), doneBy: "パパ" },
      n3: { value: "なし", done: true, at: new Date(Date.now() - 56 * 60 * 1000), doneBy: "パパ" },
    },
  }));

  const [signalLogs, setSignalLogs] = useState(() => ({
    c1: { s1: { value: "◎", at: new Date(Date.now() - 3 * 60 * 60 * 1000) } },
    c2: { s1: { value: "○", at: new Date(Date.now() - 5 * 60 * 60 * 1000) } },
  }));

  // Season state
  const [seasonKey, setSeasonKey] = useState(() => seasonKeyFromDate(new Date()));

  // 固定3枚は常にON
  useEffect(() => {
    setNotices((prev) =>
      prev.map((n) =>
        ["n1", "n2", "n3"].includes(n.id)
          ? { ...n, enabled: true, optional: false }
          : n
      )
    );
  }, []);

  // 季節デッキ：該当季節の2枚だけ ON（Pro && seasonalDeckEnabled のとき）
  useEffect(() => {
    setNotices((prev) =>
      prev.map((n) => {
        if (!n.seasonal) return n;
        const should = !!isPro && !!seasonalDeckEnabled && n.season === seasonKey;
        // 季節以外の設定に影響しないため、季節カードのみ強制
        return { ...n, enabled: should };
      })
    );
  }, [isPro, seasonalDeckEnabled, seasonKey]);

  // 季節は1時間に一度だけ更新（跨いだときの自動切替）
  useEffect(() => {
    const id = setInterval(() => setSeasonKey(seasonKeyFromDate(new Date())), 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const effectiveSkinKey = useMemo(() => {
    if (!skinPackOwned) return "default";
    if (skinMode === "auto") return seasonKey;
    if (["spring", "summer", "autumn", "winter"].includes(skinMode)) return skinMode;
    return "default";
  }, [skinPackOwned, skinMode, seasonKey]);

  const skin = useMemo(() => skinMeta(effectiveSkinKey), [effectiveSkinKey]);
  const SkinIcon = skin?.Icon;

  const tabItems = [
    { id: "today", label: "今日", Icon: ClipboardList },
    { id: "calendar", label: "予定", Icon: CalendarDays },
    { id: "log", label: "ログ", Icon: Activity },
    { id: "notes", label: "ノート", Icon: NotebookPen },
    { id: "more", label: "その他", Icon: Settings },
  ];

  return (
    <div className={`min-h-screen ${skin?.bg ?? ""} pb-24`}>
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
        <TopBar
          cats={sampleCats}
          activeCatId={activeCatId}
          setActiveCatId={setActiveCatId}
          skinLabel={skin?.label ?? "デフォルト"}
          SkinIcon={SkinIcon}
          isPro={isPro}
        />

        {/* Tabs (desktop) */}
        <Card className="rounded-2xl shadow-sm hidden md:block">
          <CardContent className="p-3 flex flex-wrap gap-2">
            {tabItems.map(({ id, label, Icon }) => (
              <Button
                key={id}
                variant={tab === id ? "default" : "outline"}
                className="rounded-xl"
                onClick={() => setTab(id)}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
              </Button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <Badge variant={engagement === "passive" ? "outline" : "secondary"}>
                {engagement === "passive" ? "放置OK" : "毎日ちょい見"}
              </Badge>
              <Badge variant={aiEnabled ? "secondary" : "outline"}>AI {aiEnabled ? "ON" : "OFF"}</Badge>
              <Badge variant="outline">季節：{seasonLabel(seasonKey)}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Screens */}
        {tab === "today" ? (
          mode === "checklist" ? (
            <ChecklistHome
              activeCatId={activeCatId}
              tasks={tasks}
              setTasks={setTasks}
              inventory={inventory}
              setInventory={setInventory}
              memos={memos}
              setMemos={setMemos}
              photos={photos}
              isPro={isPro}
              noticeDefs={noticeDefs}
              noticeLogs={noticeLogs}
              setNoticeLogs={setNoticeLogs}
              signalDefs={defaultSignalDefs}
              signalLogs={signalLogs}
              setSignalLogs={setSignalLogs}
              engagement={engagement}
              weeklySummaryEnabled={weeklySummaryEnabled}
              setWeeklySummaryEnabled={setWeeklySummaryEnabled}
              setMode={setMode}
              aiEnabled={aiEnabled}
              invThresholds={invThresholds}
            />
          ) : (
            <SlackCardHome
              activeCatId={activeCatId}
              tasks={tasks}
              setTasks={setTasks}
              noticeDefs={noticeDefs}
              noticeLogs={noticeLogs}
              setNoticeLogs={setNoticeLogs}
              engagement={engagement}
            />
          )
        ) : null}

        {tab === "calendar" ? (
          <CalendarTabScreen
            weeklySummaryEnabled={weeklySummaryEnabled}
            setWeeklySummaryEnabled={setWeeklySummaryEnabled}
            events={events}
            setEvents={setEvents}
            cats={sampleCats}
            activeCatId={activeCatId}
            setTasks={setTasks}
          />
        ) : null}

        {tab === "log" ? (
          <LogScreen
            activeCatId={activeCatId}
            signalDefs={defaultSignalDefs}
            signalLogs={signalLogs}
            noticeDefs={noticeDefs}
            noticeLogs={noticeLogs}
            cats={sampleCats}
            photos={photos}
            isPro={isPro}
            aiEnabled={aiEnabled}
          />
        ) : null}

        {tab === "notes" ? (
          <NotesScreen
            memos={memos}
            setMemos={setMemos}
            setTasks={setTasks}
            photos={photos}
            setPhotos={setPhotos}
            cats={sampleCats}
            activeCatId={activeCatId}
            isPro={isPro}
            aiEnabled={aiEnabled}
            photoTagAssist={photoTagAssist}
            setPhotoTagAssist={setPhotoTagAssist}
          />
        ) : null}

        {tab === "more" ? (
          <MoreScreen
            mode={mode}
            setMode={setMode}
            notices={noticeDefs}
            setNotices={setNotices}
            engagement={engagement}
            setEngagement={setEngagement}
            weeklySummaryEnabled={weeklySummaryEnabled}
            setWeeklySummaryEnabled={setWeeklySummaryEnabled}
            aiEnabled={aiEnabled}
            setAiEnabled={setAiEnabled}
            invThresholds={invThresholds}
            setInvThresholds={setInvThresholds}
            photoTagAssist={photoTagAssist}
            setPhotoTagAssist={setPhotoTagAssist}
            isPro={isPro}
            setIsPro={setIsPro}
            seasonalDeckEnabled={seasonalDeckEnabled}
            setSeasonalDeckEnabled={setSeasonalDeckEnabled}
            seasonKey={seasonKey}
            skinPackOwned={skinPackOwned}
            setSkinPackOwned={setSkinPackOwned}
            skinMode={skinMode}
            setSkinMode={setSkinMode}
          />
        ) : null}
      </div>

      {/* Bottom nav (mobile) */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur border-t md:hidden">
        <div className="max-w-5xl mx-auto px-3 py-2 grid grid-cols-5 gap-1">
          {tabItems.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-2xl px-2 py-2 flex flex-col items-center justify-center gap-1 text-xs ${
                tab === id ? "bg-muted" : "hover:bg-muted/60"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px]">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
