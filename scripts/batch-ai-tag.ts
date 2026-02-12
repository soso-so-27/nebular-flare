/**
 * 既存写真のAI一括タグ付けスクリプト
 * 
 * Usage: npx tsx scripts/batch-ai-tag.ts <user_email> <user_password>
 * 
 * タグが空または未設定の写真を取得し、analyze-cat-image Edge Functionを呼び出す。
 * OpenAI APIのレート制限を避けるため、1枚ずつ3秒間隔で処理する。
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zfuuzgazbdzyclwnqkqm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmdXV6Z2F6YmR6eWNsd25xa3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODA1NTEsImV4cCI6MjA4MjA1NjU1MX0.FfCPBQTBwb0IQyif1OsYzN3jsvtZk-F4_oKfJPDnvbQ";

async function main() {
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
        console.log("Usage: npx tsx scripts/batch-ai-tag.ts <email> <password>");
        console.log("Example: npx tsx scripts/batch-ai-tag.ts user@example.com mypassword");
        return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ログイン
    console.log(`🔑 ${email} でログイン中...\n`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
        console.error("❌ ログイン失敗:", authError.message);
        return;
    }
    console.log(`✅ ログイン成功: ${authData.user?.id}\n`);

    // household_id を取得
    const { data: member } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", authData.user!.id)
        .single();

    if (!member) {
        console.error("❌ 世帯情報が見つかりません");
        return;
    }

    const householdId = member.household_id;
    console.log(`🏠 世帯ID: ${householdId}\n`);

    // get_unified_gallery で全写真取得
    const { data: photos, error: galleryError } = await supabase.rpc("get_unified_gallery", {
        target_household_id: householdId,
        limit_count: 500,
        offset_count: 0,
    });

    if (galleryError) {
        console.error("❌ 写真取得エラー:", galleryError.message);
        return;
    }

    // タグなしの profile 写真のみ (care/observation は対象外)
    const untagged = (photos as any[]).filter((img: any) => {
        if (img.source !== "profile") return false;
        if (!img.tags) return true;
        if (Array.isArray(img.tags) && img.tags.length === 0) return true;
        return false;
    });

    console.log(`📷 全写真: ${photos.length}枚`);
    console.log(`🏷️  タグ済み: ${photos.length - untagged.length}枚`);
    console.log(`⏳ タグなし(profile): ${untagged.length}枚\n`);

    if (untagged.length === 0) {
        console.log("✅ すべての写真にタグが付いています！");
        return;
    }

    console.log(`🚀 ${untagged.length}枚のAIタグ付けを開始します...\n`);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < untagged.length; i++) {
        const img = untagged[i];

        // storage_path → public URL
        const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/cat-images/${img.url}`;

        console.log(`[${i + 1}/${untagged.length}] ${img.id.substring(0, 8)}...`);

        try {
            const { data, error } = await supabase.functions.invoke("analyze-cat-image", {
                body: { imageId: img.id, imageUrl },
            });

            if (error) {
                console.log(`  ❌ 失敗: ${error.message}`);
                failed++;
            } else {
                console.log(`  ✅ タグ: ${data?.tags?.join(", ") || "不明"}`);
                success++;
            }
        } catch (e: any) {
            console.log(`  ❌ エラー: ${e.message}`);
            failed++;
        }

        // レート制限回避: 3秒待機
        if (i < untagged.length - 1) {
            await new Promise(r => setTimeout(r, 3000));
        }
    }

    console.log(`\n${"─".repeat(40)}`);
    console.log(`✅ 成功: ${success}枚`);
    console.log(`❌ 失敗: ${failed}枚`);
    console.log(`📊 合計: ${untagged.length}枚`);
}

main().catch(console.error);
