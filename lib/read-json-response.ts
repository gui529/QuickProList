/** Parse fetch body safely; avoids `res.json()` on empty or non-JSON error pages. */
export async function readJsonResponse<T extends Record<string, unknown> = Record<string, unknown>>(
  res: Response
): Promise<T> {
  const raw = await res.text()
  if (!raw.trim()) {
    if (!res.ok) {
      throw new Error(res.statusText || `HTTP ${res.status}`)
    }
    return {} as T
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new Error(
      res.ok
        ? 'Server returned an invalid response'
        : res.statusText || `HTTP ${res.status}`
    )
  }
}
