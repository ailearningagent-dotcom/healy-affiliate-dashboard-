/**
 * Structured Logger — replaces console.log in production code paths.
 *
 * Provides consistent log levels, prefixes, and environment-aware output.
 * In production, only warning and error are written to stderr.
 * In development, all levels are written to stdout/stderr.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isDev = process.env.NODE_ENV === "development";

function shouldLog(level: LogLevel): boolean {
  // In dev, log everything. In production, only warn+.
  return isDev ? true : LEVEL_PRIORITY[level] >= 2;
}

function formatMessage(module: string, level: LogLevel, message: string, data?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${module}]`;
  const dataStr = data ? ` ${JSON.stringify(data)}` : "";
  return `${prefix} ${message}${dataStr}`;
}

function write(level: LogLevel, module: string, message: string, data?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  const formatted = formatMessage(module, level, message, data);
  if (level === "error" || level === "warn") {
    console.error(formatted);
  } else {
    console.log(formatted);
  }
}

export const logger = {
  debug: (module: string, message: string, data?: Record<string, unknown>) => write("debug", module, message, data),
  info: (module: string, message: string, data?: Record<string, unknown>) => write("info", module, message, data),
  warn: (module: string, message: string, data?: Record<string, unknown>) => write("warn", module, message, data),
  error: (module: string, message: string, data?: Record<string, unknown>) => write("error", module, message, data),
};
