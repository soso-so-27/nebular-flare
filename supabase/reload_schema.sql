-- Supabase (PostgREST) のAPIキャッシュを強制的にリロードします
-- 新しい関数が見つからない(404)場合や、引数が古いまま認識されている(400)場合に有効です

NOTIFY pgrst, 'reload config';

SELECT 'Schema cache reloaded' as status;
