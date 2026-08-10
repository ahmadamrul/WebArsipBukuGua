export function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  try {
    const serialized = JSON.stringify(error);
    return serialized && serialized !== '{}' ? serialized : String(error);
  } catch {
    return String(error);
  }
}

export function toDebugMessage(error: unknown) {
  if (!error || typeof error !== 'object') return toErrorMessage(error);
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return toErrorMessage(error);
  }
}
