import { Cat, NoticeDef, NoticeLog, Task, InventoryItem, AppSettings } from "@/types";

export function buildWeeklyDigest({
    cats, noticeDefs, noticeLogs, tasks, inventory, settings
}: {
    cats: Cat[];
    noticeDefs: NoticeDef[];
    noticeLogs: Record<string, Record<string, NoticeLog>>;
    tasks: Task[];
    inventory: InventoryItem[];
    settings: AppSettings;
}) {
    const abnormal = Object.values(noticeLogs).flatMap(catLogs =>
        Object.values(catLogs).filter(l => l.value !== "いつも通り" && l.value !== "なし" && l.value !== "記録した")
    );

    const lowStock = inventory.filter(it => (it.range_min ?? it.range?.[0] ?? 999) <= settings.invThresholds.soon);
    const openTasks = tasks.filter(t => !t.done);

    return {
        meta: {
            scheduledAt: "日曜 18:00",
            period: "直近7日",
            invRule: `しきい値：${settings.invThresholds.soon}日 / ${settings.invThresholds.urgent}日 / ${settings.invThresholds.critical}日`,
        },
        abnormalCount: abnormal.length,
        lowStockCount: lowStock.length,
        openTasksCount: openTasks.length,
    };
}

export function aiVetOnePager({
    catName, abnormal
}: {
    catName: string;
    abnormal: NoticeLog[];
}) {
    const lines = [
        `【直近7日まとめ（病院用） - ${catName}】`,
        "※本資料はアプリ記録の要約です。診断ではありません。",
        "",
        "■ 気になる変化",
        abnormal.length > 0
            ? abnormal.map(l => `- ${new Date(l.at).toLocaleDateString()}: ${l.value}`).join("\n")
            : "- 特になし",
        "",
        "■ 獣医師への質問（自由記入）",
        "・",
        "",
        "不安が強い場合は早めに受診してください。"
    ];
    return lines.join("\n");
}

