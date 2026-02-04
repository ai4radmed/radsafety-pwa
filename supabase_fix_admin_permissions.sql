-- 1. profiles 테이블에 해당 유저가 존재하는지 확인하고, 없으면 생성 (auth.users 참조)
insert into public.profiles (id, email, full_name, role)
select id, email, raw_user_meta_data->>'full_name', 'admin'
from auth.users
where email = 'kimbi.kirams@gmail.com'
on conflict (id) do nothing;

-- 2. 해당 유저의 권한을 'admin'으로 강제 업데이트
update public.profiles
set role = 'admin'
where email = 'kimbi.kirams@gmail.com';

-- 3. 확인: 결과가 나오면 성공입니다.
select * from public.profiles where email = 'kimbi.kirams@gmail.com';
