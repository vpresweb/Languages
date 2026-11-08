-- Таблица прогресса пользователей приложения «Языки».
-- Выполнить один раз: Supabase → SQL Editor → New query → вставить → Run.
create table if not exists public.user_data (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Каждый пользователь видит и меняет только свои строки.
alter table public.user_data enable row level security;

drop policy if exists "own rows: select" on public.user_data;
drop policy if exists "own rows: insert" on public.user_data;
drop policy if exists "own rows: update" on public.user_data;
drop policy if exists "own rows: delete" on public.user_data;

create policy "own rows: select" on public.user_data for select to authenticated using (auth.uid() = user_id);
create policy "own rows: insert" on public.user_data for insert to authenticated with check (auth.uid() = user_id);
create policy "own rows: update" on public.user_data for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows: delete" on public.user_data for delete to authenticated using (auth.uid() = user_id);
