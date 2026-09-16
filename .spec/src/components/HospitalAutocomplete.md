# 명세: src/components/HospitalAutocomplete.astro

## 역할 요약

소속기관(`src/data/hospitals.ts`) 선택용 자동완성 콤보박스. Phase 2(`documents/privacy_redesign_plan.md` 2단계 개정)의 가입 폼에서 사용. 180개(예정) 항목을 네이티브 `<select>`로 두면 모바일에서 스크롤이 지옥이라(Dr. Ben 2026-09-16 지적), 타이핑하면 필터링되는 콤보박스로 대체했다.

## Props

없음.

## DOM 계약 (부모 폼이 참조하는 요소 id)

| id              | 타입           | 설명                                                              |
| --------------- | -------------- | ----------------------------------------------------------------- |
| `hospitalQuery` | `text input`   | 사용자가 타이핑하는 검색창. 표시용 — 제출 시 이 값은 쓰지 않는다. |
| `hospitalId`    | `hidden input` | 실제 제출값. 목록에서 항목을 **클릭해 확정**했을 때만 채워진다.   |

## 사이드 이펙트

없음(순수 클라이언트 필터링, 네트워크 호출 없음).

## 핵심 규칙

1. `HOSPITALS`에서 `retired: true`인 항목은 후보에서 제외.
2. 입력값이 `name`에 부분 포함(`includes`)되는 항목만, 최대 8개까지 보여준다.
3. **직접 타이핑만 하고 목록에서 클릭하지 않으면 `hospitalId`는 비어 있다** — 자유 텍스트 입력을 막기 위해서다(오타·존재하지 않는 기관명이 그대로 저장되는 것 방지). 부모 폼은 제출 시 `hospitalId`가 비어 있어도 에러 처리하지 않는다 — 소속기관은 선택 항목(`documents/privacy_redesign_plan.md` §2-2 "기관 | 필수 아님")이라 비워 둔 채 제출 가능.
4. 옵션 클릭은 `mousedown`으로 처리한다 — `click`을 쓰면 입력창의 `blur` 이벤트가 먼저 발생해 목록이 사라져 클릭이 무효화된다.
5. `blur` 시 150ms 지연 후 목록을 숨긴다 — 그 사이에 `mousedown`이 먼저 처리되도록.
6. 새로 타이핑하면(`input` 이벤트) 이전에 확정했던 `hospitalId`를 즉시 비운다 — 화면에 보이는 텍스트와 실제 제출값이 어긋나는 상태를 만들지 않기 위해.

## 관련

- 데이터: `src/data/hospitals.ts` (`.spec/src/data/hospitals.md`)
- 사용처: `src/components/auth/UsernamePasswordForm.astro`(가입 탭), `src/pages/claim-username.astro`(신규 카카오/이메일 가입자)
