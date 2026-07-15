import { test, expect } from '@playwright/test';
import type { Page, BrowserContext } from '@playwright/test';

/**
 * 월간 수동 점검 위저드 (명세: .spec/tests/e2e/monthly-check.spec.md)
 *
 * 아침 헬스체크(부작용 0)가 원리적으로 못 덮는 "실제로 보내고 받는" 경로를
 * 사람 동석 하에 반자동으로 검증한다. 사람 개입은 코드 입력 1회 · 카카오 클릭 ·
 * 휴대폰 알림 확인뿐, 나머지 판정은 전부 자동.
 *
 * 실행: npm run check:monthly
 *   (선택) MONTHLY_EMAIL=me@example.com npm run check:monthly  → 이메일 입력까지 자동
 *   (선택) MONTHLY_BASE_URL=https://... → 대상 서버 변경 (기본 https://radsafety.kr)
 *
 * 원칙:
 *  - 부작용은 전부 실행자 본인 계정 한정([월간점검] 접두어) → 반복 실행 안전.
 *  - 자격증명 비저장: 코드·카카오는 그 자리에서 사람이 입력, 세션 파일도 남기지 않는다.
 *  - CI·cron 에 올리지 않는다(로컬 수동 발화 전용).
 */

const HUMAN_TIMEOUT = 5 * 60 * 1000; // 사람 개입 대기 5분

type StepResult = { name: string; status: 'PASS' | 'FAIL' | 'SKIP'; note?: string };

/** 단계 건너뜀 신호 (실패가 아닌 SKIP 으로 집계) */
class SkipStep extends Error {}

/**
 * 사이트의 confirm/alert 를 자동 수락하면서 문안을 수집한다.
 * next() 로 "다음에 뜰(또는 이미 떠서 큐에 쌓인) 다이얼로그 문안"을 순서대로 받는다.
 */
function attachDialogCollector(page: Page) {
    const queued: string[] = [];
    const waiters: ((msg: string) => void)[] = [];
    page.on('dialog', (dialog) => {
        const msg = dialog.message();
        void dialog.accept().catch(() => {});
        const waiter = waiters.shift();
        if (waiter) waiter(msg);
        else queued.push(msg);
    });
    return {
        next(timeoutMs = 30000): Promise<string> {
            const ready = queued.shift();
            if (ready !== undefined) return Promise.resolve(ready);
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('다이얼로그 대기 시간 초과')), timeoutMs);
                waiters.push((msg) => {
                    clearTimeout(timer);
                    resolve(msg);
                });
            });
        },
    };
}

/**
 * 사람에게 브라우저 새 탭으로 질문을 띄우고 버튼 클릭 값을 받는다.
 * (푸시 실수신처럼 기계가 판정할 수 없는 항목 전용)
 */
async function humanChoice(
    context: BrowserContext,
    title: string,
    description: string,
    choices: { value: string; label: string; color: string }[],
): Promise<string> {
    const page = await context.newPage();
    const buttons = choices
        .map(
            (c) =>
                `<button data-value="${c.value}" style="padding:1rem 2rem;border:none;border-radius:8px;` +
                `font-size:1.1rem;font-weight:600;cursor:pointer;color:white;background:${c.color};">${c.label}</button>`,
        )
        .join('');
    await page.setContent(
        `<div style="font-family:sans-serif;max-width:560px;margin:4rem auto;text-align:center;">` +
            `<h1 style="font-size:1.4rem;">${title}</h1>` +
            `<p style="color:#4b5563;line-height:1.6;">${description}</p>` +
            `<div style="display:flex;gap:1rem;justify-content:center;margin-top:2rem;">${buttons}</div></div>`,
    );
    const value = await page.evaluate(
        () =>
            new Promise<string>((resolve) => {
                document.querySelectorAll<HTMLButtonElement>('button[data-value]').forEach((btn) => {
                    btn.addEventListener('click', () => resolve(btn.dataset.value ?? ''));
                });
            }),
    );
    await page.close();
    return value;
}

