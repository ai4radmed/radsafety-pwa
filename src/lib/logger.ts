type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
    level: LogLevel;
    module: string;
    message: string;
    data?: unknown;
    timestamp: string;
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
            const entry = createLog('info', module, message, data);
            console.log(JSON.stringify(entry));
        },
        warn: (message: string, data?: unknown) => {
            const entry = createLog('warn', module, message, data);
            console.warn(JSON.stringify(entry));
        },
        error: (message: string, data?: unknown) => {
            const entry = createLog('error', module, message, data);
            console.error(JSON.stringify(entry));
        },
    };
}
