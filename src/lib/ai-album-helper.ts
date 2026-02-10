export interface LogItem {
    type: 'incident' | 'care';
    content: string;
    date: Date;
}

export function generateWeeklyCaption(logs: LogItem[]): string {
    if (logs.length === 0) return "静かで穏やかな、日常の幸せを感じる一週間でした。";

    const keywords = logs.flatMap(log => {
        const text = log.content.toLowerCase();
        const found: string[] = [];

        // Positive/Bonding
        if (text.includes("甘え") || text.includes("ゴロゴロ")) found.push("bonding");
        if (text.includes("遊び") || text.includes("元気") || text.includes("走り")) found.push("active");
        if (text.includes("初めて") || text.includes("できた")) found.push("milestone");

        // Daily/Peaceful
        if (text.includes("のんびり") || text.includes("寝て")) found.push("calm");
        if (text.includes("ごはん") || text.includes("完食")) found.push("food");

        // Care/Health (positive spin)
        if (text.includes("病院") || text.includes("検査")) found.push("care");

        return found;
    });

    const uniqueKeys = Array.from(new Set(keywords));

    // Logic for "Moving" (Emo) sentences
    if (uniqueKeys.includes("milestone")) {
        return "新しい「できた」に出会えた、忘れられない特別な一週間になりました。";
    }

    if (uniqueKeys.includes("bonding") && uniqueKeys.includes("calm")) {
        return "ただ隣にいてくれるだけで心が解けるような、温かい絆を感じる数日間でした。";
    }

    if (uniqueKeys.includes("active")) {
        return "元気いっぱいの姿に、家族みんながパワーをもらったパワフルな一週間でした！";
    }

    if (uniqueKeys.includes("care")) {
        return "大切な家族だからこそ、一歩ずつ一緒に歩んでいこうと思えた大切な時間でした。";
    }

    if (uniqueKeys.includes("food")) {
        return "美味しそうに食べるその横顔に、当たり前の幸せを再確認した穏やかな日々でした。";
    }

    return "何気ない日常の断片が、かけがえのない宝物だと気づかせてくれた一週間でした。";
}