test('월간 수동 점검 위저드', async ({ browser }) => {
    test.skip(process.env.TEST_MONTHLY !== 'true', 'TEST_MONTHLY=true 로만 실행 (npm run check:monthly)');
    test.setTimeout(30 * 60 * 1000);

    const results: StepResult[] = [];
    const step = async (name: string, fn: () => Promise<string | void>) => {
        console.log(`\n━━━ ${name} ━━━`);
        try {
            const note = (await fn()) || undefined;
            results.push({ name, status: 'PASS', note });
            console.log(`  ✅ 통과${note ? ` — ${note}` : ''}`);
        } catch (err) {
            const note = err instanceof Error ? err.message : String(err);
            if (err instanceof SkipStep) {
                results.push({ name, status: 'SKIP', note });
                console.log(`  ⏭ 건너뜀 — ${note}`);
            } else {
                results.push({ name, status: 'FAIL', note });
                console.log(`  ❌ 실패 — ${note}`);
            }
        }
    };

    const context = await browser.newContext();
    const page = await context.newPage();
    const dialogs = attachDialogCollector(page);

    let loginEmail = process.env.MONTHLY_EMAIL?.trim() ?? '';
    let loggedIn = false;

    // ── ① 이메일 OTP 로그인 — Auth 메일 발송 → 실수신 → 세션 생성 전 구간 ──
    await step('① 이메일 OTP 로그인', async () => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        if (loginEmail) {
            await page.fill('#emailOtpEmail', loginEmail);
            await page.click('#emailOtpRequestBtn');
            console.log(`  → ${loginEmail} 로 인증 코드 요청을 보냈습니다.`);
        } else {
            console.log('  ▶ 브라우저에서 이메일 주소를 입력하고 [이메일로 인증 코드 받기]를 눌러주세요.');
        }
        await page.locator('#otpStep').waitFor({ state: 'visible', timeout: HUMAN_TIMEOUT });
        if (!loginEmail) {
            // "user@example.com로 인증 코드를 보냈습니다." 문안에서 이메일 캡처 (④ 본인 검색에 사용)
            const sentTo = (await page.locator('#otpSentTo').textContent()) ?? '';
            loginEmail = sentTo.split('로 인증 코드')[0]?.trim() ?? '';
        }
        console.log('  ▶ 메일함의 6자리 코드를 입력하고 [인증하기]를 눌러주세요.');
        await page.waitForURL('**/mypage', { timeout: HUMAN_TIMEOUT });
        loggedIn = true;
        return `로그인 성공 (${loginEmail || '이메일 캡처 실패'})`;
    });

    // ── ② 자료실 파일 다운로드 — Storage 실파일 서빙 (사람 개입 0) ──
    await step('② 자료실 파일 다운로드', async () => {
        if (!loggedIn) throw new SkipStep('로그인 실패로 건너뜀');
        await page.goto('/resources');
        const cards = page.locator('.resource-card');
        try {
            await cards.first().waitFor({ state: 'visible', timeout: 30000 });
        } catch {
            throw new SkipStep('자료실에 표시된 자료 없음');
        }
        // slug+파일이면 새 탭(/api/archives/view/[slug]), 아니면 모달 뷰어의 #downloadLink
        const popupPromise = page.waitForEvent('popup', { timeout: 10000 }).catch(() => null);
        await cards.first().click();
        const popup = await popupPromise;
        let fileUrl: string | null = null;
        if (popup) {
            await popup.waitForLoadState('domcontentloaded').catch(() => {});
            fileUrl = popup.url();
            await popup.close();
        } else if (
            await page
                .locator('#downloadLink')
                .isVisible()
                .catch(() => false)
        ) {
            fileUrl = await page.locator('#downloadLink').getAttribute('href');
        }
        if (!fileUrl || fileUrl === 'about:blank') throw new SkipStep('첫 자료에 첨부 파일 없음');
        const resp = await page.request.get(fileUrl);
        if (!resp.ok()) throw new Error(`파일 응답 ${resp.status()}`);
        const bytes = (await resp.body()).byteLength;
        if (bytes <= 1024) throw new Error(`파일 크기 이상 (${bytes} bytes)`);
        return `${Math.round(bytes / 1024)} KB 수신 확인`;
    });

    // ── ③ 의견 보내기 — sendFeedback 액션 + Resend 실발송 (사람 개입 0) ──
    await step('③ 의견 보내기 (Resend 실발송)', async () => {
        if (!loggedIn) throw new SkipStep('로그인 실패로 건너뜀');
        await page.goto('/feedback');
        await page.waitForLoadState('networkidle');
        const now = new Date().toLocaleString('ko-KR');
        await page.fill('#title', `[월간점검] 의견 발송 테스트 (${now.slice(0, 12)})`);
        await page.fill('#message', `월간 수동 점검 위저드가 보낸 자동 테스트 의견입니다. 발송 시각: ${now}`);
        await page.click('#feedbackForm button[type="submit"]');
        await dialogs.next(15000); // confirm('의견을 전송하시겠습니까?') 자동 수락
        const resultMsg = await dialogs.next(30000); // 성공/실패 alert
        if (resultMsg.includes('실패')) throw new Error(`발송 실패 alert: ${resultMsg}`);
        return '제출 성공 — 관리자 메일함에서 수신을 겸사 확인하세요';
    });

    // ── ④ 푸시 발송·실수신 — 관리자 알림 발송 화면으로 본인에게만 발송 ──
    await step('④ 푸시 발송·실수신 (본인 대상)', async () => {
        if (!loggedIn) throw new SkipStep('로그인 실패로 건너뜀');
        if (!loginEmail) throw new SkipStep('로그인 이메일 캡처 실패 — 본인 검색 불가');
        await page.goto('/admin/send-notification');
        await page.waitForLoadState('networkidle');
        if (!page.url().includes('/admin/send-notification')) throw new SkipStep('관리자 권한 없음');

        await page.check('input[name="targetType"][value="specific"]');
        await page.fill('#userSearch', loginEmail);
        const firstItem = page.locator('#userDropdown .user-item').first();
        await firstItem.waitFor({ state: 'visible', timeout: 15000 });
        if (((await firstItem.textContent()) ?? '').includes('검색 결과가 없습니다')) {
            throw new Error(`본인 계정 검색 실패 (${loginEmail})`);
        }
        await firstItem.click();
        await page.locator('#selectedUser .selected-user').waitFor({ state: 'visible', timeout: 5000 });

        await page.fill('#title', '[월간점검] 푸시 수신 테스트');
        await page.fill('#message', '이 알림이 기기에 팝업으로 표시되면 푸시 경로 정상입니다.');
        await page.click('#notificationForm button[type="submit"]');
        await dialogs.next(15000); // confirm('알림을 발송하시겠습니까?') 자동 수락
        const sendResult = await dialogs.next(30000);
        if (!sendResult.includes('✅')) throw new Error(`발송 실패: ${sendResult}`);

        console.log('  ▶ 휴대폰(또는 이 PC)의 알림 팝업을 확인한 뒤, 새 탭의 버튼을 눌러주세요.');
        const answer = await humanChoice(
            context,
            '④ 푸시 실수신 확인',
            '방금 본인 계정으로 [월간점검] 푸시를 발송했습니다.<br>푸시를 구독한 기기(휴대폰·PC)에 알림 팝업이 도착했습니까?',
            [
                { value: 'yes', label: '도착함', color: '#059669' },
                { value: 'no', label: '안 옴', color: '#dc2626' },
                { value: 'skip', label: '구독한 기기 없음', color: '#6b7280' },
            ],
        );
        if (answer === 'skip') throw new SkipStep('푸시 구독 기기 없음 — 설정 페이지에서 토글 확인');
        if (answer !== 'yes') throw new Error('푸시 미수신 — Vercel 로그(push 모듈)에서 발송 결과 확인 필요');
        return '발송 성공 + 기기 수신 확인';
    });

    // ── ⑤ 카카오 로그인 — OAuth + /auth/callback 전 구간 (새 비로그인 컨텍스트) ──
    await step('⑤ 카카오 로그인', async () => {
        const kakaoContext = await browser.newContext();
        try {
            const kakaoPage = await kakaoContext.newPage();
            await kakaoPage.goto('/login');
            console.log('  ▶ 새 창에서 [카카오 인증으로 시작하기] 버튼을 눌러 로그인을 완료해주세요.');
            await kakaoPage.waitForURL('**/mypage', { timeout: HUMAN_TIMEOUT });
            return '카카오 → /auth/callback → /mypage 도달';
        } finally {
            await kakaoContext.close();
        }
    });

    await context.close();

    // ── 종합 판정 ──
    console.log('\n══════════ 월간 점검 결과 ══════════');
    for (const r of results) {
        const icon = r.status === 'PASS' ? '✅' : r.status === 'SKIP' ? '⏭' : '❌';
        console.log(` ${icon} ${r.name}${r.note ? ` — ${r.note}` : ''}`);
    }
    const failed = results.filter((r) => r.status === 'FAIL');
    console.log(
        `\n통과 ${results.filter((r) => r.status === 'PASS').length} · 건너뜀 ${
            results.filter((r) => r.status === 'SKIP').length
        } · 실패 ${failed.length}\n`,
    );
    expect(failed.map((f) => `${f.name}: ${f.note}`)).toEqual([]);
});
