export function errorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const { message } = err as { message: unknown }
    if (typeof message === 'string' && message) return message
  }
  return fallback
}
