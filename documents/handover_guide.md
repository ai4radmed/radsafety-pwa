# 프로젝트 인수인계 및 기술 유지보수 가이드

이 문서는 `radsafety-pwa` 프로젝트의 핵심 로직과 데이터 흐름을 파악하여, 개발자가 혼자서도 안정적으로 유지보수할 수 있도록 돕기 위해 작성되었습니다.

## 1. 프로젝트 아키텍처 개요
- **Frontend**: Astro (PWA 적용). 정적 페이지 생성을 기본으로 하되, 필요한 부분에서 클라이언트 사이드 JS로 인터랙티브 기능을 구현합니다.
- **Backend/DB**: Supabase (PostgreSQL + Auth). 별도의 서버 구축 없이 API 호출로 데이터를 처리합니다.
- **State Management**: Nano Stores (`src/store/user.ts`). 클라이언트 사이드에서 공유되어야 하는 사용자 정보를 관리합니다.

## 2. 데이터 흐름 (Data Flow)

### 2.1 사용자 인증 및 프로필 (`src/layouts/DashboardLayout.astro`)
- 모든 페이지의 기본 레이아웃인 `DashboardLayout`에서 Supabase 세션을 체크합니다.
- 사용자가 로그인되어 있으면 `profiles` 테이블에서 정보를 가져와 `userProfile` 스토어에 저장합니다.
- 이 정보는 `mypage` 등 다른 페이지에서 구독(`subscribe`)하여 실시간으로 화면을 갱신하는 데 사용됩니다.

### 2.2 비즈니스 로직 처리 (`src/actions/index.ts`)
- `astro:actions`를 사용하여 서버 사이드 로직을 정의합니다.
- **예: 사례 저장 (`saveFinding`)**
  1. 클라이언트에서 폼 데이터를 Action으로 전송.
  2. 서버(Astro)에서 Supabase 클라이언트를 사용해 DB에 Insert/Update.
  3. 처리 결과를 클라이언트에 반환.

## 3. 페이지별 핵심 로직 분석

### 3.1 지적권고사례 (`src/pages/findings-recommendations.astro`)
- **데이터 병합**: `src/content/findings_recommendations/`의 정적 Markdown 파일과 Supabase DB의 동적 데이터를 합쳐서 보여줍니다.
- **필터링 & 정렬**: 클라이언트 사이드 JS에서 태그, 연도, 검색어를 기준으로 `const filteredFindings` 배열을 동적으로 생성하여 렌더링합니다.
- **CRUD**: '사례 등록/수정/삭제' 기능이 구현되어 있으며, 이는 `src/actions/index.ts`의 Action들과 연동됩니다.

### 3.2 마이페이지 (`src/pages/mypage.astro`)
- **인증 요청**: 사용자가 학회원 인증을 요청하면 세 가지 방식(자동 명부 대조, 관리자 수동 요청, 특별사용자 요청)으로 처리됩니다.
- **실시간 UI**: `userProfile.subscribe`를 통해 DB 데이터 변경 시 새로고침 없이 프로필 정보(이름, 이메일, 인증 상태 등)가 반영됩니다.

## 4. 유지보수 가이드 (How-to)

### 4.1 새로운 DB 테이블 연동하기
1. Supabase 대시보드에서 테이블을 생성합니다.
2. `src/lib/supabase.ts`의 클라이언트를 사용하여 접근합니다.
3. 복잡한 쓰기 로직은 `src/actions/index.ts`에 새로운 Action을 정의하여 구현합니다.

### 4.2 페이지 추가하기
1. `src/pages/` 밑에 `.astro` 파일을 생성합니다.
2. `DashboardLayout`을 임포트하여 기본 구조를 잡습니다.
3. 필요한 스타일과 스크립트는 해당 파일 내 `<style>` 및 `<script>` 태그에 작성합니다 (캡슐화 권장).

### 4.3 PWA 설정 변경하기
- `astro.config.mjs`의 `vite-pwa` 설정을 수정합니다. 아이콘이나 앱 이름 등은 `public/` 폴더의 매니페스트 관련 파일들을 확인하세요.

---
*Last Updated: 2026-02-13*
