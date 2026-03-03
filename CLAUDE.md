# Claude Code 설정 (Cursor)

**진입점(Entry)**: [entry.cursor.md](entry.cursor.md) — 작업 시 진입점으로 사용하며, 해당 파일이 [ARCHITECTURE.md](ARCHITECTURE.md) 및 공통 규칙을 참조하도록 구성되어 있습니다.

공통 프로젝트 규칙은 [AGENTS.md](AGENTS.md)를 참조하고, 아키텍처·명세 주도 개발 방법론은 [ARCHITECTURE.md](ARCHITECTURE.md)를 참조하세요.

## Claude 전용 지침

- 아티팩트나 문서 생성 시 `AGENTS.md`의 언어 정책과 개발 규칙을 따를 것
- 코드 변경 시 관련 `documents/` 문서가 최신 상태인지 확인할 것
- 코드·명세 작업 시 `entry.cursor.md` → `ARCHITECTURE.md` → `.spec/` 순으로 컨텍스트를 확보할 것
