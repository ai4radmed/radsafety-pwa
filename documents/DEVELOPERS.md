# RadSafety-PWA

이 프로젝트는 **방사선 안전 관리 정보공유**를 위한 시스템을 **Astro(SSR)와 Supabase** 기반으로 구축한 PWA(Progressive Web App) 입니다. 오프라인 상태에서도 작동하며 빠른 속도를 제공하도록 설계되었습니다.

---

## AI Software Development Life Cycle (AI-SDLC)

본 프로젝트는 기획 단계부터 배포까지 AI 에이전트와의 적극적인 협업을 통해 높은 품질과 생산성을 보장하는 **AI-Native Spec-Driven Development** 워크플로우를 채택하고 있습니다. 명세(`.spec/`)를 중심으로 구현과 검증이 순환하는 자동화된 파이프라인 개발 경험을 제공합니다.

### 개발 워크플로우 및 검증 루프

```mermaid
graph TD
    classDef ai fill:#f3e5f5,stroke:#ce93d8,stroke-width:2px,color:#4a148c;
    classDef cursor fill:#e8f5e9,stroke:#81c784,stroke-width:2px,color:#1b5e20;
    classDef ci fill:#e3f2fd,stroke:#90caf9,stroke-width:2px,color:#0d47a1;
    classDef state fill:#fff3e0,stroke:#ffb74d,stroke-width:2px,color:#e65100;

    A([시작: 사용자 기획 프롬프트 주입]):::state --> B[Level 1: 아키텍처 설계 & 시스템 지도 생성]:::ai
    B --> C[Level 2: .spec/ 파일 기반 상세 명세 작성]:::ai

    C --> D{Cursor IDE: 명세 파일 기반 수정 및 완성}:::cursor
    D --> E[Level 3: Astro/TypeScript 구현체 생성]:::cursor
    E --> F[테스트 명세 및 Vitest 코드 생성]:::cursor
    F --> G{로컬 Pre-commit 검증 통과?}:::cursor

    G -- No --> D
    G -- Yes --> H[GitHub Actions CI 자동 검증 파이프라인]:::ci

    H --> I[Lint 및 전체 테스트 실행]:::ci
    I --> J{CI 검증 통과?}:::ci

    J -- No --> D
    J -- Yes --> K[AI Spec-Driven Reviewer Gemini 교차검증]:::ai

    K --> L{명세-구현 완전 일치 확인?}:::ai
    L -- No --> D
    L -- Yes --> M([최종 배포 및 운영]):::state
```

1.  **AI 기획 및 설계 (AI Planning)**: [AGENTS.md](AGENTS.md)를 통해 시스템 지도를 먼저 정의하고, 모든 구현체 전에 `.spec/` 디렉토리에 명세를 먼저 작성합니다.
2.  **명세 주도 개발 (Spec-Driven with Cursor)**: 작성된 명세 파일을 Cursor IDE에 전달하여 사용자와 AI가 명세의 디테일을 완성합니다. 완성된 명세를 바탕으로 1:1로 매칭되는 실행 파일을 생성한 뒤, Vitest를 위한 테스트 명세 및 실제 테스트 코드를 작성합니다. 테스트를 통과해야만 명세에 대한 구현 파일이 올바르게 만들어진 것으로 간주합니다.
3.  **CI 검증 & AI 교차 리뷰 (CI & AI Review)**: 모든 실행 파일 개발이 완료되어 GitHub에 코드가 푸시되면, CI 파이프라인에서 Lint 및 전체 테스트가 진행됩니다. 모든 CI 테스트를 통과하면 마지막으로 **AI Spec-Driven Reviewer(Gemini)** 동작을 통해 명세와 실행 파일이 애초의 계획과 의도대로 정확히 작성되었는지 교차 검증을 수행합니다.

---

## 핵심 기능 및 설계 철학

### 📱 PWA (Progressive Web App) 도입의 장점

별도의 앱 스토어 설치 과정 없이, 웹의 접근성과 앱의 사용자 경험을 동시에 제공합니다.

- **오프라인 폴백 (Offline Strategy)**: 의료 현장의 통신 음영 지역에서도 `수검준비`, `지적사례` 등 핵심 콘텐츠를 Service Worker 캐시를 통해 즉시 조회할 수 있습니다.
- **No App Store**: 심사 대기 시간 없이 즉각적인 업데이트가 가능하며, 빠른 설치(A2HS)를 지원합니다.
- **네이티브 UX**: 푸시 알림, 전체 화면 모드 등을 통해 일반 앱과 차이 없는 사용자 경험을 제공합니다.

### ⚡ 최고의 성능을 위한 인프라 아키텍처

사용자가 어디에 있든 1초 이내에 페이지를 경험할 수 있도록 엣지(Edge) 기반의 고성능 아키텍처를 구성했습니다.

