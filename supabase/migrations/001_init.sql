create extension if not exists pgcrypto;

create table if not exists public.job_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  company text,
  url text,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  job_post_id uuid,
  title text not null,
  source_text text not null,
  optimized_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.job_posts enable row level security;
alter table public.resumes enable row level security;

grant select on public.job_posts to anon;
grant select on public.resumes to anon;

grant all privileges on public.job_posts to authenticated;
grant all privileges on public.resumes to authenticated;

drop policy if exists job_posts_read_own on public.job_posts;
create policy job_posts_read_own
on public.job_posts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists job_posts_write_own on public.job_posts;
create policy job_posts_write_own
on public.job_posts
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists resumes_read_own on public.resumes;
create policy resumes_read_own
on public.resumes
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists resumes_write_own on public.resumes;
create policy resumes_write_own
on public.resumes
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
