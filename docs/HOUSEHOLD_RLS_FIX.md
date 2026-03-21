# Household RLS Fix

新規 signup 後に household 作成が `42501 new row violates row-level security policy for table "households"` で失敗する場合の修正です。

## 症状

- signup 自体は成功する
- `public.users` に row も作成される
- しかし onboarding の最初の `insert into households` が RLS で拒否される

## 原因

`households` テーブルに `INSERT` 用 policy が無い、または過去の RLS 整理で削除されている可能性があります。

アプリの onboarding は以下の流れです。

1. `households` に insert
2. `users.household_id` を update / upsert
3. `cats` を insert

このため、最初の `households` insert が通らないと onboarding 全体が止まります。

## SQL Editor で実行する SQL

```sql
alter table public.households enable row level security;

drop policy if exists "Users can create households" on public.households;
drop policy if exists "Authenticated users can create households" on public.households;

create policy "Users can create households"
on public.households
for insert
to authenticated
with check (true);
```

## 確認クエリ

```sql
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'households';
```

期待される状態:

- `Users can create households`
- `cmd = INSERT`

## 次の確認

この SQL 実行後に、もう一度 signup 後の onboarding を試してください。  
通れば、そのまま写真 import の E2E に進めます。
