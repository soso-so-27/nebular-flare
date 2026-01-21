-- =====================================================
-- 追加のおねがい (Ad-hoc Tasks) テーブル
-- 2026-01-21
-- =====================================================

-- 1. adhoc_tasks テーブルを作成
CREATE TABLE IF NOT EXISTS adhoc_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    done BOOLEAN DEFAULT FALSE,
    done_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. RLS ポリシー
ALTER TABLE adhoc_tasks ENABLE ROW LEVEL SECURITY;

-- householdメンバーのみ閲覧可能
CREATE POLICY "adhoc_tasks_select" ON adhoc_tasks
    FOR SELECT USING (
        household_id IN (
            SELECT household_id FROM users WHERE id = auth.uid()
        )
    );

-- householdメンバーのみ挿入可能
CREATE POLICY "adhoc_tasks_insert" ON adhoc_tasks
    FOR INSERT WITH CHECK (
        household_id IN (
            SELECT household_id FROM users WHERE id = auth.uid()
        )
    );

-- householdメンバーのみ更新可能
CREATE POLICY "adhoc_tasks_update" ON adhoc_tasks
    FOR UPDATE USING (
        household_id IN (
            SELECT household_id FROM users WHERE id = auth.uid()
        )
    );

-- householdメンバーのみ削除可能
CREATE POLICY "adhoc_tasks_delete" ON adhoc_tasks
    FOR DELETE USING (
        household_id IN (
            SELECT household_id FROM users WHERE id = auth.uid()
        )
    );

-- 3. インデックス（クエリ高速化）
CREATE INDEX IF NOT EXISTS idx_adhoc_tasks_household ON adhoc_tasks(household_id);
CREATE INDEX IF NOT EXISTS idx_adhoc_tasks_created_at ON adhoc_tasks(created_at DESC);
