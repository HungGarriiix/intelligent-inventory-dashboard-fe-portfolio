// /src/lib/logger.ts
// Structured request logger with a swappable output transport. All API routes
// log through this module (never `console.log` directly). The transport target
// can be changed here (console -> Datadog/CloudWatch) without touching routes.

import { randomUUID } from 'node:crypto';
import dayjs from 'dayjs';

/** Caller-supplied fields for one request log entry (the `level` is derived). */
export interface LogEntryInput {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  correlationId: string;
  ip: string;
  timestamp: string; // ISO 8601
}

/** A full entry handed to a transport. Extensible via the index signature. */
export interface LogEntry extends LogEntryInput {
  level: 'info' | 'error';
  [key: string]: unknown;
}

export interface LogTransport {
  emit(entry: LogEntry): void;
}

export interface Logger {
  info(entry: LogEntryInput): void;
  error(entry: LogEntryInput): void;
  /** Emits at 'error' severity when status >= 400, otherwise 'info' (Req 11.6). */
  logRequest(entry: LogEntryInput): void;
}

// Development: pretty, human-readable lines to stdout.
const devTransport: LogTransport = {
  emit(entry) {
    const ts = dayjs(entry.timestamp).format('HH:mm:ss');
    // Intentional console sink: this is the logger's dev transport (the one place
    // a console call is allowed). API routes log via `logger`, never console directly.
    console.log(
      `[${entry.level.toUpperCase()}] ${ts} ${entry.method} ${entry.path} ${entry.status} ${entry.durationMs}ms | ip=${entry.ip} | reqId=${entry.correlationId}`,
    );
  },
};

// Production: compact structured JSON to stdout (captured by pm2 / systemd).
const prodTransport: LogTransport = {
  emit(entry) {
    process.stdout.write(`${JSON.stringify(entry)}\n`);
  },
};

export function createLogger(transport: LogTransport): Logger {
  const emit = (entry: LogEntryInput, level: LogEntry['level']): void => {
    try {
      transport.emit({ ...entry, level });
    } catch {
      /* logging failures must never affect the API response */
    }
  };
  return {
    info(entry) {
      emit(entry, 'info');
    },
    error(entry) {
      emit(entry, 'error');
    },
    logRequest(entry) {
      emit(entry, entry.status >= 400 ? 'error' : 'info');
    },
  };
}

export const logger = createLogger(
  process.env.NODE_ENV === 'production' ? prodTransport : devTransport,
);

/**
 * Extract the client IP in priority order:
 * x-forwarded-for (first value) -> x-real-ip -> 'unknown'.
 */
export function extractIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

export function generateCorrelationId(): string {
  return randomUUID();
}
