# Auth Signup Fix

Supabase Auth の `Database error saving new user` に対する修正用 SQL です。

## 原因

`public.handle_new_user()` が `public.users` に対して以下の列で `insert` しています。

```sql
insert into public.users (id, display_name, email, created_at)
```

一方、現在のコードベース上の `public.users` 定義には `email` 列がありません。  
そのため `auth.users` への signup 時に trigger が失敗し、`unexpected_failure` になっている可能性が高いです。

## SQL Editor で実行する SQL

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, display_name, created_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    now()
  )
  on conflict (id) do update
  set display_name = excluded.display_name;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

## 実行後の確認

1. アプリから新規 signup を再実行
2. `public.users` に row が作成されるか確認
3. その後に login して E2E を再開
