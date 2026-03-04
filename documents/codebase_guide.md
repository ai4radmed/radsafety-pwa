# 프로젝트 개발자 가이드 (Codebase Guide)

이 문서는 RadSafety-PWA의 기술적 설계 구조와 각 모듈의 명확한 역할을 정의합니다. 신규 기능 구현 및 유지보수 시 아키텍처의 일관성을 유지하기 위한 전문 기술 레퍼런스입니다.

---

## 1. 프로젝트 전체 파일 지도 (File Map)

### 1-1. 루트 및 구성 (Config & Infrastructure)

| 파일                | 기술적 역할              | 상세 설명                                                    |
| :------------------ | :----------------------- | :----------------------------------------------------------- |
| `package.json`      | 의존성 및 스크립트 정의  | Node.js 환경의 패키지 관리 및 빌드 파이프라인(Scripts) 정의. |
| `astro.config.mjs`  | 프레임워크 런타임 설정   | SSR 어댑터, PWA 매니페스트, 개발 도구 및 빌드 최적화 설정.   |
| `tsconfig.json`     | TypeScript 컴파일러 설정 | 정적 타입 검사 규칙 및 모듈 해석 방식 정의.                  |
| `eslint.config.mjs` | 정적 분석 컨벤션         | 에이전트와 개발자 간의 일관된 코드 품질 및 스타일 강제.      |
| `ARCHITECTURE.md`   | 시스템 맵 및 진입점      | 명세 계층(Level 1-3) 및 워크플로우를 정의하는 통합 지침서.   |

### 1-2. 페이지 레이어 (`src/pages/`)

Astro의 파일 시스템 기반 라우팅이 적용되며, 모든 페이지는 SSR(`prerender=false`) 모드로 동작합니다.

| 경로                                | URL                            | 기술적 역할                                                                                |
| :---------------------------------- | :----------------------------- | :----------------------------------------------------------------------------------------- |
| `index.astro`                       | `/`                            | 퍼블릭 랜딩 페이지.                                                                        |
| `login.astro`                       | `/login`                       | 인증 엔드포인트 및 로그인 인터페이스.                                                      |
| `mypage.astro`                      | `/mypage`                      | 개인 프로필 및 학회원 인증 상태 관리.                                                      |
| `resources.astro`                   | `/resources`                   | 방사선안전 기술 자료실.                                                                    |
| `findings-recommendations.astro`    | `/findings-recommendations`    | 지적/권고사례 데이터 시각화 및 검색.                                                       |
| `inspection-prep.astro`             | `/inspection-prep`             | 규제 수검 준비용 콘텐츠 컬렉션.                                                            |
| `admin/verification-requests.astro` | `/admin/verification-requests` | **인증관리**: 전 가입자의 인증 상태(관리자인증/임시인증/미인증 등) 및 관리 권한 통제 센터. |
| `admin/members.astro`               | `/admin/members`               | 회원명부 관리: 자동 인증 대조용 학회원 데이터를 엑셀 등으로 일괄 등록.                     |
| `admin/feedback.astro`              | `/admin/feedback`              | 의견 관리: 사용자가 전송한 의견 및 지적사항 검토 및 처리 상황 관리.                        |
| `admin/`                            | `/admin/*`                     | 시스템 알림 발송, 관리자 설정 등 관리 업무 전용 구역.                                      |
| `api/`                              | `/api/*`                       | 웹 푸시 구독 및 데이터 아카이브를 위한 RESTful API 엔드포인트.                             |
| `auth/`                             | `/auth/*`                      | OAuth 콜백 및 이메일 매직링크 검증 핸들러.                                                 |

### 1-3. 아키텍처 핵심 부품 (`src/components/`, `src/layouts/`)

