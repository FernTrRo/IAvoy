import type { Reminder } from "../data/demo"

export const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,!?¿¡]/g, "").trim()
const words = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciseis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidos", "veintitres", "veinticuatro", "veinticinco", "veintiseis", "veintisiete", "veintiocho", "veintinueve"]
export function numbers(text: string) {
  let s = normalize(text).replace(/\buna?\b/g, "1")
  for (const [name, n] of [["treinta", 30], ["cuarenta", 40], ["cincuenta", 50]] as const) {
    s = s.replace(new RegExp(`\\b${name} y (${words.slice(1, 10).join("|")})\\b`, "g"), (_, unit: string) => String(n + words.indexOf(unit)))
    s = s.replace(new RegExp(`\\b${name}\\b`, "g"), String(n))
  }
  words.forEach((word, n) => { s = s.replace(new RegExp(`\\b${word}\\b`, "g"), String(n)) })
  return s
}

export function durationMinutes(text: string): number | null {
  const match = numbers(text).match(/\b(\d+)\s*(minutos?|horas?)\b/)
  if (!match) return null
  const value = Number(match[1]) * (match[2].startsWith("hora") ? 60 : 1)
  return value >= 1 && value <= 10080 ? value : null
}

/** Formato local para datetime-local, sin cambiar de zona horaria. */
export function localDateInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Gramática acotada: nunca adivinar AM/PM ni una fecha no reconocida. */
export function parseSpokenDate(text: string, now = new Date()): Date {
  const s = numbers(text)
  const duration = durationMinutes(s)
  if (/^(?:en|dentro de) /.test(s) && duration !== null) return new Date(now.getTime() + duration * 60000)
  if (!/^(hoy|manana|pasado manana) a (la|las) /.test(s)) throw new Error("Di, por ejemplo: mañana a las diez de la mañana, o dentro de cinco minutos.")
  const match = s.match(/a (?:la|las) (\d{1,2})(?::(\d{2})| y (\d{1,2}|media|cuarto))?(?: (?:de la|de el|del) (manana|tarde|noche|madrugada))?$/)
  if (!match) throw new Error("No entendí la hora completa. Prueba: mañana a las diez de la mañana.")
  let hour = Number(match[1])
  const minute = match[2] ? Number(match[2]) : match[3] === "media" ? 30 : match[3] === "cuarto" ? 15 : Number(match[3] ?? 0)
  if (hour > 23 || minute > 59) throw new Error("Esa hora no es válida.")
  const period = match[4]
  if (hour >= 1 && hour <= 12 && !period) throw new Error("Indica si es de la mañana, tarde o noche.")
  if (period && (hour < 1 || hour > 12)) throw new Error("Con mañana o tarde, usa una hora entre una y doce.")
  if (period === "noche" && hour < 6) throw new Error("Para la noche, indica una hora entre seis y doce. ¿Te refieres a la madrugada?")
  if (period === "madrugada" && hour > 6 && hour !== 12) throw new Error("Para la madrugada, indica las doce o una hora entre una y seis. ¿Te refieres a la mañana?")
  if (period) hour = hour % 12 + (period === "tarde" || (period === "noche" && hour !== 12) ? 12 : 0)
  const date = new Date(now)
  date.setDate(date.getDate() + (s.startsWith("pasado manana") ? 2 : s.startsWith("manana") ? 1 : 0))
  date.setHours(hour, minute, 0, 0)
  if (date.getTime() <= now.getTime()) throw new Error("Esa hora ya pasó. Indica una fecha futura.")
  return date
}

export function dueAt(r: Reminder) {
  if (r.done || r.cancelled) return Infinity
  if (r.nextAlertAt) return new Date(r.nextAlertAt).getTime()
  if (r.notified) return Infinity
  return new Date(r.when).getTime() - (r.advanceMinutes ?? 0) * 60000
}

export function acknowledge(r: Reminder, now = Date.now()): Reminder {
  const early = new Date(r.when).getTime() > now
  if (!early && r.recurrence && r.recurrence !== "once") return completeReminder(r, new Date(now))
  return { ...r, notified: !early, nextAlertAt: early ? r.when : undefined }
}

export function completeReminder(r: Reminder, now = new Date()): Reminder {
  if (!r.recurrence || r.recurrence === "once") return { ...r, done: true, nextAlertAt: undefined }
  const next = new Date(r.when)
  const days = r.recurrence === "daily" ? 1 : 7
  do { next.setDate(next.getDate() + days) } while (next.getTime() <= now.getTime())
  return { ...r, when: next.toISOString(), done: false, notified: false, nextAlertAt: undefined }
}
