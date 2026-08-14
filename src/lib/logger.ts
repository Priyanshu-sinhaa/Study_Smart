/**
 * Lightweight structured logger for the Concept Canvas frontend.
 * Adds timestamps, log levels, and module context to every log line.
 *
 * Usage:
 *   import { createLogger } from '@/lib/logger';
 *   const log = createLogger('Canvas');
 *   log.info('Session loaded', { sessionId });
 *   log.error('AI call failed', error);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
  timestamp: string;
}

const LEVEL_STYLES: Record<LogLevel, string> = {
  debug: 'color:#6b7280;font-weight:normal',
  info:  'color:#2563eb;font-weight:bold',
  warn:  'color:#d97706;font-weight:bold',
  error: 'color:#dc2626;font-weight:bold',
};

const MODULE_STYLE = 'color:#7c3aed;font-weight:bold';
const TIME_STYLE   = 'color:#9ca3af;font-weight:normal';

const isDev = process.env.NODE_ENV !== 'production';

function emit(entry: LogEntry) {
  if (!isDev && entry.level === 'debug') return; // suppress debug in prod

  const ts = entry.timestamp;
  const prefix = `%c${entry.level.toUpperCase().padEnd(5)} %c[${entry.module}] %c${ts}`;
  const styles = [LEVEL_STYLES[entry.level], MODULE_STYLE, TIME_STYLE];

  const consoleFn =
    entry.level === 'error' ? console.error :
    entry.level === 'warn'  ? console.warn  :
    entry.level === 'debug' ? console.debug :
    console.info;

  if (entry.data !== undefined) {
    consoleFn(prefix + '  ' + entry.message, ...styles, entry.data);
  } else {
    consoleFn(prefix + '  ' + entry.message, ...styles);
  }
}

function now(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 23);
}

export interface Logger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

export function createLogger(module: string): Logger {
  const log = (level: LogLevel) => (message: string, data?: unknown) => {
    emit({ level, module, message, data, timestamp: now() });
  };
  return {
    debug: log('debug'),
    info:  log('info'),
    warn:  log('warn'),
    error: log('error'),
  };
}

// Root app logger — use this for one-off logs outside a specific module
export const log = createLogger('App');
