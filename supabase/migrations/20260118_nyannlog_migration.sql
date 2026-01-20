-- =====================================================
-- ニャンログ マイグレーション
-- 「とどける」と「そうだん」を統合
-- =====================================================

-- 1. incidents テーブルの type 制約を更新
-- 古いタイプを新しいタグに変換
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_type_check;

-- 既存データを新タグに変換
UPDATE incidents SET type = 'worried' WHERE type IN ('vomit', 'diarrhea', 'injury');
UPDATE incidents SET type = 'concerned' WHERE type IN ('appetite', 'energy', 'toilet');
UPDATE incidents SET type = 'daily' WHERE type = 'other' OR type IS NULL;

-- 新しい制約を追加
ALTER TABLE incidents ADD CONSTRAINT incidents_type_check 
    CHECK (type IN ('daily', 'worried', 'concerned', 'troubled', 'good'));

-- 2. incidents テーブルの status 制約を更新
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_status_check;

-- 既存データを新ステータスに変換
UPDATE incidents SET status = 'log' WHERE status = 'active';
UPDATE incidents SET status = 'tracking' WHERE status = 'monitoring';
UPDATE incidents SET status = 'log' WHERE status = 'watching';

-- 新しい制約を追加
ALTER TABLE incidents ADD CONSTRAINT incidents_status_check 
    CHECK (status IN ('log', 'tracking', 'resolved'));

-- 3. cat_images に source カラムを追加（ニャンログ経由の写真を区別）
ALTER TABLE cat_images ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';
-- source: 'direct' = 旧とどける, 'nyannlog' = ニャンログ経由, 'care' = お世話記録から

-- 4. cat_images に nyannlog_tag カラムを追加（タグでフィルタリング可能に）
ALTER TABLE cat_images ADD COLUMN IF NOT EXISTS nyannlog_tag TEXT;
-- タグ: 'daily', 'worried', 'concerned', 'troubled', 'good'

-- 5. cat_footprints の action_type 制約を更新
ALTER TABLE cat_footprints DROP CONSTRAINT IF EXISTS cat_footprints_action_type_check;
ALTER TABLE cat_footprints ADD CONSTRAINT cat_footprints_action_type_check 
    CHECK (action_type IN ('login', 'care', 'observation', 'nyannlog', 'photo', 'incident', 'exchange'));
-- photo と incident は後方互換性のために残す

-- 6. incidents に archived_at カラムを追加（30日アーカイブ用）
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- 7. 30日経過した log を自動アーカイブするための関数
CREATE OR REPLACE FUNCTION archive_old_nyannlogs()
RETURNS void AS $$
BEGIN
    UPDATE incidents 
    SET archived_at = NOW()
    WHERE status = 'log' 
      AND archived_at IS NULL 
      AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 8. インデックス追加
CREATE INDEX IF NOT EXISTS idx_incidents_archived_at ON incidents(archived_at);
CREATE INDEX IF NOT EXISTS idx_cat_images_source ON cat_images(source);
CREATE INDEX IF NOT EXISTS idx_cat_images_nyannlog_tag ON cat_images(nyannlog_tag);

-- =====================================================
-- 実行確認
-- =====================================================
-- SELECT type, status, COUNT(*) FROM incidents GROUP BY type, status;
