/** Persistencia local mínima (en la app nativa también funciona dentro del WebView). */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`iarecuerdo:${key}`)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
export function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(`iarecuerdo:${key}`, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}