```mermaid
graph LR
    subgraph "User Environment"
        User([사용자 기기]) --- SW[Service Worker Cache]
    end

    subgraph "Global Edge Routing"
        User --> CF{Cloudflare DNS/CDN}
        CF -- Full Strict SSL --> V[Vercel Seoul Region]
    end

    subgraph "Application Logic (SSR)"
        V --> Astro[Astro 5.x SSR]
        Astro --> Actions[Astro Server Actions]
    end

    subgraph "Data & Auth (Serverless)"
        Actions --> S[Supabase Tokyo Region]
        S --> DB[(PostgreSQL / RLS)]
        S --> Auth[JWT Auth]
    end

    style CF fill:#f6821f,stroke:#fff,stroke-width:2px,color:#fff
    style V fill:#000,stroke:#fff,stroke-width:2px,color:#fff
    style S fill:#3ecf8e,stroke:#fff,stroke-width:2px,color:#fff
```

- **지연 시간 최적화**: Vercel 서울 리전과 Supabase 도쿄 리전을 결합하여 성능 저하 없는 SSR 환경을 구축했습니다.
- **보안 아키텍처**: Cloudflare Full (Strict) SSL과 Supabase RLS(Row Level Security)를 통해 의료 데이터급 보안을 유지합니다.

---

## 포함된 기능

### 코드 품질 및 테스트

- **린터·포매터**: ESLint, Prettier — `npm run lint`, `npm run format`
- **타입 검사**: TypeScript — `npm run check`
- **커밋 전 검사**: Husky + lint-staged — 타입 체크 및 단위 테스트 자동 실행
- **테스트**: Vitest (Unit), Playwright (E2E) — `npm run test:unit`, `npm run test:e2e`
- **CI/CD**: GitHub Actions — 자동 빌드, 테스트, AI Spec Review 및 Vercel 자동 배포

### 주요 기술 스택

- **프레임워크**: Astro 5.x (SSR 전용, PWA)
- **백엔드 서비스**: Supabase (Auth, DB, Storage)
- **상태 관리**: Nanostores (Persistent 스토어 지원)
- **통합 서비스**: Resend (이메일), Web Push API (푸시 알림)

---

## 프로젝트 구조

| 경로              | 설명                                           |
| ----------------- | ---------------------------------------------- |
| `src/pages/`      | 라우팅 및 페이지 컴포넌트 (SSR 강제)           |
| `src/actions/`    | 서버 사이드 비즈니스 로직 (Astro Actions)      |
| `src/lib/`        | DB 클라이언트, 메일, 알림 헬퍼 등 유틸리티     |
| `src/components/` | 재사용 가능한 UI 컴포넌트                      |
| `.spec/`          | 파일별 1:1 매핑 명세서 (Level 2)               |
| `sql_query/`      | DB 스키마 통합 관리 (`rebuild_all_tables.sql`) |
| `tests/`          | 단위(Unit) 및 종단 간(E2E) 테스트 코드         |

---

## 상세 가이드 및 유지보수 참조 (Maintenance Documents)

프로젝트의 지속적인 운영과 기술적 세부 사항 파악을 위해 `documents/` 디렉토리에 다음 가이드들을 보관하고 있습니다. 특히 외부 서비스 설정 가이드는 운영 중 필수적으로 참조해야 할 자산입니다.

### 인프라 및 설정

- **[외부 서비스 설정 가이드](documents/external_services_guide.md)**: **(운영 필수)** Supabase, Vercel, Cloudflare, Resend 등의 연동 및 환경 설정 체크리스트
- **[데이터베이스 설계](documents/database_schema.md)**: 전체 테이블 구조, RLS 정책 및 데이터 관계 정의

### 사용자 및 운영 가이드

- **[아이폰 설치 가이드](documents/ios_installation.md)**: 아이폰(iOS) 사용자를 위한 홈 화면 설치(PWA) 및 알림 설정 방법
- **[유지보수 런북](documents/maintenance_runbook.md)**: 일상적 운영 및 장애 상황 조치 절차

### 개발 및 코드 품질

- **[코드베이스 가이드](documents/codebase_guide.md)**: 상세 파일별 기술적 역할 및 시스템 설계 가이드. 개별 명세(`.spec/`)는 AI 에이전트 전용으로 작성되어 가독성이 낮을 수 있으므로, 유지보수 목적의 코드 역할 파악은 이 가이드라인을 참조할 것을 권장합니다.
- **[테스트 및 로깅 전략](documents/test_strategy.md)**: QA를 위한 테스트 시나리오 및 [로그 활용 가이드](documents/logging_guide.md)

---

## 라이선스 및 이용 안내

본 프로젝트는 의료 안전 정보의 접근성 향상과 AI 기반 개발 표준의 확산을 위해 공개되었습니다.

- **비상업적 목적**: 교육, 연구 및 개인적 용도의 활용은 자유롭게 허용됩니다.
- **상업적 목적**: 본 프로젝트의 아키텍처, 명세 구조 또는 코드를 상업적 서비스에 인용하거나 재배포하려는 경우, 반드시 저작권자와의 사전 협의 및 서면 승인이 필요합니다.
