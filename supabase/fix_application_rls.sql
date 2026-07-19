-- Run this in the Supabase SQL Editor if applying or approving shows a row-level security error.

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

create policy "students can view own applications"
on public.program_applications
for select
using (auth.uid() = student_id);

create policy "students can apply to programs"
on public.program_applications
for insert
with check (auth.uid() = student_id);

create policy "students can update own applications"
on public.program_applications
for update
using (auth.uid() = student_id)
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
