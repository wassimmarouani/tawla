/**
 * Structured JSON logger (ADR-0020). One line per event, with request and tenant ids when known.
 * Never log secrets, tokens, PIN material or customer personal data.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFields = Record<string, unknown>;

export interface Logger {
  debug: (message: string, fields?: LogFields) => void;
  info: (message: string, fields?: LogFields) => void;
  warn: (message: string, fields?: LogFields) => void;
  error: (message: string, fields?: LogFields) => void;
  child: (fields: LogFields) => Logger;
}

type Sink = (level: LogLevel, line: string) => void;

const consoleSink: Sink = (level, line) => {
  // eslint-disable-next-line no-console -- the logger is the single sanctioned console writer
  console[level === 'debug' ? 'log' : level](line);
};

function serializeError(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

export function createLogger(base: LogFields = {}, sink: Sink = consoleSink): Logger {
  const write = (level: LogLevel, message: string, fields: LogFields = {}) => {
    const entry: LogFields = { level, time: new Date().toISOString(), message, ...base };
    for (const [key, value] of Object.entries(fields)) entry[key] = serializeError(value);
    sink(level, JSON.stringify(entry));
  };
  return {
    debug: (message, fields) => {
      write('debug', message, fields);
    },
    info: (message, fields) => {
      write('info', message, fields);
    },
    warn: (message, fields) => {
      write('warn', message, fields);
    },
    error: (message, fields) => {
      write('error', message, fields);
    },
    child: (fields) => createLogger({ ...base, ...fields }, sink),
  };
}

export const log = createLogger();
