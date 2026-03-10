/**
 * [SESSION-DIAG] iOS PWA 세션 소실 진단용 유틸리티.
 * 진단 완료 후 이 파일을 삭제하고, 다른 파일에서 [SESSION-DIAG] 주석이 달린 코드를 제거하세요.
 * 검색: grep -r "SESSION-DIAG" src/
 */

const DB_NAME = 'session-diag';
const STORE_NAME = 'logs';
const MAX_LOGS = 200;

export interface DiagEntry {
    ts: string;
    point: string;
    data: Record<string, unknown>;
}

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') return reject(new Error('no idb'));
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains(STORE_NAME)) {
                req.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function persistEntry(entry: DiagEntry): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add(entry);
    const countReq = store.count();
    countReq.onsuccess = () => {
        if (countReq.result > MAX_LOGS) {
            const cursorReq = store.openCursor();
            let toDelete = countReq.result - MAX_LOGS;
            cursorReq.onsuccess = () => {
                const cursor = cursorReq.result;
                if (cursor && toDelete > 0) {
                    cursor.delete();
                    toDelete--;
                    cursor.continue();
                }
            };
        }
    };
    await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
    });
    db.close();
}

/** 진단 로그 기록 (동기 반환, IndexedDB 쓰기는 fire-and-forget) */
export function diagLog(point: string, data: Record<string, unknown>): void {
    const entry: DiagEntry = { ts: new Date().toISOString(), point, data };
    console.log(`[SESSION-DIAG] ${point}`, data);
    persistEntry(entry).catch(() => {});
}

/** IndexedDB에서 전체 진단 로그 조회 */
export async function getDiagLogs(): Promise<DiagEntry[]> {
    try {
        const db = await openDB();
        return await new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).getAll();
            req.onsuccess = () => {
                db.close();
                resolve(req.result || []);
            };
            req.onerror = () => {
                db.close();
                resolve([]);
            };
        });
    } catch {
        return [];
    }
}

/** IndexedDB 진단 로그 전체 삭제 */
export async function clearDiagLogs(): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        await new Promise<void>((resolve) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
        db.close();
    } catch {
        // ignore
    }
}
