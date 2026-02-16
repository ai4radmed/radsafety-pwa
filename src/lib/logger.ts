type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
    level: LogLevel;
    module: string;
    message: string;
    data?: unknown;
    timestamp: string;
}

// 환경변수로 최소 로그 레벨 제어 (기본값: warn)
const MIN_LOG_LEVEL = (import.meta.env.PUBLIC_LOG_LEVEL || 'warn') as LogLevel;

const LEVEL_PRIORITY: Record<LogLevel, number> = {
    info: 0,
    warn: 1,
    error: 2,
};

function shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LOG_LEVEL];
}

function createLog(level: LogLevel, module: string, message: string, data?: unknown): LogEntry {
    return {
        level,
        module,
        message,
        data,
        timestamp: new Date().toISOString(),
    };
}

export function createLogger(module: string) {
    return {
        info: (message: string, data?: unknown) => {
            if (!shouldLog('info')) return;
            const entry = createLog('info', module, message, data);
            console.log(JSON.stringify(entry));
        },
        warn: (message: string, data?: unknown) => {
            if (!shouldLog('warn')) return;
            const entry = createLog('warn', module, message, data);
            console.warn(JSON.stringify(entry));
        },
        error: (message: string, data?: unknown) => {
            if (!shouldLog('error')) return;
            const entry = createLog('error', module, message, data);
            console.error(JSON.stringify(entry));
        },
    };
}
