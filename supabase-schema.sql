-- Glow Skincare App — Supabase Schema
-- Run this in the Supabase SQL Editor (supabase.com/dashboard > SQL Editor)

-- 1. Products
create table products (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brand text not null default '',
  category text not null default 'serum',
  description text not null default '',
  routine_time text not null default 'both',
  frequency text not null default 'Daily',
  status text not null default 'have',
  is_active boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table products enable row level security;
create policy "Users manage own products" on products
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index idx_products_user on products(user_id);

-- 2. Daily logs
create table daily_logs (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  am_completed boolean not null default false,
  pm_completed boolean not null default false,
  am_products text[] not null default '{}',
  pm_products text[] not null default '{}',
  skin_feeling smallint not null default 3,
  skin_conditions text[] not null default '{}',
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique(user_id, date)
);

alter table daily_logs enable row level security;
create policy "Users manage own logs" on daily_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index idx_daily_logs_user_date on daily_logs(user_id, date);

-- 3. Routine days
create table routine_days (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_number smallint not null,
  name text not null,
  am_products text[] not null default '{}',
  pm_products text[] not null default '{}',
  -- New: step-based representation. Each entry is
  -- { id, category, name?, productIds: text[] }
  am_steps jsonb not null default '[]'::jsonb,
  pm_steps jsonb not null default '[]'::jsonb
);

-- Migration for existing tables (idempotent — safe to run on a fresh schema):
alter table routine_days
  add column if not exists am_steps jsonb not null default '[]'::jsonb,
  add column if not exists pm_steps jsonb not null default '[]'::jsonb;

alter table routine_days enable row level security;
create policy "Users manage own routines" on routine_days
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index idx_routine_days_user on routine_days(user_id);

-- 4. User settings
create table user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cycle_length smallint not null default 4,
  created_at timestamptz not null default now()
);

alter table user_settings enable row level security;
create policy "Users manage own settings" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. Face photos
create table if not exists face_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  uploaded_at timestamptz not null default now()
);

alter table face_photos enable row level security;
create policy "Users manage own face photos" on face_photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_face_photos_user on face_photos(user_id);

-- 6. Storage bucket + policies for face-photos
-- Create the bucket (id must match the bucket name used in code)
insert into storage.buckets (id, name, public)
values ('face-photos', 'face-photos', true)
on conflict (id) do nothing;

-- Allow each user to manage objects under their own folder: <user_id>/...
create policy "Users upload own face photos"
  on storage.objects for insert
  with check (
    bucket_id = 'face-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users read own face photos"
  on storage.objects for select
  using (
    bucket_id = 'face-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update own face photos"
  on storage.objects for update
  using (
    bucket_id = 'face-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own face photos"
  on storage.objects for delete
  using (
    bucket_id = 'face-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
