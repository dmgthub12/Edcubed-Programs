-- Run this in the Supabase SQL Editor if applying, approving, or saving notes shows a row-level security error.

drop policy if exists "students can view own applications" on public.program_applications;
drop policy if exists "students can apply to programs" on public.program_applications;
drop policy if exists "students can update own applications" on public.program_applications;
drop policy if exists "teacher can approve applications" on public.program_applications;
drop policy if exists "teacher can view all applications" on public.program_applications;

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
