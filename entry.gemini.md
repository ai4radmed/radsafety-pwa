# Gemini 진입점 (Entry)

이 파일은 **Antigravity Gemini** 사용 시 AI 에이전트의 진입점입니다. 작업 전 반드시 아래 문서를 참조하세요.

## 필수 참조 문서

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — 프로젝트 아키텍처, AI-Native Spec-Driven Development 방법론, 코드 구조·명세 계층·워크플로우
- **[AGENTS.md](AGENTS.md)** — 공통 프로젝트 규칙(언어 정책, 기술 스택, 브랜치 전략, 개발 규칙)
- **[GEMINI.md](GEMINI.md)** — Gemini 전용 지침

## 워크플로우

1. 아키텍처 문서에 따라 **Spec-First**를 따릅니다. (Plan → Manifest → Execute → Verify)
2. `.spec/` 명세를 먼저 갱신한 뒤 구현체(`src/`)를 수정합니다.
3. 공통 규칙은 `AGENTS.md`, 상세 구조는 `ARCHITECTURE.md`를 기준으로 합니다.
