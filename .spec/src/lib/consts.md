# 명세: src/consts.ts

## 역할 요약

사이트 전역에서 사용하는 상수 집합. 사이트 타이틀/설명, 앱 버전 및 릴리스 날짜를 정의한다.

## 상수 목록

| 이름             | 타입   | 예시값                       | 용도                               |
| ---------------- | ------ | ---------------------------- | ---------------------------------- |
| SITE_TITLE       | string | 'RadSafety'                  | 사이드바 로고, 문서 제목 등에 사용 |
| SITE_DESCRIPTION | string | 'RadSafety Official Website' | 메타 설명, SNS 공유 등             |
| APP_VERSION      | string | '0.2.1'                      | 앱 버전 표기(사이드바, 로그 등)    |
| APP_RELEASE_DATE | string | '2036-03-20'                 | 해당 버전의 기준 배포 날짜         |

## 핵심 규칙

1. 버전 정보(APP_VERSION, APP_RELEASE_DATE)는 **한 곳(src/consts.ts)** 에만 정의하고 다른 파일은 값을 하드코딩하지 않는다.
2. 사이드바 하단, 마이페이지 등 UI에서 버전 정보를 노출할 때는 반드시 이 상수를 import 해서 사용한다.
