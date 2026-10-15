/**
 * Generación de guías con IA 
 */
import type { Guide } from "@/data/demo"
import { APPS, withImages } from "@/lib/images"

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const MODEL = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) ?? "gemini-3.5-flash"
/** Opcional: un modelo de respaldo preferido en .env.local. */
const FALLBACK_MODEL = import.meta.env.VITE_GEMINI_FALLBACK_MODEL as string | undefined
/**
 * Modelos con nivel gratuito. Cada uno tiene su propia capacidad en los servidores de Google:
 * si uno está saturado (503), probar OTRO modelo suele funcionar, mejor que reintentar el mismo.
 */
const FREE_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.1-flash-lite"]
const MODELS = [...new Set([MODEL, ...(FALLBACK_MODEL ? [FALLBACK_MODEL] : []), ...FREE_MODELS])]
const endpoint = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

export const aiAvailable = () => !!API_KEY

/** Lo que la IA sabe de la persona. Solo se envía lo necesario: nunca nombre ni teléfonos. */
export type AiContext = { phoneModel: string; routine: string }

export type TopicSuggestion = { title: string; why: string }

const SYSTEM = `Eres el asistente de IAvoy, una app que enseña a personas mayores en México a usar su teléfono.
Escribe en español de México, con palabras sencillas, trato de "tú", cálido y paciente.
Nunca uses palabras técnicas sin explicarlas (por ejemplo, di "el ícono" en lugar de "la app launcher").
Cada paso debe ser UNA sola acción que se pueda hacer con un dedo.
Describe los botones por su color, forma y lugar en la pantalla.
Si el modelo de teléfono es conocido, adapta los pasos a ese teléfono (Android o iPhone).
La persona puede escribir los nombres de las aplicaciones como suenan o con errores (por ejemplo: wasap o guasap = WhatsApp, yutu = YouTube, istagram = Instagram, el feis = Facebook, el maps = Google Maps). Interprétalos y usa siempre el nombre correcto en la guía.
Seguridad: nunca pidas escribir contraseñas, NIP, códigos de verificación ni datos de tarjetas.
Si el tema toca dinero, bancos o compras, agrega un paso que recuerde no compartir códigos con nadie.
Los textos se leerán en voz alta: usa buena puntuación y signos de interrogación completos (¿…?).
Cada paso lleva una imagen de apoyo: indica la aplicación si el paso trata de abrirla o reconocerla, y palabras clave simples para buscar un pictograma de la acción.`

/* ---------- llamada genérica ---------- */

/** Espera unos segundos, pero se interrumpe si la persona cancela. */
function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Cancelado", "AbortError"))
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Cancelado", "AbortError")) }, { once: true })
  })
}

/**
 * Errores con los que conviene probar el siguiente modelo:
 * saturado (503), interno (500), límite de ese modelo (429) o modelo inexistente/retirado (404).
 */
const TEMPORARY = new Set([404, 429, 500, 503])

async function callGemini<T>(prompt: string, schema: object, signal?: AbortSignal): Promise<T> {
  if (!API_KEY) throw new Error("Falta configurar la llave de la IA.")
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.4,
    },
  })

  // Hasta 6 intentos: un modelo distinto cada vez y, al final, otra vez el principal.
  const attempts = [...MODELS.slice(0, 5), MODEL]
  let lastStatus = 0
  let res: Response | undefined
  for (let i = 0; i < attempts.length; i++) {
    if (i > 0) await wait(i < 5 ? 800 : 4000, signal)
    try {
      res = await fetch(endpoint(attempts[i]), {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
        body,
      })
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e
      throw new Error("No hay conexión a internet. Intenta más tarde.")
    }
    if (res.ok) break
    lastStatus = res.status
    if (!TEMPORARY.has(res.status)) break
    if (import.meta.env.DEV) console.warn(`[IA] ${attempts[i]} respondió ${res.status}.${attempts[i + 1] ? ` Probando con ${attempts[i + 1]}…` : ""}`)
  }

  if (!res?.ok) {
    if (lastStatus === 429) throw new Error("Se alcanzó el límite gratuito de la IA. Espera un minuto e intenta otra vez.")
    if (TEMPORARY.has(lastStatus) || lastStatus === 0) throw new Error("El servicio de la IA está saturado en este momento. Intenta otra vez en unos minutos.")
    if (lastStatus === 400 || lastStatus === 403) throw new Error("La IA rechazó la petición. Revisa la llave en .env.local.")
    throw new Error("No se pudo crear la guía. Intenta otra vez.")
  }

  const data = await res.json()
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error("La IA no dio una respuesta. Intenta con otras palabras.")
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error("La respuesta llegó incompleta. Intenta otra vez.")
  }
}

const contextText = (ctx: AiContext) =>
  [
    ctx.phoneModel.trim() && `Su teléfono es: ${ctx.phoneModel.trim()}.`,
    ctx.routine.trim() && `Su rutina, gustos y necesidades: ${ctx.routine.trim()}`,
  ]
    .filter(Boolean)
    .join("\n") || "No hay más datos de la persona."

const clean = (s: unknown, max: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max)

const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)

/* ---------- 1. Sugerir temas a partir de la rutina ---------- */

const topicsSchema = {
  type: "OBJECT",
  properties: {
    topics: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING", description: "Lo que aprenderá, empezando con verbo. Máximo 8 palabras." },
          why: { type: "STRING", description: "Por qué le sirve, en una frase corta." },
        },
        required: ["title", "why"],
      },
    },
  },
  required: ["topics"],
}

