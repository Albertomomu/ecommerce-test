type LogLevel = 'info' | 'warn' | 'error';

type LogContext = {
  requestId: string;
  method: string;
  path: string;
  userId?: string;
  startTime: number;
};

type LogEntry = {
  timestamp: string;
  level: LogLevel;
  requestId: string;
  method: string;
  path: string;
  userId?: string;
  duration_ms?: number;
  status?: number;
  message: string;
  [key: string]: unknown;
};

export type RequestLogger = {
  info: (message: string, extra?: Record<string, unknown>) => void;
  warn: (message: string, extra?: Record<string, unknown>) => void;
  error: (message: string, extra?: Record<string, unknown>) => void;
  done: (status: number, message: string, extra?: Record<string, unknown>) => void;
};

export function createRequestLogger(
  request: { method: string; url: string },
  opts?: { userId?: string }
): RequestLogger {
  const url = new URL(request.url);
  const ctx: LogContext = {
    requestId: crypto.randomUUID(),
    method: request.method,
    path: url.pathname,
    userId: opts?.userId,
    startTime: Date.now(),
  };

  function emit(level: LogLevel, message: string, extra?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      requestId: ctx.requestId,
      method: ctx.method,
      path: ctx.path,
      message,
      ...extra,
    };
    if (ctx.userId) entry.userId = ctx.userId;

    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(JSON.stringify(entry));
  }

  return {
    info: (message, extra) => emit('info', message, extra),
    warn: (message, extra) => emit('warn', message, extra),
    error: (message, extra) => emit('error', message, extra),
    done(status, message, extra) {
      emit(status >= 400 ? (status >= 500 ? 'error' : 'warn') : 'info', message, {
        status,
        duration_ms: Date.now() - ctx.startTime,
        ...extra,
      });
    },
  };
}
