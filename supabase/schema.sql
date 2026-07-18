-- Run this in Supabase SQL Editor before using the live Vercel app.
-- Teacher email for this demo: John.ssmith2745@gmail.com

create table if not exists public.program_applications (
  id uuid primary key default gen_random_uuid(),
  program_id text not null check (program_id in ('resume', 'essays')),
  student_id uuid not null references auth.users(id) on delete cascade,
  student_email text not null,
  created_at timestamptz not null default now(),
  unique (program_id, student_id)
);

create table if not exists public.program_ratings (
  id uuid primary key default gen_random_uuid(),
  program_id text not null check (program_id in ('resume', 'essays')),
  student_id uuid not null references auth.users(id) on delete cascade,
  student_email text not null,
  rating integer not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, student_id)
);

alter table public.program_applications enable row level security;
alter table public.program_ratings enable row level security;

drop policy if exists "students can view own applications" on public.program_applications;
drop policy if exists "students can apply to programs" on public.program_applications;
drop policy if exists "teacher can view all applications" on public.program_applications;

create policy "students can view own applications"
on public.program_applications
for select
using (auth.uid() = student_id);

create policy "students can apply to programs"
on public.program_applications
for insert
with check (auth.uid() = student_id);

create policy "teacher can view all applications"
on public.program_applications
for select
using (lower(auth.jwt() ->> 'email') = lower('John.ssmith2745@gmail.com'));

drop policy if exists "students can view own ratings" on public.program_ratings;
drop policy if exists "students can rate programs" on public.program_ratings;
drop policy if exists "students can update own ratings" on public.program_ratings;
drop policy if exists "teacher can view all ratings" on public.program_ratings;

create policy "students can view own ratings"
on public.program_ratings
for select
using (auth.uid() = student_id);

create policy "students can rate programs"
on public.program_ratings
for insert
with check (auth.uid() = student_id);

create policy "students can update own ratings"
on public.program_ratings
for update
using (auth.uid() = student_id)
with check (auth.uid() = student_id);

create policy "teacher can view all ratings"
on public.program_ratings
for select
using (lower(auth.jwt() ->> 'email') = lower('John.ssmith2745@gmail.com'));
