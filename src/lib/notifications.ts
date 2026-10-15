/**
 * Notificaciones del sistema para los avisos, como una app de recordatorios del teléfono.
 *
 * - En el teléfono o emulador (Capacitor): notificaciones nativas de Android con @capacitor/local-notifications.
 *   Llegan aunque la app esté cerrada, suenan, vibran y traen los botones "Listo" y "Más tarde".
 * - En el navegador: notificaciones del sistema (Windows/macOS) mientras la pestaña está abierta.
 *   Sirve para probar y presentar sin emulador.
 */
import { Capacitor } from "@capacitor/core"
import { LocalNotifications } from "@capacitor/local-notifications"
import type { Reminder } from "@/data/demo"
import { dueAt } from "@/lib/reminders"

const isNative = Capacitor.isNativePlatform()
const CHANNEL = "avisos"
const ACTION_TYPE = "aviso"
/** Android permite un número limitado de alarmas programadas por app. */
const MAX_SCHEDULED = 50

export type NotificationHandlers = {
  /** Tocó "Listo" en la notificación. */
  onDone: (reminderId: string) => void
  /** Tocó "Más tarde". */
  onLater: (reminderId: string) => void
  /** Tocó la notificación: se abre la app y se muestra el aviso. */
  onOpen: (reminderId: string) => void
}

let handlers: NotificationHandlers | null = null

/** Android pide números enteros como id: se calcula uno fijo a partir del id del aviso. */
function numericId(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0
  return Math.abs(h) % 2_000_000_000 || 1
}

/** Lo que dice la notificación. */
function texts(r: Reminder) {
  const early = (r.advanceMinutes ?? 0) > 0 && !r.nextAlertAt && new Date(r.when).getTime() > dueAt(r)
  return {
    title: r.text,
    body: early ? `En ${r.advanceMinutes} minutos. Toca para verlo.` : "Es hora. ¿Ya lo hiciste?",
  }
}

/* ---------- Preparación ---------- */

/** Se llama una vez al abrir la app. Devuelve una función para limpiar. */
export async function setupNotifications(h: NotificationHandlers): Promise<() => void> {
  handlers = h
  if (!isNative) return () => { handlers = null }

  // Canal de Android con importancia máxima: aparece arriba de la pantalla, suena y vibra.
  await LocalNotifications.createChannel({
    id: CHANNEL,
    name: "Avisos",
    description: "Recordatorios que creaste en IAvoy",
    importance: 5,
    visibility: 1,
    vibration: true,
  }).catch(() => {})

  // Botones dentro de la notificación.
  await LocalNotifications.registerActionTypes({
    types: [{ id: ACTION_TYPE, actions: [{ id: "done", title: "Listo" }, { id: "later", title: "Más tarde" }] }],
  }).catch(() => {})

  const listener = await LocalNotifications.addListener("localNotificationActionPerformed", ({ actionId, notification }) => {
    const reminderId = notification.extra?.reminderId as string | undefined
    if (!reminderId || !handlers) return
    if (actionId === "done") handlers.onDone(reminderId)
    else if (actionId === "later") handlers.onLater(reminderId)
    else handlers.onOpen(reminderId) // tocó la notificación ("tap")
  })
  return () => { handlers = null; void listener.remove() }
}

/* ---------- Permisos ---------- */

/** Revisa si ya hay permiso, sin preguntar. */
export async function hasPermission() {
  if (isNative) return (await LocalNotifications.checkPermissions()).display === "granted"
  return typeof Notification !== "undefined" && Notification.permission === "granted"
}

/**
 * Pide permiso para mostrar notificaciones. Se llama al guardar un aviso,
 * cuando la persona entiende para qué es (no al abrir la app por primera vez).
 */
export async function requestPermission() {
  if (isNative) {
    const status = await LocalNotifications.checkPermissions()
    if (status.display === "granted") return true
    return (await LocalNotifications.requestPermissions()).display === "granted"
  }
  if (typeof Notification === "undefined") return false
  if (Notification.permission === "granted") return true
  if (Notification.permission === "denied") return false
  return (await Notification.requestPermission()) === "granted"
}

