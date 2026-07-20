-- Run this in Supabase SQL Editor before using the live Vercel app.
-- Teacher email for this demo: John.ssmith2745@gmail.com

create table if not exists public.program_applications (
  id uuid primary key default gen_random_uuid(),
  program_id text not null check (program_id in ('resume', 'essays')),
  student_id uuid not null references auth.users(id) on delete cascade,
  student_email text not null,
  student_name text,
  approved boolean not null default false,
  approved_at timestamptz,
  status text not null default 'under_review' check (status in ('under_review', 'approved', 'waitlisted', 'not_accepted')),
  teacher_notes text,
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

create table if not exists public.program_meeting_info (
  program_id text primary key check (program_id in ('resume', 'essays')),
  meet_url text,
  meet_code text,
  homework text,
  updated_at timestamptz not null default now()
);

alter table public.program_applications enable row level security;
alter table public.program_ratings enable row level security;
alter table public.program_meeting_info enable row level security;

alter table public.program_applications
add column if not exists student_name text;

alter table public.program_applications
add column if not exists approved boolean not null default false;

alter table public.program_applications
add column if not exists approved_at timestamptz;

alter table public.program_applications
add column if not exists status text not null default 'under_review';

alter table public.program_applications
add column if not exists teacher_notes text;

update public.program_applications
set status = case when approved then 'approved' else 'under_review' end
where status is null;

alter table public.program_applications
drop constraint if exists program_applications_status_check;

alter table public.program_applications
add constraint program_applications_status_check
check (status in ('under_review', 'approved', 'waitlisted', 'not_accepted'));

drop policy if exists "students can view own applications" on public.program_applications;
drop policy if exists "students can apply to programs" on public.program_applications;
drop policy if exists "students can update own applications" on public.program_applications;
drop policy if exists "teacher can approve applications" on public.program_applications;
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

create policy "teacher can approve applications"
on public.program_applications
for update
using (lower(auth.jwt() ->> 'email') = lower('John.ssmith2745@gmail.com'))
with check (lower(auth.jwt() ->> 'email') = lower('John.ssmith2745@gmail.com'));

drop policy if exists "approved students can view meeting info" on public.program_meeting_info;
drop policy if exists "teacher can view meeting info" on public.program_meeting_info;
drop policy if exists "teacher can insert meeting info" on public.program_meeting_info;
drop policy if exists "teacher can update meeting info" on public.program_meeting_info;

create policy "approved students can view meeting info"
on public.program_meeting_info
for select
using (
  exists (
    select 1
    from public.program_applications application
    where application.program_id = program_meeting_info.program_id
      and application.student_id = auth.uid()
      and (application.approved = true or application.status = 'approved')
  )
);

create policy "teacher can view meeting info"
on public.program_meeting_info
for select
using (lower(auth.jwt() ->> 'email') = lower('John.ssmith2745@gmail.com'));

create policy "teacher can insert meeting info"
on public.program_meeting_info
for insert
with check (lower(auth.jwt() ->> 'email') = lower('John.ssmith2745@gmail.com'));

create policy "teacher can update meeting info"
on public.program_meeting_info
for update
using (lower(auth.jwt() ->> 'email') = lower('John.ssmith2745@gmail.com'))
with check (lower(auth.jwt() ->> 'email') = lower('John.ssmith2745@gmail.com'));

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
