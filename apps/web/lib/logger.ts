export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = {
  requestId?: string;
  userId?: string;
  route?: string;
  [key: string]: unknown;
};

function emit(level: LogLevel, message: string, context: LogContext = {}) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };
  const line = JSON.stringify(entry);
  switch (level) {
    case 'debug':
    case 'info':
      console.log(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    case 'error':
      console.error(line);
      break;
    default: {
      const _exhaustive: never = level;
      console.log(line, _exhaustive);
    }
  }
}

export function createLogger(baseContext: LogContext = {}) {
  return {
    debug: (message: string, context?: LogContext) =>
      emit('debug', message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) =>
      emit('info', message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      emit('warn', message, { ...baseContext, ...context }),
    error: (message: string, context?: LogContext) =>
      emit('error', message, { ...baseContext, ...context }),
  };
}

export const logger = createLogger();
