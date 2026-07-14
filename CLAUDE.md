# radsafety-pwa

작업 전 **[AGENTS.md](AGENTS.md)** 를 먼저 읽는다 — 시스템 맵, SDD(Spec-First) 워크플로우, 브랜치·배포 정책, 운영 치트시트, 알려진 함정.

- 구현/변경은 항상 **`.spec/` 명세 → `src/` 구현 + `tests/` 테스트** 순서.
- 작업 브랜치는 `dev`. `main` 은 PR 로만 병합하며, 머지 즉시 프로덕션 배포된다.