| 파일                               | 기술적 역할          | 상세 설계 의도                                                                                                                                     |
| :--------------------------------- | :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layouts/DashboardLayout.astro`    | 공통 애플리케이션 쉘 | **ClientRouter** 탑재 및 공통 UI(Sidebar, Nav 등) 조립. 핵심 인증 및 데이터 동기화 로직은 `auth-handler.ts`로 위임하여 인터페이스와 로직을 분리함. |
| `components/BaseHead.astro`        | 메타 및 SEO 엔진     | HTML `<head>` 섹션 제어, 폰트/스타일 주입 및 검색 엔진 최적화.                                                                                     |
| `components/Sidebar.astro`         | 데스크톱 내비게이션  | 서비스의 주요 기능으로 바로 이동하기 위한 사이드 바 제어.                                                                                          |
| `components/MobileBottomNav.astro` | 모바일 내비게이션    | 현장 사용성을 고려한 최하단 Floating UI 메뉴.                                                                                                      |
| `components/GlossaryModal.astro`   | 전역 오버레이 도구   | 모든 페이지에서 호출 가능한 전문 용어 사전 팝업.                                                                                                   |
| `components/PWAInstall.astro`      | 앱 설치 유도 로직    | 브라우저의 `beforeinstallprompt` 이벤트를 감지하여 설치 제안.                                                                                      |

### 1-4. 데이터 및 인프라 레이어 (`src/lib/`, `src/actions/`, `src/store/`)

| 파일                      | 기술적 역할              | 상세 설계 의도                                                                                                      |
| :------------------------ | :----------------------- | :------------------------------------------------------------------------------------------------------------------ |
| `actions/index.ts`        | 서버 비즈니스 로직 (RPC) | `astro:actions`를 사용한 DB 트랜잭션 및 보안 검증 통제 센터.                                                        |
| `lib/supabase-server.ts`  | 서버 환경 DB 클라이언트  | Service Role을 사용한 RLS 우회 처리 (서버 사이드 전용).                                                             |
| `lib/supabase-browser.ts` | 브라우저 환경 인증 객체  | 클라이언트측 세션 유지 및 실시간 이벤트 구독 전용.                                                                  |
| `lib/email.ts`            | SMTP 인터페이스          | Resend API를 활용한 알림 및 인증 메일 발송 서비스.                                                                  |
| `lib/push.ts`             | 웹 푸시 프로토콜 제어    | VAPID 키 기반의 푸시 페이로드 구성 및 전송 핸들러.                                                                  |
| `lib/auth-handler.ts`     | 클라이언트 인증 핸들러   | 세션 상태 감시, 프로필 동기화, 알림 체크 및 권한 기반 리다이렉션을 처리하는 클라이언트 사이드 비즈니스 로직의 핵심. |
| `store/user.ts`           | 전역 상태 관리           | **Nanostores**를 활용하여 페이지 전환 간 사용자 세션 정보 유지.                                                     |

---

## 2. 주요 설계 원칙 및 메커니즘

### 2-1. ClientRouter와 페이지 생명주기

본 프로젝트는 **ClientRouter**를 사용하여 깜빡임 없는 전환을 제공합니다. 이에 따라 일반적인 `DOMContentLoaded` 대신 `astro:page-load` 이벤트를 통해 클라이언트 스크립트를 재초기화해야 합니다.

### 2-2. 보안 및 리다이렉션 (Auth Guard)

`auth-handler.ts`에서 `publicPaths`에 포함되지 않은 모든 페이지 접근을 감시하며, 인증(Session)이 없는 사용자를 `/login`으로 강제 리다이렉트하여 애플리케이션 보안을 유지합니다.

### 2-3. 데이터 자가 치유 (Self-healing)

로그인 세션은 있으나 데이터베이스 프로필이 누락된 특수 상황 발생 시, `auth-handler.ts`의 로직을 통해 기본 프로필을 자동 생성(Insert)하여 서비스 중단 없이 정상화하는 메커니즘을 포함합니다.

### 2-4. 인증 및 권한 관리 (Verification Logic)

- **인증 상태**: `none`(미인증), `temp_verified`(임시인증/신청), `verified`(관리자 확정), `list`(명부 대조 자동인증) 등으로 구분됩니다.
- **포괄적 관리**: '인증관리' 메뉴에서는 인증을 신청한 사용자뿐만 아니라, 단순히 가입만 완료한 모든 `none` 상태의 사용자를 목록에 노출하여 관리자가 전체 가입자 현황을 파악할 수 있도록 설계되었습니다.
