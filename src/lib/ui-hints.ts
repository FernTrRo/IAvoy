/**
 * Pistas visuales de cada paso: QUÉ botón buscar y DÓNDE está en la pantalla.
 *
 * En lugar de dibujos del mundo real (un micrófono de escritorio), se muestra el ícono
 * tal como aparece en el teléfono (el micrófono simple dentro de un círculo verde de WhatsApp)
 * y un teléfono pequeño que señala su lugar. No depende de internet.
 */
import type { StepPosition, StepUi } from "@/data/demo"
import { matchApp } from "@/lib/images"

/** Íconos de interfaz que la IA puede elegir, con su nombre para leerlo en voz alta. */
export const UI_ICONS: Record<string, string> = {
  app: "El ícono de la aplicación",
  mic: "Micrófono",
  search: "Lupa",
  camera: "Cámara de fotos",
  video_call: "Cámara de video",
  send: "Flecha de enviar",
  attach: "Clip",
  plus: "Signo de más",
  call: "Teléfono",
  hang_up: "Teléfono rojo",
  back: "Flecha para regresar",
  menu: "Tres puntitos",
  settings: "Engrane",
  home: "Casita",
  share: "Compartir",
  heart: "Corazón",
  trash: "Bote de basura",
  keyboard: "Teclado",
  play: "Triángulo de reproducir",
  pause: "Pausa",
  volume: "Bocina",
  download: "Descargar",
  gallery: "Fotos",
  contacts: "Contactos",
  chat: "Mensajes",
  bell: "Campana",
  location: "Ubicación",
  directions: "Cómo llegar",
  star: "Estrella",
  close: "Cerrar",
  ok: "Palomita",
  emoji: "Carita",
  fullscreen: "Pantalla completa",
  edit: "Lápiz",
  alarm: "Reloj",
  walk: "Persona caminando",
}

export const POSITIONS: Record<StepPosition, string> = {
  "top-left": "Arriba, a la izquierda",
  "top-right": "Arriba, a la derecha",
  "bottom-left": "Abajo, a la izquierda",
  "bottom-right": "Abajo, a la derecha",
  "bottom-center": "Abajo, en medio",
  center: "En medio de la pantalla",
}

/** Lo que llega de la IA o de las guías de respaldo. */
export type RawUi = { icon?: string; position?: string; app?: string }

/** Revisa y limpia la pista: si el ícono no existe, el paso queda sin imagen. */
export function normalizeUi(raw: RawUi): StepUi | undefined {
  const icon = (raw.icon ?? "").trim().toLowerCase()
  const app = matchApp(raw.app)?.slug
  if (!icon || icon === "none" || icon === "ninguno" || !(icon in UI_ICONS)) return undefined
  if (icon === "app" && !app) return undefined
  const position = ((raw.position ?? "").trim().toLowerCase() in POSITIONS ? raw.position!.trim().toLowerCase() : "center") as StepPosition
  return { icon, position, ...(app ? { app } : {}) }
}

/** Texto para la IA: la lista de íconos y lugares que puede usar. */
export const ICON_CHOICES = Object.entries(UI_ICONS).map(([id, name]) => `${id} (${name.toLowerCase()})`).join(", ")
export const POSITION_CHOICES = Object.entries(POSITIONS).map(([id, name]) => `${id} (${name.toLowerCase()})`).join(", ")