# 명세: src/components/admin/verification/VerificationTabs.astro

## 역할 요약

인증 관리 페이지 상단의 상태별 탭 UI 컴포넌트입니다. 각 상태의 사용자 수를 표시하고 탭 전환을 담당합니다.

## Props

없음 (서버 사이드 데이터는 클라이언트에서 비동기로 로드하여 업데이트함)

## 핵심 규칙

1. **상태 구성**: 임시인증(`temp_verified`), 관리자인증(`verified`), 인증취소(`rejected`), 명부인증(`list`), 미인증(`none`).
2. **카운트 표시**: 각 탭에는 해당 상태의 사용자 수를 표시하는 `<span>` 요소가 있으며, ID 형식은 `${status}Count`를 따릅니다.
3. **이벤트**: 각 버튼(`status-tab`)은 `data-status` 속성을 가지며, 클릭 시 'active' 클래스가 전환되어야 합니다 (컨트롤러에서 제어).
4. **스타일**: 가로 스크롤 가능(`overflow-x: auto`), 하단 보더 표시.
