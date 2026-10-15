/**
 * Imágenes de apoyo para los pasos de las guías. No se generan: se obtienen de dos fuentes gratuitas.
 *
 * 1. Logotipos de apps (WhatsApp, YouTube…) desde Simple Icons: https://simpleicons.org
 * 2. Pictogramas de ARASAAC para la acción del paso (tocar, foto, enviar…): https://arasaac.org
 *    Licencia CC BY-NC-SA. Autor: Sergio Palao. Propiedad: Gobierno de Aragón (España).
 *    Hay que mostrar la atribución en la app (ver ARASAAC_CREDIT).
 *
 * Si no hay internet o no se encuentra imagen, el paso simplemente se muestra sin imagen.
 */
import type { GuideStep, StepImage } from "@/data/demo"

export const ARASAAC_CREDIT =
  ""

/* ---------- Logotipos ---------- */

/** Apps que la IA puede nombrar → identificador en Simple Icons. */
export const APPS: Record<string, { name: string; slug: string }> = {
  whatsapp: { name: "WhatsApp", slug: "whatsapp" },
  youtube: { name: "YouTube", slug: "youtube" },
  facebook: { name: "Facebook", slug: "facebook" },
  instagram: { name: "Instagram", slug: "instagram" },
  messenger: { name: "Messenger", slug: "messenger" },
  telegram: { name: "Telegram", slug: "telegram" },
  gmail: { name: "Gmail", slug: "gmail" },
  googlemaps: { name: "Google Maps", slug: "googlemaps" },
  googlephotos: { name: "Google Fotos", slug: "googlephotos" },
  googlechrome: { name: "Google Chrome", slug: "googlechrome" },
  googlemeet: { name: "Google Meet", slug: "googlemeet" },
  zoom: { name: "Zoom", slug: "zoom" },
  uber: { name: "Uber", slug: "uber" },
  spotify: { name: "Spotify", slug: "spotify" },
  netflix: { name: "Netflix", slug: "netflix" },
  tiktok: { name: "TikTok", slug: "tiktok" },
  mercadopago: { name: "Mercado Pago", slug: "mercadopago" },
}

const simplify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "")

/** Convierte lo que dijo la IA ("Google Maps", "whatsapp") en una app conocida. */
export function matchApp(raw: string | undefined) {
  const s = simplify(raw ?? "")
  if (!s || s === "ninguna" || s === "ninguno") return undefined
  return APPS[s] ?? Object.values(APPS).find((a) => simplify(a.name) === s)
}

const logo = (app: { name: string; slug: string }): StepImage => ({
  src: `https://cdn.simpleicons.org/${app.slug}`,
  alt: `Ícono de ${app.name}`,
  kind: "logo",
})

/* ---------- Pictogramas de ARASAAC ---------- */

/** Solo se guardan los resultados reales; si falló la conexión, se vuelve a intentar la próxima vez. */
const cache = new Map<string, number | null>()

const unaccent = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC")

/** Una búsqueda en ARASAAC. Devuelve el número del pictograma, null si no hay, o undefined si falló la conexión. */
async function query(text: string): Promise<number | null | undefined> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`https://api.arasaac.org/v1/pictograms/es/search/${encodeURIComponent(text)}`, { signal: controller.signal })
    if (res.status === 404) return null // ARASAAC responde 404 cuando no encuentra nada
    if (!res.ok) return undefined
    const list = (await res.json()) as { _id?: number }[]
    return Array.isArray(list) && typeof list[0]?._id === "number" ? list[0]._id : null
  } catch (e) {
    if (import.meta.env.DEV) console.warn(`[Imágenes] No se pudo consultar ARASAAC para "${text}".`, e)
    return undefined
  } finally {
    clearTimeout(timer)
  }
}

/** Busca un pictograma por palabra en español (con y sin acentos) y devuelve su número, o null si no hay. */
async function searchPictogram(keyword: string): Promise<number | null> {
  const key = keyword.trim().toLowerCase()
  if (!key) return null
  if (cache.has(key)) return cache.get(key)!
  let id = await query(key)
  if (id === null && unaccent(key) !== key) id = await query(unaccent(key))
  if (id !== undefined) cache.set(key, id)
  if (import.meta.env.DEV && id === null) console.info(`[Imágenes] Sin pictograma para "${key}".`)
  return id ?? null
}

const pictogram = (id: number, keyword: string): StepImage => ({
  src: `https://static.arasaac.org/pictograms/${id}/${id}_500.png`,
  alt: keyword,
  kind: "pictogram",
})

/* ---------- Para cada paso ---------- */

/** Lo que la IA sugiere para ilustrar un paso. */
export type StepHint = { app?: string; keywords?: string[] }

/**
 * Elige la imagen de un paso: primero el logotipo si el paso trata de una app,
 * si no, el primer pictograma que exista para las palabras sugeridas.
 */
export async function findStepImage(hint: StepHint): Promise<StepImage | undefined> {
  const app = matchApp(hint.app)
  if (app) return logo(app)
  for (const keyword of (hint.keywords ?? []).slice(0, 3)) {
    const id = await searchPictogram(keyword)
    if (id !== null) return pictogram(id, keyword)
  }
  return undefined
}

/** Agrega imágenes a todos los pasos al mismo tiempo. Nunca falla: si algo sale mal, el paso queda sin imagen. */
export async function withImages(steps: GuideStep[], hints: StepHint[]): Promise<GuideStep[]> {
  const images = await Promise.all(steps.map((_, i) => findStepImage(hints[i] ?? {}).catch(() => undefined)))
  return steps.map((step, i) => (images[i] ? { ...step, image: images[i] } : step))
}