/* ---------- Programar ---------- */

const webTimers = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * Deja programadas exactamente las notificaciones de los avisos pendientes.
 * Se llama cada vez que cambian los avisos (nuevo, editado, hecho, pospuesto o cancelado).
 */
export async function syncNotifications(reminders: Reminder[]) {
  const now = Date.now()
  const upcoming = reminders
    .map((r) => ({ r, at: dueAt(r) }))
    .filter(({ at }) => Number.isFinite(at) && at > now)
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX_SCHEDULED)

  if (isNative) {
    try {
      const pending = await LocalNotifications.getPending()
      if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) })
      if (!upcoming.length || !(await hasPermission())) return
      await LocalNotifications.schedule({
        notifications: upcoming.map(({ r, at }) => ({
          id: numericId(r.id),
          ...texts(r),
          schedule: { at: new Date(at), allowWhileIdle: true },
          channelId: CHANNEL,
          actionTypeId: ACTION_TYPE,
          extra: { reminderId: r.id },
        })),
      })
    } catch (e) {
      // Se muestra siempre (también en el APK) para poder revisarlo con chrome://inspect.
      console.warn("[Avisos] No se pudieron programar las notificaciones.", e)
    }
    return
  }

  // Navegador: un temporizador por aviso de las próximas 24 horas.
  webTimers.forEach(clearTimeout)
  webTimers.clear()
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return
  for (const { r, at } of upcoming) {
    const delay = at - now
    if (delay > 24 * 60 * 60 * 1000) break
    webTimers.set(r.id, setTimeout(() => {
      const n = new Notification(texts(r).title, { body: texts(r).body, tag: r.id, requireInteraction: true, icon: "/icon.svg" })
      n.onclick = () => { window.focus(); handlers?.onOpen(r.id); n.close() }
    }, delay))
  }
}

/* ---------- Prueba ---------- */

/**
 * Prueba de notificaciones: muestra una al instante y programa otra a los 10 segundos.
 * Devuelve un mensaje que explica qué pasó, para mostrarlo en pantalla.
 */
export async function testNotification(): Promise<{ ok: boolean; message: string }> {
  try {
    if (!(await requestPermission())) {
      return { ok: false, message: "Falta el permiso. Ve a Ajustes → Aplicaciones → IAvoy → Notificaciones y actívalas." }
    }
    if (!isNative) {
      new Notification("Prueba de IAvoy", { body: "Así se verán tus avisos.", icon: "/icon.svg" })
      return { ok: true, message: "Listo. En la computadora solo llegan con esta pestaña abierta." }
    }
    // Por si el canal no existía todavía.
    await LocalNotifications.createChannel({ id: CHANNEL, name: "Avisos", description: "Recordatorios que creaste en IAvoy", importance: 5, visibility: 1, vibration: true })
    let exact = "granted"
    try { exact = (await LocalNotifications.checkExactNotificationSetting()).exact_alarm } catch { /* Android viejo: no aplica */ }

    await LocalNotifications.schedule({
      notifications: [
        { id: 2_000_000_101, title: "Prueba de IAvoy", body: "Esta llegó al instante.", channelId: CHANNEL },
        {
          id: 2_000_000_102, title: "Prueba de IAvoy", body: "Esta llegó a los 10 segundos.", channelId: CHANNEL,
          actionTypeId: ACTION_TYPE, schedule: { at: new Date(Date.now() + 10_000), allowWhileIdle: true },
        },
      ],
    })
    const pending = (await LocalNotifications.getPending()).notifications.length
    const warning = exact !== "granted" ? " Ojo: falta activar «Alarmas y recordatorios», por eso pueden llegar tarde." : ""
    return { ok: true, message: `Enviada. Debe llegar una ahora y otra en 10 segundos; puedes cerrar la app para verla. Programadas: ${pending}.${warning}` }
  } catch (e) {
    console.warn("[Avisos] Falló la prueba de notificaciones.", e)
    return { ok: false, message: `Android no dejó mostrarla: ${(e as Error)?.message ?? e}` }
  }
}