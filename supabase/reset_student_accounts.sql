-- Run this in the Supabase SQL Editor when you want to reset demo student accounts.
-- It preserves the configured teacher account and removes all other Auth users.

delete from public.program_ratings
where lower(student_email) <> lower('John.ssmith2745@gmail.com');

delete from public.program_applications
where lower(student_email) <> lower('John.ssmith2745@gmail.com');

delete from auth.users
where lower(email) <> lower('John.ssmith2745@gmail.com');
