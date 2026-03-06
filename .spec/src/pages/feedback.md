# 명세: src/pages/feedback.astro

## 역할 요약

의견보내기 페이지. 제목·내용·첨부파일(최대 3개, 5MB) 폼. actions.sendFeedback 호출, Supabase Storage 업로드.

## Props

없음.

## 사이드 이펙트

- feedback-attachments 버킷에 파일 업로드.
- feedback 테이블 insert.
- 관리자 이메일 발송 (actions.sendFeedback).

## 핵심 규칙

1. prerender = false. 인증 필요 (DashboardLayout).
2. 첨부: image/\*, .pdf, .doc, .docx, .txt. 최대 3개, 5MB.
3. userProfile, supabase.auth.getUser()로 발신자 정보 사용.
4. 내용 최소 10자.
