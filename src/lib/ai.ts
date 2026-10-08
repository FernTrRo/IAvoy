/**
 * Generación de guías con IA 
 */
import type { Guide } from "@/data/demo"

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const MODEL = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) ?? "gemini-3.5-flash"
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

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
Los textos se leerán en voz alta: usa buena puntuación y signos de interrogación completos (¿…?).`

/* ---------- llamada genérica ---------- */

async function callGemini<T>(prompt: string, schema: object, signal?: AbortSignal): Promise<T> {
  if (!API_KEY) throw new Error("Falta configurar la llave de la IA.")
  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.4,
        },
      }),
    })
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e
    throw new Error("No hay conexión a internet. Intenta más tarde.")
  }

  if (res.status === 429) throw new Error("La IA está ocupada. Espera un minuto e intenta otra vez.")
  if (!res.ok) throw new Error("No se pudo crear la guía. Intenta otra vez.")

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

const guideSchema = {
  type: "OBJECT",
  properties: {
    suitable: {
      type: "BOOLEAN",
      description: "false si el tema no es algo que se aprenda a hacer con el teléfono, es peligroso o no es apropiado.",
    },
    message: { type: "STRING", description: "Si suitable es false, explica amablemente por qué, en una frase." },
    title: { type: "STRING", description: "Título de la guía, empezando con verbo. Máximo 8 palabras." },
    steps: {
      type: "ARRAY",
      description: "Entre 3 y 8 pasos.",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING", description: "La acción del paso, máximo 6 palabras." },
          body: { type: "STRING", description: "Cómo hacerlo, máximo 2 frases cortas." },
        },
        required: ["title", "body"],
      },
    },
  },
  required: ["suitable", "title", "steps"],
}

type GuideResponse = { suitable: boolean; message?: string; title: string; steps: { title: string; body: string }[] }

export class UnsuitableTopicError extends Error {}

export async function generateGuide(topic: string, ctx: AiContext, signal?: AbortSignal): Promise<Guide> {
  const prompt = `${contextText(ctx)}

La persona quiere aprender: "${clean(topic, 200)}".
Crea una guía paso a paso para hacerlo en su teléfono.`

  const out = await callGemini<GuideResponse>(prompt, guideSchema, signal)
  if (!out.suitable) throw new UnsuitableTopicError(clean(out.message, 200) || "No puedo crear una guía de ese tema. Prueba con otro.")

  const steps = (out.steps ?? [])
    .map((s) => ({ title: clean(s.title, 60), body: clean(s.body, 240) }))
    .filter((s) => s.title && s.body)
    .slice(0, 8)
  if (steps.length < 2) throw new Error("La guía salió incompleta. Intenta con otras palabras.")

  const title = clean(out.title, 80) || clean(topic, 80)
  return { id: `ia-${slug(title)}-${Date.now().toString(36)}`, title, steps, source: "ai", createdAt: new Date().toISOString() }
}
