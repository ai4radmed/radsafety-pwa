# 명세: src/pages/kins.astro

## 역할 요약

KINS·원안위 공식 자원 링크 모음(`/kins`, 공개). KINS 연계 트랙 **K-2**(`documents/privacy_redesign_plan.md`, 2026-07-02 박병현 실장 면담 권고 1·2번) + 권고 4번(원안위 보도자료). 2026-09-20 신설.

## Props

없음. 링크 목록은 파일 상단 `links` 상수(제목·기관·설명·URL·경로 안내·아이콘).

## 사이드 이펙트

없음(정적). `auth-handler.ts` publicPaths에 `/kins`.

## 핵심 규칙

1. **링크는 새 탭**(`target=_blank rel=noopener noreferrer`) — 외부 기관 사이트로 내보내는 하이퍼링크이지 API 연동이 아니다(계획서 4단계 용어 정리). 자료 저작권은 각 기관.
2. RASIS(`rasis.kins.re.kr`)의 규제해석 SOS·이용자지원간행물은 JS 메뉴(`fn_callMenu`)라 직접 주소가 없다(2026-09-20 headless 실측: 클릭해도 URL 불변) → 메인 링크 + 경로 안내(`알림마당 → …`). KINS가 직접 URL을 알려주면 `links[].url`만 교체.
3. 홈 카드("KINS 공식 자원")와 이용안내 §11에서 진입.

## 이력

- 2026-09-20: 신설(K-2). 직접 URL·인용 범위 확인 메일 초안 → Dr. Ben 발송.
