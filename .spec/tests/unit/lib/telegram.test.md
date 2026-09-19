# 테스트 명세: src/lib/telegram.ts

## 대상 구현체

- 경로: src/lib/telegram.ts
- 명세: .spec/src/lib/telegram.md

## 테스트 도구

Vitest. `fetch` 를 `vi.stubGlobal`, env 를 `vi.stubEnv` 로 모의.

## 검증 항목

| it                                          | 검증 내용                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| 자격 미설정이면 발송하지 않고 false         | `isTelegramConfigured()` false, fetch 호출 0                                   |
| 자격이 있으면 sendMessage 로 POST 하고 true | URL `bot<token>/sendMessage`, body `{chat_id, text, disable_web_page_preview}` |
| HTTP 오류는 throw                           | `HTTP 401` 포함 메시지                                                         |
