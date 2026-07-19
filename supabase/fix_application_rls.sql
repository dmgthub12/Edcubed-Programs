-- Run this in the Supabase SQL Editor if applying shows:
-- "new row violates row-level security policy ... program_applications"

drop policy if exists "students can view own applications" on public.program_applications;
drop policy if exists "students can apply to programs" on public.program_applications;
drop policy if exists "students can update own applications" on public.program_applications;
drop policy if exists "teacher can view all applications" on public.program_applications;

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
