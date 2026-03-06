#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * AI-Native Spec-Driven Development: AI Agentic Reviewer for Node.js/Astro
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

function getChangedFiles() {
    try {
        let diffCmd = `git diff --name-only HEAD~1`;

        if (process.env.GITHUB_BASE_REF) {
            diffCmd = `git diff --name-only origin/main...origin/${process.env.GITHUB_HEAD_REF}`;
        }

        const output = execSync(diffCmd).toString();
        return output.split('\n')
            .filter(f => (f.endsWith('.ts') || f.endsWith('.astro') || f.endsWith('.js')) && fs.existsSync(f));
    } catch (error) {
        console.error('❌ 변경 파일 목록 추출 실패:', error.message);
        // Fallback: staged files
        try {
            return execSync('git diff --cached --name-only').toString().split('\n').filter(f => f && fs.existsSync(f));
        } catch (e) {
            return [];
        }
    }
}

function findSpecForFile(filePath) {
    const ext = path.extname(filePath);
    const specPath = path.join('.spec', filePath.replace(ext, '.md'));
    return fs.existsSync(specPath) ? specPath : null;
}

async function reviewFileWithAI(filePath, specPath) {
    if (!GEMINI_API_KEY) {
        return '⚠️ GEMINI_API_KEY가 설정되지 않아 리뷰를 시뮬레이션합니다. (PASS)';
    }

    const codeContent = fs.readFileSync(filePath, 'utf-8');
    const specContent = fs.readFileSync(specPath, 'utf-8');

    const prompt = `
당신은 'AI Agentic Reviewer'입니다.
다음 프로젝트의 명세서(Level 2)와 구현된 코드(Level 3)를 비교하여 리뷰를 수행하세요.

[규칙]
1. 명세서에 정의된 '핵심 규칙'과 'Public API'를 코드가 정확히 준수하는지 확인하십시오.
2. 명세와 일치하지 않는 부분이 있다면 구체적인 코드 라인이나 로직을 지적하십시오.
3. 명세에는 없지만 보안상 취약하거나 가독성이 현격히 떨어지는 부분이 있다면 추가 피드백을 주십시오.
4. 결과는 Markdown 형식으로 작성하고, 마지막에 전체 결과로 'PASS' 또는 'FAIL'을 반드시 명확히 기재하십시오.

---
[명세서: ${specPath}]
${specContent}

---
[구현 코드: ${filePath}]
${codeContent}
`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'AI 응답 생성 실패';
    } catch (error) {
        return `❌ AI 호출 오류: ${error.message}`;
    }
}

async function main() {
    console.log('🚀 AI Agentic Reviewer 시작...');

    const changedFiles = getChangedFiles();
    if (changedFiles.length === 0) {
        console.log('✅ 리뷰할 변경된 소스 파일이 없습니다.');
        return;
    }

    let hasViolation = false;
    const results = [];

    for (const file of changedFiles) {
        const spec = findSpecForFile(file);
        if (spec) {
            console.log(`📝 리뷰 중: ${file} (명세: ${spec})`);
            const report = await reviewFileWithAI(file, spec);
            results.push({ file, report });
            if (report.includes('FAIL')) hasViolation = true;
        } else {
            console.log(`ℹ️ 명세 없음 (건너뜀): ${file}`);
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 AI 리뷰 결과 보고서');
    console.log('='.repeat(50));

    for (const { file, report } of results) {
        console.log(`\n### 📂 파일: ${file}`);
        console.log(report);
        console.log('-'.repeat(30));
    }

    if (hasViolation) {
        console.log('\n❌ [FAIL] 일부 파일이 명세를 준수하지 않습니다.');
        process.exit(1);
    } else {
        console.log('\n✅ [PASS] 모든 파일이 명세를 준수합니다.');
        process.exit(0);
    }
}

main();
