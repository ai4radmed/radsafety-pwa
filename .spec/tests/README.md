# 테스트 명세 메타 문서

이 문서는 **구현체 명세**(`.spec/src/*.md`)로부터 **자동 테스트 파일**을 생성하기 위한 규칙과 절차를 정의합니다.

## 용어 정리

- **구현체(Implementation)**: 명세와 1:1 매칭된 실행 코드. `src/`, `sql_query/` 하위의 `.ts`, `.astro`, `.sql` 파일.
- **테스트 명세**: 구현체 명세를 기반으로, 해당 구현체를 검증할 테스트 케이스를 기술한 문서.
- **테스트 파일**: Vitest/Playwright로 실행되는 실제 테스트 코드.

## 매핑 구조

```
.spec/src/config/auth.md          → 구현체: src/config/auth.ts
        ↓
.spec/tests/unit/config/auth.test.md   → 테스트 명세
        ↓
tests/unit/config/auth.test.ts        → 테스트 파일 (Vitest)
```

## 테스트 명세 형식 (`.spec/tests/unit/**/*.test.md`)

각 테스트 명세는 다음 구조를 따른다.

```markdown
# 테스트 명세: [대상 구현체 경로]

## 대상 구현체

- 경로: src/config/auth.ts
- 명세: .spec/src/config/auth.md

## 테스트 도구

- Vitest (단위) | Playwright (E2E)

## 검증 항목

| describe | it                         | 검증 내용                                    |
| -------- | -------------------------- | -------------------------------------------- |
| getRole  | 관리자 이메일은 admin 반환 | getRole('benkorea.ai@gmail.com') === 'admin' |
| getRole  | 빈 문자열은 user 반환      | getRole('') === 'user'                       |

...

## Mock/Setup

- import.meta.env 모킹 필요 시 기술
- beforeEach, afterEach 사용 시 기술

## 기존 테스트 참조

- tests/unit/config/auth.test.ts_backup (비교용)
```

## 테스트 파일 생성 규칙

1. **경로**: `tests/unit/{구현체 상대 경로}.test.ts`. 예: `src/config/auth.ts` → `tests/unit/config/auth.test.ts`
2. **프레임워크**: Vitest (`describe`, `it`, `expect`, `vi`)
3. **기존 테스트 고려**: `*_backup` 파일과 동일한 검증 수준 유지. 누락 없이 포함.
4. **한국어**: describe/it 메시지는 한국어 사용 (AGENTS.md 언어 정책).

## 생성 절차 (Spec-First for Tests)

1. **Plan**: 구현체 명세(`.spec/src/X.md`)를 읽고, Public API·핵심 규칙에 따른 검증 항목 도출.
2. **Manifest**: `.spec/tests/unit/X.test.md` 테스트 명세 작성.
3. **Execute**: 테스트 명세를 기반으로 `tests/unit/X.test.ts` 생성.
4. **Verify**: `npm run test:unit` 또는 `npx vitest run tests/unit/X.test.ts` 실행.

## 기존 테스트 백업

- 기존 테스트 파일은 `*_backup` 접미사로 복제하여 보관.
- 예: `auth.test.ts` → `auth.test.ts_backup`
- 신규 테스트 생성 후 `_backup`과 diff로 검증 수준 비교 가능.
