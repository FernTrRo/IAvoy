/**
 * Capa de voz.
 * - En el teléfono (Capacitor) usa los motores nativos de Android: TextToSpeech y SpeechRecognizer.
 * - En el navegador usa Web Speech API (útil para desarrollar y para la demo).
 * El micrófono solo se activa cuando la persona toca el botón (nunca escucha de fondo).
 */
import { Capacitor } from "@capacitor/core"
import { TextToSpeech } from "@capacitor-community/text-to-speech"
import { SpeechRecognition } from "@capacitor-community/speech-recognition"

const LANG = "es-MX"
const isNative = Capacitor.isNativePlatform()
let activeRecognition: WebRecognition | undefined
let cancelRecognition: (() => void) | undefined
let listenVersion = 0
export async function stopListening() {
  listenVersion++
  cancelRecognition?.()
  if (isNative) await SpeechRecognition.stop()
  else activeRecognition?.stop()
}

/* ---------- Texto a voz ---------- */

export function canSpeak() {
  return isNative || (typeof window !== "undefined" && "speechSynthesis" in window)
}

/* ---------- Selección de voz (web) ---------- */

let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null

/** Las voces cargan de forma asíncrona: espera a que estén listas. */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (voicesPromise) return voicesPromise
  voicesPromise = new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const synth = window.speechSynthesis
    const now = synth.getVoices()
    if (now.length) return resolve(now)
    const done = () => resolve(synth.getVoices())
    synth.addEventListener("voiceschanged", done, { once: true })
    setTimeout(done, 1500)
  }).then((v) => {
    if (!v.length) voicesPromise = null // reintentar la próxima vez
    return v
  })
  return voicesPromise
}

/** Más puntos = voz más natural. */
function scoreVoice(v: SpeechSynthesisVoice) {
  const name = v.name.toLowerCase()
  let s = 0
  if (/natural|neural/.test(name)) s += 100 // voces neuronales (Edge)
  else if (name.includes("online")) s += 80
  else if (name.includes("google")) s += 50 // voces en línea de Chrome
  if (v.lang === "es-MX") s += 30
  else if (v.lang === "es-US" || v.lang === "es-419") s += 20
  else if (v.lang === "es-ES") s += 10
  return s
}

async function pickSpanishVoice(): Promise<SpeechSynthesisVoice | undefined> {
  const voices = (await loadVoices()).filter((v) => v.lang.toLowerCase().startsWith("es"))
  // Para forzar una voz en pruebas: localStorage.setItem("iarecuerdo:voz", "Nombre exacto")
  const forced = localStorage.getItem("iarecuerdo:voz")
  return voices.find((v) => v.name === forced) ?? voices.sort((a, b) => scoreVoice(b) - scoreVoice(a))[0]
}

export async function speak(text: string, { rate = 0.9 }: { rate?: number } = {}) {
  if (isNative) {
    await TextToSpeech.stop()
    await TextToSpeech.speak({ text, lang: LANG, rate, pitch: 1, volume: 1, category: "playback" })
    return
  }
  if (!("speechSynthesis" in window)) throw new Error("Este dispositivo no puede leer en voz alta.")
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voice = await pickSpanishVoice()
  if (voice) u.voice = voice
  u.lang = voice?.lang ?? LANG
  u.rate = rate
  await new Promise<void>((resolve, reject) => {
    u.onend = () => resolve()
    u.onerror = (e) => (e.error === "interrupted" || e.error === "canceled" ? resolve() : reject(e))
    synth.speak(u)
  })
}

export async function stopSpeaking() {
  if (isNative) return TextToSpeech.stop()
  if ("speechSynthesis" in window) window.speechSynthesis.cancel()
}

/* ---------- Voz a texto ---------- */

type WebRecognition = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

function getWebRecognition(): (new () => WebRecognition) | undefined {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => WebRecognition) | undefined
}

export function canListen() {
  return isNative || !!getWebRecognition()
}

/** Escucha una sola frase y devuelve el texto. */
export async function listenOnce(): Promise<string> {
  const version = ++listenVersion
  if (isNative) {
    const { available } = await SpeechRecognition.available()
    if (!available) throw new Error("El reconocimiento de voz no está disponible en este teléfono.")
    if (version !== listenVersion) return ""
    const perm = await SpeechRecognition.requestPermissions()
    if (perm.speechRecognition !== "granted") throw new Error("Hace falta permiso para usar el micrófono.")
    if (version !== listenVersion) return ""
    return new Promise<string>((resolve, reject) => {
      const finish = (text: string, error?: Error) => {
        clearTimeout(timeout)
        if (cancelRecognition === cancel) cancelRecognition = undefined
        if (error) reject(error); else resolve(text)
      }
      const cancel = () => finish("")
      // Las pausas son normales al hablar despacio: dejamos hasta 45 s en total.
      const timeout = setTimeout(() => { void SpeechRecognition.stop(); finish("", new Error("Se agotó la escucha. Toca el micrófono para intentarlo otra vez.")) }, 45000)
      cancelRecognition = cancel
      SpeechRecognition.start({ language: LANG, maxResults: 1, partialResults: false, popup: false })
        .then(res => finish(res.matches?.[0] ?? ""), error => finish("", error instanceof Error ? error : new Error("No se pudo escuchar.")))
    })
  }
  const Ctor = getWebRecognition()
  if (!Ctor) throw new Error("Este navegador no puede escuchar. Prueba en Chrome o Edge, o escribe el aviso.")
  const rec = new Ctor()
  activeRecognition = rec
  rec.lang = LANG
  rec.interimResults = false
  rec.maxAlternatives = 1
  return new Promise<string>((resolve, reject) => {
    let text = ""
    let settled = false
    let graceTimer: ReturnType<typeof setTimeout> | undefined
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (graceTimer) clearTimeout(graceTimer)
      if (activeRecognition === rec) activeRecognition = undefined
      if (cancelRecognition === cancel) cancelRecognition = undefined
      if (error) reject(error); else resolve(text)
    }
    const cancel = () => { text = ""; rec.stop(); finish() }
    // SpeechRecognition termina al detectar silencio; esperamos cinco segundos
    // antes de cerrar para que la persona pueda pensar y continuar con calma.
    const timeout = setTimeout(() => { rec.stop(); finish(new Error("Se agotó el tiempo de escucha. Inténtalo otra vez.")) }, 45000)
    cancelRecognition = cancel
    rec.onresult = e => { text = e.results[0]?.[0]?.transcript ?? "" }
    rec.onerror = e => finish(new Error(e.error === "not-allowed" ? "Hace falta permiso para usar el micrófono." : "No se escuchó bien. Intenta otra vez."))
    rec.onend = () => {
      if (settled) return
      graceTimer = setTimeout(() => finish(), 5000)
    }
    try { rec.start() } catch (error) { finish(error instanceof Error ? error : new Error("No se pudo iniciar el micrófono.")) }
  })
}
