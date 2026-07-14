import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 설정
 *
 * 프로젝트 구성:
 * - chromium (기본): 로컬 dev 서버 대상 E2E (CI 포함)
 * - authenticated: 세션 주입 기반 인증 후 기능 테스트 (로컬 전용)
 *   실행: npm run test:e2e:auth
 *   사전 조건: npm run test:e2e:save-session 으로 세션 저장 필요
 */

const isAuthTest = process.env.TEST_AUTH === 'true';
const isSaveSession = process.env.TEST_SAVE_SESSION === 'true';
// 프로덕션 스모크(헬스체크 워크플로 전용): dev 서버 없이 실서버를 향한다.
// 명세: .spec/tests/e2e/production-smoke.spec.md
const smokeBaseUrl = process.env.SMOKE_BASE_URL;

export default defineConfig({
    testDir: 'tests/e2e',
    timeout: 30000,
    retries: 0,
    // 스모크 모드에서는 로컬 dev 서버를 띄우지 않는다(실서버 대상).
    webServer: smokeBaseUrl
        ? undefined
        : {
              command: 'npm run dev',
              port: 4321,
              reuseExistingServer: true,
              timeout: 60000,
          },
    use: {
        baseURL: smokeBaseUrl || 'http://localhost:4321',
        trace: 'on-first-retry',
    },
    projects: smokeBaseUrl
        ? [
              // ── 프로덕션 스모크 (SMOKE_BASE_URL 설정 시 이 프로젝트만) ──
              {
                  name: 'production-smoke',
                  testMatch: '**/production-smoke.spec.ts',
                  use: { ...devices['Desktop Chrome'] },
              },
          ]
        : [
              // ── 기본 E2E (CI + 로컬) ──────────────────────────────
              // 비로그인 상태 검증, 공개 페이지, 인증 가드, View Transitions 등
              // 세션 저장 / 인증 후 테스트 파일 / 프로덕션 스모크는 제외
              {
                  name: 'chromium',
                  testIgnore: ['**/authenticated-*.spec.ts', '**/save-session.spec.ts', '**/production-smoke.spec.ts'],
                  use: { ...devices['Desktop Chrome'] },
              },

              // ── 인증 후 기능 테스트 (로컬 전용) ────────────────────
              // npm run test:e2e:auth 로 실행
              // tests/fixtures/session-*.json 세션 파일 필요
              ...(isAuthTest
                  ? [
                        {
                            name: 'authenticated',
                            testMatch: '**/authenticated-*.spec.ts',
                            use: {
                                ...devices['Desktop Chrome'],
                                // 세션 파일은 helpers/auth.ts에서 수동으로 주입하므로
                                // storageState는 여기서 지정하지 않음
                            },
                        },
                    ]
                  : []),

              // ── 세션 저장 (로컬 전용) ────────────────────────────
              // npm run test:e2e:save-session 으로 실행
              ...(isSaveSession
                  ? [
                        {
                            name: 'save-session',
                            testMatch: '**/save-session.spec.ts',
                            use: {
                                ...devices['Desktop Chrome'],
                                headless: false, // 직접 로그인해야 하므로 브라우저 창 필요
                                actionTimeout: 300000,
                            },
                        },
                    ]
                  : []),
          ],
});
