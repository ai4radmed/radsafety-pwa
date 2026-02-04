-- 1. profiles 테이블에서 kimbi@kirams.re.kr 유저 확인 및 생성
insert into public.profiles (id, email, full_name, role)
select id, email, raw_user_meta_data->>'full_name', 'admin'
from auth.users
where email = 'kimbi@kirams.re.kr'
on conflict (id) do nothing;

-- 2. 권한을 'admin'으로 업데이트
update public.profiles
set role = 'admin'
where email = 'kimbi@kirams.re.kr';

-- 3. 확인
select * from public.profiles where email = 'kimbi@kirams.re.kr';
