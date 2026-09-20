# 테스트 명세: 제출 검토 액션 (reviewSubmission · setPublishPermission)

## 대상 구현체

- 경로: src/actions/index.ts (`reviewSubmission`, `setPublishPermission`, 내부 `movePendingFileToPublic`·`notifySubmitter`)
- 명세: .spec/src/actions/index.md 규칙 17

## 테스트 도구

Vitest. `supabase-server`를 테이블별 상태 객체로 모의(profiles → 관리자 확인·reject_count, archives/findings → 대상 행, storage → download/upload/remove 호출 기록). `notification-helper` 모의.

## Mock/Setup 추가 (2026-09-20 세션 인증 전환)

`src/actions/auth` 를 모의 — `session.userId` 가 로그인한 사람이며, 판정은 같은 supabase-server 모의의 `profiles` 조회를 타게 해 기존 mock 호출 순서를 보존한다. 관리자 여부 = 그 조회의 `is_admin`.

## 검증 항목

| describe                    | it                                      | 검증 내용                                                                                                                                            |
| --------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| server.reviewSubmission     | 관리자가 아니면 거부                    | update 0건                                                                                                                                           |
| 〃                          | 이미 처리된(pending 아님) 제출물은 거부 | `이미 처리된 제출물입니다.`                                                                                                                          |
| 〃                          | 승인(archive, 대기 버킷 파일)           | download(pending)→upload(public)→remove(pending) 순서, `status published + file_bucket resources`, 작성자 `can_publish true`, 알림 link `/resources` |
| 〃                          | 승인(finding)                           | 스토리지 호출 없음, `published`, `can_publish`, 알림 link `/findings-recommendations`                                                                |
| 〃                          | 반려                                    | `rejected`, `reject_count = 기존+1`, 알림에 사유 포함, 반환 `rejectCount`                                                                            |
| 〃                          | 반려 3회 누적                           | 알림에 "더 이상 제출할 수 없습니다"                                                                                                                  |
| 〃                          | 알림 실패는 처리 결과를 바꾸지 않는다   | createNotification reject 시에도 success                                                                                                             |
| server.setPublishPermission | 관리자가 아니면 거부                    |                                                                                                                                                      |
| 〃                          | 부여/회수 — can_publish 갱신 + 알림     | update `{can_publish:false}`, 알림 제목에 "회수"                                                                                                     |

## 유지보수 목적

- 승인 시 파일 이동 순서(복사 성공 후 삭제)와 권한 부여가 빠지는 회귀 방지.
