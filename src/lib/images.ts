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
  "Pictogramas de ARASAAC (arasaac.org), creados por Sergio Palao. Propiedad del Gobierno de Aragón. Licencia CC BY-NC-SA."

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
/** Avisos en la consola solo mientras se desarrolla. */
const DEV = !!import.meta.env?.DEV

const cache = new Map<string, number[]>()

const unaccent = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC")

type ArasaacResult = { _id?: number; sex?: boolean; violence?: boolean; keywords?: { keyword?: string }[] }

/**
 * Una búsqueda en ARASAAC. Devuelve los pictogramas ordenados del más al menos preciso,
 * [] si no hay, o undefined si falló la conexión.
 */
async function query(text: string): Promise<number[] | undefined> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`https://api.arasaac.org/v1/pictograms/es/search/${encodeURIComponent(text)}`, { signal: controller.signal })
    if (res.status === 404) return [] // ARASAAC responde 404 cuando no encuentra nada
    if (!res.ok) return undefined
    const list = (await res.json()) as ArasaacResult[]
    if (!Array.isArray(list)) return []
    const wanted = unaccent(text.toLowerCase())
    // Más puntos si una de sus palabras es exactamente la buscada (ej. "lupa" y no "lupa de joyero").
    const score = (p: ArasaacResult) => {
      const words = (p.keywords ?? []).map((k) => unaccent((k.keyword ?? "").toLowerCase()))
      return words.includes(wanted) ? 2 : words.some((w) => w.startsWith(wanted)) ? 1 : 0
    }
    return list
      .filter((p) => typeof p._id === "number" && !p.sex && !p.violence)
      .map((p, i) => ({ id: p._id!, points: score(p), i }))
      .sort((a, b) => b.points - a.points || a.i - b.i)
      .slice(0, 6)
      .map((p) => p.id)
  } catch (e) {
    if (DEV) console.warn(`[Imágenes] No se pudo consultar ARASAAC para "${text}".`, e)
    return undefined
  } finally {
    clearTimeout(timer)
  }
}

/** Busca pictogramas por palabra en español (con y sin acentos). */
async function searchPictograms(keyword: string): Promise<number[]> {
  const key = keyword.trim().toLowerCase()
  if (!key) return []
  if (cache.has(key)) return cache.get(key)!
  let ids = await query(key)
  if (ids?.length === 0 && unaccent(key) !== key) ids = await query(unaccent(key))
  if (ids !== undefined) cache.set(key, ids)
  if (DEV && ids?.length === 0) console.info(`[Imágenes] Sin pictograma para "${key}".`)
  return ids ?? []
}

const pictogram = (id: number, keyword: string): StepImage => ({
  src: `https://static.arasaac.org/pictograms/${id}/${id}_500.png`,
  alt: keyword,
  kind: "pictogram",
})

/* ---------- Para cada paso ---------- */

/** Lo que la IA sugiere para ilustrar un paso. */
export type StepHint = { app?: string; keywords?: string[] }

/** Palabras que no sirven para buscar un pictograma (nombres de apps, palabras vacías). */
const USELESS = new Set([...Object.keys(APPS), ...Object.values(APPS).map((a) => a.name.toLowerCase()), "app", "aplicacion", "aplicación", "pantalla", "telefono", "teléfono", "celular", "boton", "botón", "icono", "ícono", "opcion", "opción"])

/** El paso trata de abrir o reconocer la app (ahí sí va el logotipo grande). */
const opensApp = (step: GuideStep, appName: string) =>
  new RegExp(`\\b(abr[ea]|abrir|entra|busca el [ií]cono|toca el [ií]cono)\\b|${appName}`, "i").test(`${step.title} ${step.body}`)

/**
 * Elige la imagen de cada paso, mirando la guía completa para no repetir:
 * - El logotipo grande de una app aparece UNA sola vez: en el paso que la abre (o la primera vez que aparece).
 * - Los demás pasos llevan un pictograma de la acción, con el logotipo pequeño en la esquina como recordatorio.
 * - Ningún pictograma se repite en la misma guía: si ya se usó, se toma el siguiente resultado o la siguiente palabra.
 * - Si no hay un pictograma nuevo, el paso queda sin imagen (mejor que repetir la misma).
 */
export async function withImages(steps: GuideStep[], hints: StepHint[]): Promise<GuideStep[]> {
  const keywordsOf = (h: StepHint | undefined) =>
    (h?.keywords ?? []).map((k) => k.trim()).filter((k) => k && !USELESS.has(k.toLowerCase())).slice(0, 3)

  // Todas las búsquedas al mismo tiempo (rápido); la elección se hace después, en orden.
  const results = await Promise.all(steps.map((_, i) =>
    Promise.all(keywordsOf(hints[i]).map(async (k) => ({ keyword: k, ids: await searchPictograms(k).catch(() => []) }))),
  ))

  const usedPictograms = new Set<number>()
  const shownLogos = new Set<string>()
  return steps.map((step, i) => {
    const app = matchApp(hints[i]?.app)
    let image: StepImage | undefined

    if (app && !shownLogos.has(app.slug) && (opensApp(step, app.name) || !results[i].some((r) => r.ids.length))) {
      image = logo(app)
      shownLogos.add(app.slug)
    } else {
      for (const { keyword, ids } of results[i]) {
        const id = ids.find((x) => !usedPictograms.has(x))
        if (id !== undefined) {
          usedPictograms.add(id)
          image = { ...pictogram(id, keyword), ...(app ? { badge: { src: logo(app).src, alt: logo(app).alt } } : {}) }
          break
        }
      }
      if (app) shownLogos.add(app.slug)
    }
    return image ? { ...step, image } : step
  })
}