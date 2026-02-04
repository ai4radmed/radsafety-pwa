-- Add verification columns to profiles table
alter table public.profiles 
add column if not exists affiliation text,
add column if not exists society text,
add column if not exists verified_at timestamp with time zone,
add column if not exists is_verified boolean default false,
add column if not exists society_email text;
