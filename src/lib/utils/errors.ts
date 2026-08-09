export function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return JSON.stringify(error);
}

export function toDebugMessage(error: unknown) {
  if (!error || typeof error !== 'object') return toErrorMessage(error);
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return toErrorMessage(error);
  }
}
