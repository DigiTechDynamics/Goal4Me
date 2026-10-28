/* eslint-disable no-console -- this module is the single place allowed to write to the console. */

type Level = "debug" | "info" | "warn" | "error";
type Context = Record<string, unknown>;

/**
 * Keys whose values must never be logged (health data and personal data).
 * In stage 6 the same redaction runs before events are sent to Sentry.
 */
const SENSITIVE_KEYS = /email|password|token|phone|weight|height|birth|bmi|name|note|amount/i;

export function redact(context: Context): Context {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      SENSITIVE_KEYS.test(key) ? "[redacted]" : value,
    ]),
  );
}

function write(level: Level, message: string, context?: Context): void {
  // Debug logs are dropped from production builds.
  if (level === "debug" && !__DEV__) return;
  const payload = context ? redact(context) : undefined;
  const line = `[goal4me] ${message}`;
  if (payload) console[level](line, payload);
  else console[level](line);
}

export const logger = {
  debug: (message: string, context?: Context) => write("debug", message, context),
  info: (message: string, context?: Context) => write("info", message, context),
  warn: (message: string, context?: Context) => write("warn", message, context),
  error: (message: string, context?: Context) => write("error", message, context),
};
