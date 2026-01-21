/**
 * 猫目線テキスト変換ユーティリティ
 * ユーザー入力のテキストを猫っぽい表現に変換する
 */

// 語尾パターン
const CAT_ENDINGS = ['にゃ', 'にゃ〜', 'にゃん', 'だにゃ', 'してにゃ'];

// キーワードマッピング（人間目線 → 猫目線）
const KEYWORD_MAP: [RegExp, string][] = [
    [/病院|動物病院|獣医/, '病院連れてって'],
    [/電話する|連絡する/, 'お願いして'],
    [/買う|購入|買い物/, '買ってきて'],
    [/掃除する|掃除/, 'きれいにして'],
    [/洗う/, 'ピカピカにして'],
    [/予約/, '予約して'],
    [/チェック|確認/, 'みてみて'],
    [/作る|準備/, '用意して'],
];

// 動詞変換（〜する → 〜して）
const VERB_TRANSFORMS: [RegExp, string][] = [
    [/をとる$/, 'とって'],
    [/をする$/, 'して'],
    [/する$/, 'して'],
    [/をあげる$/, 'ちょうだい'],
    [/をもらう$/, 'ちょうだい'],
];

/**
 * ユーザー入力テキストを猫目線に変換
 */
export function toCatPerspective(input: string): string {
    if (!input || input.length === 0) return input;

    let result = input;

    // 1. キーワード変換
    for (const [pattern, replacement] of KEYWORD_MAP) {
        if (pattern.test(result)) {
            result = result.replace(pattern, replacement);
            break; // 最初のマッチのみ
        }
    }

    // 2. 動詞変換
    for (const [pattern, replacement] of VERB_TRANSFORMS) {
        if (pattern.test(result)) {
            result = result.replace(pattern, replacement);
            break;
        }
    }

    // 3. 既に猫語尾がついている場合はそのまま
    if (CAT_ENDINGS.some(e => result.endsWith(e))) {
        return result;
    }

    // 4. 語尾追加（日付ベースでランダム感を出す）
    const endingIndex = new Date().getDate() % CAT_ENDINGS.length;
    const ending = CAT_ENDINGS[endingIndex];

    // 5. 「〜て」で終わる場合は「〜てにゃ」に
    if (result.endsWith('て')) {
        return result + 'にゃ';
    }

    // 6. 「〜だ」「〜よ」で終わる場合は置換
    if (result.endsWith('だ') || result.endsWith('よ')) {
        return result.slice(0, -1) + ending;
    }

    // 7. その他は語尾追加
    return result + ending;
}
