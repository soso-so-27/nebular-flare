# V2 Migration Guide

`supabase/migrations/20260310223500_nyaruhd_v2_schema.sql` を Supabase Dashboard の SQL Editor で安全に適用するための手順書です。

## 適用前の確認事項

- 本番環境ではなく、まず開発環境またはステージング環境で実行してください。
- 念のため Supabase の Backups / PITR が有効か確認してください。
- 現在の live DB には `photos` 系の v2 テーブルが未存在であることを確認済みです。
- この SQL は新規テーブル作成が中心で、既存テーブルの `DROP TABLE` や既存データ破壊を伴う `ALTER COLUMN` は含みません。
- `household_id` と `cat_id` は論理上の関連であり、この migration では `households` / `cats` への外部キー制約は張られません。
- 既に一部だけ手動実行している場合、元 migration の `CREATE POLICY` は再実行で失敗しやすいため、この手順書の修正版 SQL を使ってください。

## 実行する SQL

以下を Supabase Dashboard の SQL Editor にそのまま貼り付けて実行します。

```sql
begin;

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  source text default 'camera_roll',
  taken_at timestamptz,
  imported_at timestamptz default now(),
  storage_path text not null,
  thumbnail_path text,
  width int,
  height int,
  favorite boolean default false,
  deleted_at timestamptz null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists photo_cat_links (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid references photos(id) on delete cascade,
  cat_id uuid not null,
  confidence numeric(5,4),
  is_primary boolean default false,
  created_at timestamptz default now()
);

create table if not exists photo_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid references photos(id) on delete cascade,
  status text default 'queued',
  attempt_count int default 0,
  requested_at timestamptz default now(),
  started_at timestamptz null,
  finished_at timestamptz null,
  error_message text null,
  model_name text null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists photo_analysis_results (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid unique references photos(id) on delete cascade,
  raw_json jsonb,
  pose_tags jsonb default '[]'::jsonb,
  action_tags jsonb default '[]'::jsonb,
  place_tags jsonb default '[]'::jsonb,
  mood_tags jsonb default '[]'::jsonb,
  object_tags jsonb default '[]'::jsonb,
  scene_summary text,
  quality_score numeric(5,4),
  confidence numeric(5,4),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists collection_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text,
  category text,
  description text,
  level_thresholds jsonb,
  is_active boolean default true,
  sort_order int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists collection_rules (
  id uuid primary key default gen_random_uuid(),
  collection_definition_id uuid references collection_definitions(id) on delete cascade,
  rule_json jsonb,
  priority int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists cat_collection_items (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null,
  collection_definition_id uuid references collection_definitions(id) on delete cascade,
  photo_count int default 0,
  latest_photo_id uuid references photos(id) on delete set null,
  first_detected_at timestamptz,
  last_detected_at timestamptz,
  current_level int default 0,
  score numeric(8,2) default 0,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(cat_id, collection_definition_id)
);

create table if not exists cat_collection_photos (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null,
  collection_definition_id uuid references collection_definitions(id) on delete cascade,
  photo_id uuid references photos(id) on delete cascade,
  confidence numeric(5,4),
  created_at timestamptz default now(),
  unique(cat_id, collection_definition_id, photo_id)
);

create table if not exists discoveries (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null,
  type text,
  collection_definition_id uuid references collection_definitions(id) on delete cascade,
  title text,
  body text,
  photo_id uuid references photos(id) on delete set null,
  payload jsonb,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table photos enable row level security;
alter table photo_cat_links enable row level security;
alter table photo_analysis_jobs enable row level security;
alter table photo_analysis_results enable row level security;
alter table collection_definitions enable row level security;
alter table collection_rules enable row level security;
alter table cat_collection_items enable row level security;
alter table cat_collection_photos enable row level security;
alter table discoveries enable row level security;

drop policy if exists "Enable all for authenticated users" on photos;
drop policy if exists "Enable all for authenticated users" on photo_cat_links;
drop policy if exists "Enable all for authenticated users" on photo_analysis_jobs;
drop policy if exists "Enable all for authenticated users" on photo_analysis_results;
drop policy if exists "Enable all for authenticated users" on collection_definitions;
drop policy if exists "Enable all for authenticated users" on collection_rules;
drop policy if exists "Enable all for authenticated users" on cat_collection_items;
drop policy if exists "Enable all for authenticated users" on cat_collection_photos;
drop policy if exists "Enable all for authenticated users" on discoveries;

create policy "Enable all for authenticated users" on photos
  for all to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on photo_cat_links
  for all to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on photo_analysis_jobs
  for all to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on photo_analysis_results
  for all to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on collection_definitions
  for all to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on collection_rules
  for all to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on cat_collection_items
  for all to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on cat_collection_photos
  for all to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on discoveries
  for all to authenticated using (true) with check (true);

commit;
```

## 適用後の確認方法

### 1. テーブル存在確認

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'photos',
    'photo_cat_links',
    'photo_analysis_jobs',
    'photo_analysis_results',
    'collection_definitions',
    'collection_rules',
    'cat_collection_items',
    'cat_collection_photos',
    'discoveries'
  )
order by table_name;
```

### 2. RLS 有効化確認

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'photos',
    'photo_cat_links',
    'photo_analysis_jobs',
    'photo_analysis_results',
    'collection_definitions',
    'collection_rules',
    'cat_collection_items',
    'cat_collection_photos',
    'discoveries'
  )
order by tablename;
```

### 3. ポリシー確認

```sql
select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in (
    'photos',
    'photo_cat_links',
    'photo_analysis_jobs',
    'photo_analysis_results',
    'collection_definitions',
    'collection_rules',
    'cat_collection_items',
    'cat_collection_photos',
    'discoveries'
  )
order by tablename, policyname;
```

### 4. 最小動作確認

```sql
select count(*) from photos;
select count(*) from photo_analysis_jobs;
select count(*) from collection_definitions;
select count(*) from cat_collection_items;
select count(*) from discoveries;
```

## ロールバック手順

問題が起きた場合は、依存関係の子テーブルから順に削除します。必要なら実行前に `begin;` を付けてください。

```sql
drop table if exists discoveries;
drop table if exists cat_collection_photos;
drop table if exists cat_collection_items;
drop table if exists collection_rules;
drop table if exists photo_analysis_results;
drop table if exists photo_analysis_jobs;
drop table if exists photo_cat_links;
drop table if exists collection_definitions;
drop table if exists photos;
```

## 補足

- この migration は `cats`, `cat_images`, `households` を直接変更しません。
- ただしアプリ側コードは v2 パイプラインを前提にし始めているため、適用後は `api/photos/import` → `api/ai-worker` → `api/collection/aggregate` の順で疎通確認するのが安全です。
- `collection_rules` はテーブルだけ作られ、初期データは入りません。現段階ではアプリ側で `ZUKAN_AXES` へのフォールバックを残す前提です。