export async function suggestTopics(ctx: AiContext, existingTitles: string[], signal?: AbortSignal) {
  const prompt = `${contextText(ctx)}

Propón 4 cosas que esta persona podría aprender a hacer con su teléfono y que le ayuden en su vida diaria.
Deben ser tareas concretas y sencillas (por ejemplo: "Pedir una cita médica por WhatsApp").
No repitas estas, que ya tiene: ${existingTitles.join("; ") || "ninguna"}.`

  const out = await callGemini<{ topics: TopicSuggestion[] }>(prompt, topicsSchema, signal)
  return (out.topics ?? [])
    .map((t) => ({ title: clean(t.title, 80), why: clean(t.why, 160) }))
    .filter((t) => t.title)
    .slice(0, 4)
}

/* ---------- 2. Crear una guía paso a paso ---------- */

const stepSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING", description: "La acción del paso, máximo 6 palabras." },
    body: { type: "STRING", description: "Cómo hacerlo, máximo 2 frases cortas." },
    app: {
      type: "STRING",
      description: `Si el paso es abrir o reconocer una aplicación, su identificador: ${Object.keys(APPS).join(", ")}. Si no, escribe "ninguna".`,
    },
    keywords: {
      type: "ARRAY",
      description: "De 1 a 3 palabras sueltas en español para buscar un pictograma que ilustre la acción del paso. Usa palabras simples y concretas, de la más precisa a la más general (por ejemplo: micrófono, hablar, teléfono).",
      items: { type: "STRING" },
    },
  },
  required: ["title", "body", "app", "keywords"],
}

const stepsSchema = { type: "ARRAY", description: "Entre 3 y 8 pasos.", items: stepSchema }

const guideSchema = {
  type: "OBJECT",
  properties: {
    suitable: {
      type: "BOOLEAN",
      description: "false si el tema no es algo que se aprenda a hacer con el teléfono, es peligroso o no es apropiado.",
    },
    message: { type: "STRING", description: "Si suitable es false, explica amablemente por qué, en una frase." },
    title: { type: "STRING", description: "Título de la guía, empezando con verbo. Máximo 8 palabras." },
    steps: stepsSchema,
  },
  required: ["suitable", "title", "steps"],
}

type RawStep = { title: string; body: string; app?: string; keywords?: string[] }

/** Limpia los pasos, busca sus imágenes y arma la guía. */
async function buildGuide(rawTitle: string, rawSteps: RawStep[] | undefined, fallbackTitle: string): Promise<Guide> {
  const raw = (rawSteps ?? [])
    .map((s) => ({
      title: clean(s.title, 60),
      body: clean(s.body, 240),
      hint: { app: clean(s.app, 30), keywords: (s.keywords ?? []).map((k) => clean(k, 30)).filter(Boolean) },
    }))
    .filter((s) => s.title && s.body)
    .slice(0, 8)
  if (raw.length < 2) throw new Error("La guía salió incompleta. Intenta con otras palabras.")

  // Imágenes de apoyo (logotipo de la app o pictograma). Si no se encuentran, el paso queda solo con texto.
  const steps = await withImages(
    raw.map(({ title, body }) => ({ title, body })),
    raw.map((s) => s.hint),
  )
  const title = clean(rawTitle, 80) || clean(fallbackTitle, 80)
  return { id: `ia-${slug(title)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, title, steps, source: "ai", createdAt: new Date().toISOString() }
}

type GuideResponse = {
  suitable: boolean
  message?: string
  title: string
  steps: RawStep[]
}

export class UnsuitableTopicError extends Error {}

export async function generateGuide(topic: string, ctx: AiContext, signal?: AbortSignal): Promise<Guide> {
  const prompt = `${contextText(ctx)}

La persona quiere aprender: "${clean(topic, 200)}".
Crea una guía paso a paso para hacerlo en su teléfono.`

  const out = await callGemini<GuideResponse>(prompt, guideSchema, signal)
  if (!out.suitable) throw new UnsuitableTopicError(clean(out.message, 200) || "No puedo crear una guía de ese tema. Prueba con otro.")

  return buildGuide(out.title, out.steps, topic)
}

/* ---------- 3. Las guías iniciales del perfil, en UNA sola llamada ---------- */

const starterSchema = {
  type: "OBJECT",
  properties: {
    guides: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING", description: "Título de la guía, empezando con verbo. Máximo 8 palabras." },
          steps: stepsSchema,
        },
        required: ["title", "steps"],
      },
    },
  },
  required: ["guides"],
}

/**
 * Elige y crea varias guías de una vez a partir de la rutina.
 * Una sola llamada en lugar de cuatro: menos espera y menos riesgo de que Google responda "saturado".
 */
export async function generateStarterGuides(ctx: AiContext, count: number, existingTitles: string[], signal?: AbortSignal): Promise<Guide[]> {
  const prompt = `${contextText(ctx)}

Elige ${count} cosas distintas que esta persona podría aprender a hacer con su teléfono y que le ayuden en su vida diaria, según su rutina y gustos.
Deben ser tareas concretas y sencillas (por ejemplo: "Pedir una cita médica por WhatsApp").
No repitas estas, que ya tiene: ${existingTitles.join("; ") || "ninguna"}.
Para cada una, crea su guía paso a paso.`

  const out = await callGemini<{ guides: { title: string; steps: RawStep[] }[] }>(prompt, starterSchema, signal)
  const built = await Promise.all((out.guides ?? []).slice(0, count).map((g) => buildGuide(g.title, g.steps, g.title).catch(() => undefined)))
  return built.filter((g): g is Guide => !!g)
}