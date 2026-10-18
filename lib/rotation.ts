/**
 * Fair ordering for the three search slots (issue #112).
 * Within a group, a seeded shuffle is stable for one UTC hour and changes
 * with the next hour. Groups of three or fewer keep their incoming order.
 */

export function hourBucket(now: Date = new Date()): string {
  return now.toISOString().slice(0, 13)
}

export function rotationSeed(category: string, bucket: string): string {
  return `${category.trim().toLowerCase()}|${bucket}`
}

function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher-Yates. Returns a copy. Length 3 or fewer is returned in the same order. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const out = [...items]
  if (out.length <= 3) return out
  const next = mulberry32(hashSeed(seed))
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    const swap = out[i]
    out[i] = out[j]
    out[j] = swap
  }
  return out
}

function citySlug(value: string): string {
  return value.trim().toLowerCase().split(',')[0].trim()
}

/**
 * Town matches keep their relative order ahead of the rest of the open area.
 * Each group is rotated on its own. The area group uses a distinct seed so it
 * does not repeat the town group's permutation.
 */
export function orderByTownThenRotation<T extends { cities?: string[] | null }>(
  items: readonly T[],
  townSlug: string,
  seed: string
): T[] {
  const wanted = citySlug(townSlug)
  const town: T[] = []
  const rest: T[] = []
  for (const item of items) {
    const matches = (item.cities ?? []).some((city) => citySlug(city) === wanted)
    if (matches) town.push(item)
    else rest.push(item)
  }
  return [...seededShuffle(town, seed), ...seededShuffle(rest, `${seed}|area`)]
}
