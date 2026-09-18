// 대한핵의학회 회원기관 목록. documents/privacy_redesign_plan.md §2-3 —
// DB 테이블이 아니라 이 파일로 관리한다(변경 빈도가 낮아 배포 비용 문제없고,
// 이력이 git 에 남는다).
//
// id 는 slug 규칙(documents/resource_slugs.md 와 동일): 영문 소문자·숫자·하이픈,
// 한 번 정하면 변경 금지. profiles.hospital_id 가 이 값을 저장하므로 병원 개명·
// 합병이 있어도 id 는 유지하고 name 만 고친다. 폐업·통합 시 항목을 지우지 않고
// retired: true 로 표시한다(기존 회원의 hospital_id 가 끊기지 않도록).
//
// ⚠️ 미완성 — 대한핵의학회 정회원기관 180개 전수 목록이 아직 없다. 아래는 vault에
// 이미 실명으로 기록돼 있던 방안위원 소속기관 몇 곳을 시드로 넣어둔 것뿐이다
// (knowledge/02_areas/대한핵의학회/방사선안전위원회/2026-09-10_..._의견수렴.md 등,
// 코드 저장소 밖). 학회 홈페이지 공개 명단(전수)을 받아 채워야 한다 — 개인 명부
// (0단계 유출 파일)는 출처로 쓰지 않는다(정책 확정, privacy_redesign_plan.md 참조).
//
// 'other'(기타) 항목은 회원기관이 아닌 곳(비회원 병원·연구기관 등) 소속자를 위한
// 것으로, "미가입 병원 추정" 집계에서 제외하고 기관 추가 요청의 대상도 아니다.

export interface Hospital {
    id: string;
    name: string;
    region?: string;
    retired?: boolean;
}

export const HOSPITALS: Hospital[] = [
    { id: 'korea-institute-radiological-medical-sciences', name: '한국원자력의학원' },
    { id: 'dongnam-institute-radiological-medical-sciences', name: '동남권원자력의학원' },
    { id: 'daegu-catholic-univ-hospital', name: '대구가톨릭대학교병원' },
    { id: 'sejong-chungnam-univ-hospital', name: '세종충남대학교병원' },
    { id: 'yongin-severance-hospital', name: '용인세브란스병원' },
    { id: 'dong-a-univ-hospital', name: '동아대학교병원' },
    { id: 'eunpyeong-st-marys-hospital', name: '은평성모병원' },
    { id: 'chonnam-national-univ-hospital', name: '전남대학교병원' },
    { id: 'other', name: '기타' },
];
