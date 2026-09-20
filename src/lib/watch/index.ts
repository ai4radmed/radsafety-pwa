/**
 * 감시 대상 레지스트리. 새 소스는 여기 한 줄 + 어댑터 파일 하나로 붙는다.
 * 명세: .spec/src/lib/watch/engine.md
 */

import { kinsSosSource } from './sources/kins-sos';
import { kinsPubSource } from './sources/kins-pub';
import type { WatchSource } from './types';

export const WATCH_SOURCES: WatchSource[] = [kinsSosSource, kinsPubSource];

export { runSource, computeDiff, isSuspiciousDrop, MISSING_THRESHOLD, FAILURE_ALERT_THRESHOLD } from './engine';
export { notifyWatchResults, buildMemberNotification, buildAdminSummary } from './notify';
export { supabaseWatchStore } from './supabase-store';
export type * from './types';
