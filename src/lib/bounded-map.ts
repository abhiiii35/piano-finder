/**
 * Insert into `map`, evicting the oldest entry first if `map` is already at
 * `maxSize`. Shared by every process-local cache/bucket keyed on
 * attacker-controlled input (IP, query string, etc.) so the Map itself can't
 * be grown without bound.
 */
export function boundedSet<K, V>(map: Map<K, V>, key: K, value: V, maxSize: number): void {
  if (!map.has(key) && map.size >= maxSize) {
    const oldestKey = map.keys().next().value;
    if (oldestKey !== undefined) map.delete(oldestKey);
  }
  map.set(key, value);
}
