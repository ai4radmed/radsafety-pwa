/**
 * 회원기관 조회 — 정적 목록(src/data/hospitals.ts) + 관리자가 화면에서 등록한
 * hospitals_custom 테이블을 하나의 목록처럼 다룬다. 명세: .spec/src/lib/hospitals.md
 */

import { createHash } from 'node:crypto';
import { HOSPITALS, type Hospital } from '../data/hospitals';
import { supabaseAdmin } from './supabase-server';

export const CUSTOM_ID_PREFIX = 'c-';

export function normalizeHospitalName(name: string): string {
    return name.replace(/\s+/g, '').toLowerCase();
}

// 같은 이름은 항상 같은 id — 중복 등록이 upsert 로 흡수되고, 나중에 hospitals.ts 로 옮겨도
// id 를 그대로 가져가면 회원의 hospital_id 참조가 안 끊긴다. 한글 이름은 slug 로 음역할 수
// 없으므로 해시를 쓴다.
export function customHospitalId(name: string): string {
    const digest = createHash('sha256').update(normalizeHospitalName(name)).digest('hex');
    return `${CUSTOM_ID_PREFIX}${digest.slice(0, 10)}`;
}

export function isStaticHospitalId(id: string): boolean {
    return HOSPITALS.some((h) => h.id === id);
}

export function findStaticHospitalByName(name: string): Hospital | undefined {
    const wanted = normalizeHospitalName(name);
    return HOSPITALS.find((h) => h.id !== 'other' && normalizeHospitalName(h.name) === wanted);
}

export async function isKnownHospitalId(id: string): Promise<boolean> {
    if (isStaticHospitalId(id)) return true;
    if (!id.startsWith(CUSTOM_ID_PREFIX) || !supabaseAdmin) return false;
    const { data } = await supabaseAdmin.from('hospitals_custom').select('id').eq('id', id).maybeSingle();
    return !!data;
}

export async function getHospitalName(id: string): Promise<string> {
    const found = HOSPITALS.find((h) => h.id === id);
    if (found) return found.name;
    if (id.startsWith(CUSTOM_ID_PREFIX) && supabaseAdmin) {
        const { data } = await supabaseAdmin.from('hospitals_custom').select('name').eq('id', id).maybeSingle();
        if (data?.name) return data.name as string;
    }
    return id;
}
