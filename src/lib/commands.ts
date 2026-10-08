import { normalize, numbers, parseSpokenDate, durationMinutes } from "./reminders.ts"
import type { Reminder } from "../data/demo"

export function speechText(text: string) {
  return normalize(text).replace(/\b(yutu|yutub|you tube|youtube)\b/g, "youtube")
    .replace(/\b(wasa|guasap|guasapp|wasap|wasapp|whats|whats app|whatsapp)\b/g, "whatsapp")
    .replace(/\s+/g, " ").replace(/^(?:oye |por favor |puedes |podrias |quiero |quisiera |me gustaria )+/, "")
    .replace(/ por favor$/, "").trim()
}
export type Intent = "new" | "reminders" | "guides" | "profile" | "home" | "back" | "next" | "repeat" | "slow" | "pause" | "save" | "yes" | "no" | "done" | "later" | "silence" | "cancel" | "help" | "close"
const phrases: Record<Intent, RegExp> = {
  new: /^(?:(?:crear|crea|creame|nuevo|nueva|hacer|haz|hazme|agregar|agrega|anadir|anade|poner|pon|ponme|registrar|registra|decir) (?:un |una |otro |otra )?(?:aviso|recordatorio|alarma)|recuerdame|recordarme)(?:\s|$)/,
  reminders: /^(?:(?:ver|abre|abrir|muestra|muestrame|consultar) )?(?:(?:mis|los) )?(?:avisos|recordatorios|pendientes)$|^que (?:tengo pendiente|tengo que hacer)$/,
  guides: /^(?:(?:ver|abre|abrir|muestra|muestrame|continuar) )?(?:mis |las )?(?:guias|actividades|aprendizajes)$|^(?:aprender|aprender algo|aprender algo nuevo)$/,
  profile: /^(?:(?:ver|abre|abrir|cambiar|configurar) )?(?:mi |el )?(?:perfil|perfil y tutor|configuracion|tutor|ajustes)$/,
  home: /^(?:inicio|ir al inicio|volver al inicio|regresar al inicio|pantalla principal|pagina principal|home|casa|menu principal)$/,
  back: /^(?:atras|volver|vuelve|regresar|regresa|anterior|paso anterior|retroceder|retrocede|vuelve atras|volver al paso anterior|vuelve al paso anterior|regresar al paso anterior)$/,
  next: /^(?:siguiente|sigue|continua|continuar|avanza|avanzar|adelante|siguiente paso|otro paso|ya esta|ya lo hice)$/,
  repeat: /^(?:repite|repetir|repitelo|otra vez|de nuevo|no entendi|no escuche|escuchar|leer|leelo|dilo otra vez|explicame otra vez)$/,
  slow: /^(?:mas despacio|mas lento|despacio|habla mas lento|repite despacio|repite mas despacio)$/,
  pause: /^(?:pausa|pausar|parar|detener|descansar|continuar despues|luego sigo|hasta aqui|dejalo para despues)$/,
  save: /^(?:guardar|guarda|guardalo|guardar aviso|guardar recordatorio|guardar perfil|si guardar|confirmar|confirma|confirmado|asi esta bien)$/,
  yes: /^(?:si|si quiero|si cancelar|si salir|de acuerdo|aceptar|acepto|adelante)$/,
  no: /^(?:no|no gracias|mejor no|no cancelar|conservar|no salir)$/,
  done: /^(?:listo|termine|terminar|terminado|hecho|ya lo hice|ya termine|completado)$/,
  later: /^(?:mas tarde|luego|despues|posponer|pospon|aplazar|aplaza|avisame despues|recuerdame despues)(?:\s|$)/,
  silence: /^(?:silenciar|silencio|callar|callate|deja de hablar|no repitas|silenciar este aviso)$/,
  cancel: /^(?:cancelar|cancela|salir|descartar|olvidalo|no lo guardes)$/,
  help: /^(?:ayuda|ayudame|necesito ayuda)$/,
  close: /^(?:cerrar|cierra|cerrar ayuda|cerrar ventana|salir)$/,
}
export const isIntent = (text: string, intent: Intent) => phrases[intent].test(speechText(text))
export function guideTopic(text: string): string | null {
  const s = speechText(text)
  if (/\b(videollamada|video llamada|videollamadas)\b/.test(s)) return "videollamada"
  if (/\b(youtube|videos?)\b/.test(s)) return "youtube"
  if (/\b(whatsapp|audios?|notas? de voz|mensajes? de voz)\b/.test(s)) return "whatsapp-nota"
  return null
}
/**
 * Detecta "quiero aprender a…", "enséñame a…", "cómo se…" y devuelve el tema.
 * speechText ya quita "quiero", "me gustaría", etc., por eso empieza en "aprender".
 */
