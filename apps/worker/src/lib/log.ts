type LogValue = boolean | number | string | null | undefined;

type LogMeta = Record<string, LogValue>;

function formatMeta(meta?: LogMeta) {
  if (!meta) {
    return "";
  }

  const entries = Object.entries(meta).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return "";
  }

  return ` ${entries.map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(" ")}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export function logWorker(message: string, meta?: LogMeta) {
  console.log(`[worker] ${message}${formatMeta(meta)}`);
}

export function warnWorker(message: string, meta?: LogMeta) {
  console.warn(`[worker] ${message}${formatMeta(meta)}`);
}

export function errorWorker(message: string, error: unknown, meta?: LogMeta) {
  console.error(`[worker] ${message}${formatMeta({ ...meta, error: getErrorMessage(error) })}`);
}