export function learnRequest(text: string): string | null {
  const m = speechText(text).match(/^(?:aprender(?: a\b| como\b)?|ensename(?: a\b| como\b)?|explicame como|como (?:se |puedo )?)\s*(.+)$/)
  if (!m || /^algo(?: nuevo)?$/.test(m[1])) return null
  return m[1].trim() || null
}
export function reminderTarget(text: string) {
  const m = speechText(text).match(/^(modificar|modifica|editar|edita|cambiar|cambia|cancelar|cancela|quitar|quita|eliminar|elimina|borrar|borra) (?:el |mi )?(?:(?:aviso|recordatorio) (?:de |para )?)?(.+)$/)
  return m ? { action: /^(cancel|quit|elimin|borr)/.test(m[1]) ? "cancel" : "edit", name: m[2] } : null
}

type Draft = { text?: string; when?: string; recurrence?: Reminder["recurrence"]; advanceMinutes?: number }
export type ReminderContext = { day?: string; time?: string; recurrence?: Reminder["recurrence"] }
export type ParsedReminder = { patch: Draft; questions: string[]; context?: ReminderContext }
export function reminderConfirmation(raw: string): "save" | "change" | null {
  const s = speechText(raw)
  if (/^(?:no|no gracias|mejor no|todavia no|no lo guardes|no guardar|no quiero guardar|cambiarlo|cambiar algo)$/.test(s)) return "change"
  if (isIntent(s, "yes") || isIntent(s, "save") || /^(?:si )+(?:guardalo|guarda|guardar|guardalo asi|por favor)$/.test(s)) return "save"
  return null
}
/** Extrae varios campos, conserva los entendidos y solicita cualquier precisión faltante. */
export function parseReminderRequest(raw: string, now = new Date(), previous: ReminderContext = {}): ParsedReminder {
  let s = speechText(raw)
  const patch: Draft = {}
  const questions: string[] = []
  s = s.replace(/^(?:(?:crear|crea|creame|hacer|haz|hazme|agregar|agrega|anadir|anade|poner|pon|ponme|nuevo|nueva|registrar|registra) (?:un |una )?(?:aviso|recordatorio|alarma)(?: para| de)?|recuerdame|recordarme|avisame)\s*/, "")
  s = s.replace(/\bal rato\b/g, "").replace(/\b(?:como|aproximadamente) (?=a (?:la|las) )/g, "")
  // Recurrencia antes de extraer el día: “cada mañana” expresa una frecuencia.
  if (/\b(cada dia|todos los dias|diariamente|a diario|cada manana)\b/.test(s)) {
    patch.recurrence = "daily"
    s = s.replace(/\b(cada dia|todos los dias|diariamente|a diario|cada manana)\b/, "").trim()
  } else if (/\b(cada semana|todas las semanas|semanalmente)\b/.test(s)) {
    patch.recurrence = "weekly"; s = s.replace(/\b(cada semana|todas las semanas|semanalmente)\b/, "").trim()
  } else if (/\b(una sola vez|solo una vez|sin repetir)\b/.test(s)) {
    patch.recurrence = "once"; s = s.replace(/\b(una sola vez|solo una vez|sin repetir)\b/, "").trim()
  }
  if (/\b(sin anticipacion|a la hora exacta|sin avisar antes)\b/.test(s)) {
    patch.advanceMinutes = 0; s = s.replace(/\b(sin anticipacion|a la hora exacta|sin avisar antes)\b/, "")
  }
  const lead = s.match(/(?:y )?(?:avisame |avisar |con )?([\w\s]+?) (minutos?|horas?) (?:antes|de anticipacion)\b/)
  if (lead) {
    // Tomar solo el número final para no consumir el título o la hora anterior.
    const exact = numbers(lead[0]).match(/(\d+) (minutos?|horas?) (?:antes|de anticipacion)/)
    if (exact) {
      const minutes = durationMinutes(exact[0])
      if (minutes === null) questions.push("La anticipación debe ser entre un minuto y siete días.")
      else patch.advanceMinutes = minutes
      const wordsLead = s.match(/(?:y )?(?:avisame |avisar |con )?((?:\d+|una?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciseis|diecisiete|dieciocho|diecinueve|veinte|veinti\w+|treinta(?: y \w+)?|cuarenta(?: y \w+)?|cincuenta(?: y \w+)?)) (?:minutos?|horas?) (?:antes|de anticipacion)/)
      if (wordsLead) s = s.replace(wordsLead[0], "")
    } else questions.push("No entendí cuánto tiempo antes. Indica los minutos de anticipación.")
  }
  s = s.replace(/\bpor la (manana|tarde|noche|madrugada)\b/g, "de la $1")
    .replace(/\b(a\.?\s*m\.?)\b/g, "de la manana").replace(/\b(p\.?\s*m\.?)\b/g, "de la tarde")
    .replace(/\s+/g, " ").trim()
  const day = [...s.matchAll(/\b(pasado manana|manana|hoy)\b/g)].find(m => !s.slice(0, m.index).endsWith("de la "))
  const explicitDay = day?.[1] ?? previous.day ?? null
  const relative = s.match(/\b(?:dentro de|en) (?:\d+|[a-z]+(?: y [a-z]+)?) (?:minutos?|horas?)\b/)
  const time = s.match(/\ba (?:la|las) (?:\d{1,2}(?::\d{2})?|[a-z]+)(?: y (?:\d{1,2}|[a-z]+(?: y [a-z]+)?))?(?: de la (?:manana|tarde|noche|madrugada))?\b/)
  const period = s.match(/^(?:de la )?(manana|tarde|noche|madrugada)$/)
  const clock = time?.[0] ?? (period && previous.time ? `${previous.time.replace(/ de la \w+$/, "")} de la ${period[1]}` : previous.time)
  const context: ReminderContext = { day: explicitDay ?? undefined, time: clock, recurrence: patch.recurrence ?? previous.recurrence }
  if (relative) {
    try { patch.when = parseSpokenDate(relative[0], now).toISOString() } catch (e) { questions.push((e as Error).message) }
    s = s.replace(relative[0], "")
    context.day = undefined; context.time = undefined
  } else if (clock) {
    try {
      let candidate = parseSpokenDate(`${explicitDay ?? "hoy"} ${clock}`, now)
      patch.when = candidate.toISOString()
    } catch (e) {
      if (!explicitDay && context.recurrence && context.recurrence !== "once" && (e as Error).message.includes("ya pasó")) {
        patch.when = parseSpokenDate(`manana ${clock}`, now).toISOString()
      } else questions.push((e as Error).message)
    }
    if (!explicitDay && (!context.recurrence || context.recurrence === "once")) { delete patch.when; questions.push("¿Para qué día: hoy o mañana?") }
    if (time) s = s.replace(time[0], "")
    if (period && previous.time) s = ""
  }
  if (day) s = s.replace(new RegExp(`\\b${day[1]}\\b`), "")
  // Expresiones de calendario aún no soportadas no se guardan como parte de la tarea.
  if (/\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo|mensual|cada mes|cada \d+|el \d+ de)\b/.test(numbers(s))) questions.push("Necesito precisar esa fecha o frecuencia. Puedes usar el calendario y las opciones de repetición.")
  s = s.replace(/^(?:para |de |que )/, "").replace(/(?:\s+y|\s+para|\s+el|\s+a partir de)+$/, "").trim()
  s = s.replace(/\s+/g, " ").trim()
  if (s && !/^(hoy|manana|pasado manana|a las?|de la (manana|tarde|noche))$/.test(s)) patch.text = s.charAt(0).toUpperCase() + s.slice(1)
  return { patch, questions, context }
}
