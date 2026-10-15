/**
 * Guías de respaldo, escritas a mano.
 *
 * Se usan SOLO si la IA no responde (Google saturado, sin internet, límite gratuito).
 * Así la app nunca se queda sin guías, por ejemplo en una presentación.
 * Cada una corresponde a un gusto del perfil; las dos últimas sirven para cualquier persona.
 */
import type { Guide } from "@/data/demo"
import { withImages, type StepHint } from "@/lib/images"

/** Gustos que se tocan en el perfil. Cada uno tiene su guía de respaldo. */
export const ROUTINE_IDEAS = [
  "Habla con su familia por videollamada",
  "Manda mensajes por WhatsApp",
  "Va al médico cada mes",
  "Paga recibos de luz y agua",
  "Le gusta cocinar",
  "Ve videos y novelas",
  "Escucha música",
  "Sale a caminar",
  "Usa taxi o transporte",
  "Le gustan las plantas",
]

type BackupStep = { title: string; body: string } & StepHint
type BackupGuide = { idea?: string; title: string; steps: BackupStep[] }

const BACKUP: BackupGuide[] = [
  {
    idea: "Habla con su familia por videollamada",
    title: "Hacer una videollamada por WhatsApp",
    steps: [
      { title: "Abre WhatsApp", body: "Busca el ícono verde con un teléfono blanco y tócalo una vez.", app: "whatsapp" },
      { title: "Elige a la persona", body: "Toca el nombre de la persona con quien quieres hablar.", keywords: ["persona", "familia"] },
      { title: "Toca la cámara", body: "Arriba, a la derecha, hay un dibujo de una cámara de video. Tócalo una vez.", keywords: ["videollamada", "cámara de vídeo", "cámara"] },
      { title: "Espera a que conteste", body: "Vas a escuchar que suena. Cuando conteste, verás su cara.", keywords: ["esperar", "llamar"] },
      { title: "Cuelga al terminar", body: "Toca el botón rojo de abajo para terminar la llamada.", keywords: ["colgar", "teléfono"] },
    ],
  },
  {
    idea: "Manda mensajes por WhatsApp",
    title: "Mandar una foto por WhatsApp",
    steps: [
      { title: "Abre WhatsApp", body: "Busca el ícono verde con un teléfono blanco y tócalo una vez.", app: "whatsapp" },
      { title: "Elige la conversación", body: "Toca el nombre de la persona a quien le quieres mandar la foto.", keywords: ["persona", "mensaje"] },
      { title: "Toca el clip", body: "Abajo, junto a donde se escribe, hay un clip o un signo de más. Tócalo.", keywords: ["clip", "adjuntar"] },
      { title: "Elige Galería", body: "Toca la opción que dice Galería o Fotos.", keywords: ["foto", "galería"] },
      { title: "Toca la foto", body: "Busca la foto que quieres mandar y tócala una vez.", keywords: ["foto", "tocar"] },
      { title: "Envíala", body: "Toca el círculo verde con una flecha, abajo a la derecha.", keywords: ["enviar"] },
    ],
  },
  {
    idea: "Va al médico cada mes",
    title: "Poner una alarma para tu cita",
    steps: [
      { title: "Abre el Reloj", body: "Busca el ícono de un reloj y tócalo una vez.", keywords: ["reloj", "despertador"] },
      { title: "Toca Alarma", body: "Abajo verás varias opciones. Toca la que dice Alarma.", keywords: ["alarma", "despertador"] },
      { title: "Toca el signo de más", body: "Busca un botón con un signo de más y tócalo.", keywords: ["añadir", "más"] },
      { title: "Elige la hora", body: "Mueve los números con el dedo hasta la hora de tu cita.", keywords: ["hora", "reloj"] },
      { title: "Guarda la alarma", body: "Toca Guardar o Aceptar. Listo, el teléfono te avisará.", keywords: ["guardar", "bien"] },
    ],
  },
  {
    idea: "Paga recibos de luz y agua",
    title: "Tomar foto de tu recibo para guardarlo",
    steps: [
      { title: "Abre la Cámara", body: "Busca el ícono de una cámara de fotos y tócalo una vez.", keywords: ["cámara de fotos", "cámara"] },
      { title: "Apunta al recibo", body: "Pon el recibo en una mesa con buena luz y apunta el teléfono hacia él.", keywords: ["recibo", "papel"] },
      { title: "Toma la foto", body: "Toca el botón redondo grande de abajo, una sola vez.", keywords: ["foto", "hacer fotos"] },
      { title: "Revisa la foto", body: "Toca el cuadrito de abajo para ver que se lea bien.", keywords: ["mirar", "foto"] },
      { title: "Cuida tus datos", body: "Nunca compartas códigos ni contraseñas que te pidan por mensaje o llamada.", keywords: ["peligro", "secreto"] },
    ],
  },
  {
    idea: "Le gusta cocinar",
    title: "Buscar una receta en YouTube",
    steps: [
      { title: "Abre YouTube", body: "Busca el ícono rojo con un triángulo blanco y tócalo una vez.", app: "youtube" },
      { title: "Toca la lupa", body: "Arriba, a la derecha, hay una lupa. Tócala.", keywords: ["lupa", "buscar"] },
      { title: "Di la receta", body: "Toca el micrófono y di, por ejemplo: arroz rojo.", keywords: ["micrófono", "hablar"] },
      { title: "Elige un video", body: "Toca el video que te guste para verlo.", keywords: ["vídeo", "televisión"] },
      { title: "Pausa cuando quieras", body: "Toca el centro del video para detenerlo y vuelve a tocar para seguir.", keywords: ["pausa", "parar"] },
    ],
  },
  {
    idea: "Ve videos y novelas",
    title: "Ver un video en pantalla completa",
    steps: [
      { title: "Abre YouTube", body: "Busca el ícono rojo con un triángulo blanco y tócalo una vez.", app: "youtube" },
      { title: "Busca tu video", body: "Toca la lupa de arriba y di el nombre de la novela o el programa.", keywords: ["buscar", "lupa"] },
      { title: "Toca el video", body: "Toca el video que quieres ver.", keywords: ["vídeo", "televisión"] },
      { title: "Hazlo grande", body: "Toca el video una vez y luego el cuadro de esquinas, abajo a la derecha.", keywords: ["grande", "pantalla"] },
      { title: "Gira el teléfono", body: "Pon el teléfono de lado para que el video llene la pantalla.", keywords: ["girar", "teléfono móvil"] },
    ],
  },
  {
    idea: "Escucha música",
    title: "Escuchar una canción en YouTube",
    steps: [
      { title: "Abre YouTube", body: "Busca el ícono rojo con un triángulo blanco y tócalo una vez.", app: "youtube" },
      { title: "Toca la lupa", body: "Arriba, a la derecha, hay una lupa. Tócala.", keywords: ["lupa", "buscar"] },
      { title: "Di la canción", body: "Toca el micrófono y di el nombre de la canción o del cantante.", keywords: ["micrófono", "cantar"] },
      { title: "Toca la canción", body: "Toca el primer resultado para escucharla.", keywords: ["música", "escuchar"] },
      { title: "Sube el volumen", body: "Presiona el botón de arriba en el costado del teléfono.", keywords: ["volumen", "altavoz"] },
    ],
  },
  {
    idea: "Sale a caminar",
    title: "Ver dónde estás en Google Maps",
    steps: [
      { title: "Abre Google Maps", body: "Busca el ícono de un mapa con un globo rojo y tócalo.", app: "googlemaps" },
      { title: "Busca el punto azul", body: "El punto azul en el mapa eres tú.", keywords: ["mapa", "lugar"] },
      { title: "Toca la barra de arriba", body: "Toca donde dice Buscar aquí y di a dónde quieres ir.", keywords: ["buscar", "lupa"] },
      { title: "Toca Cómo llegar", body: "Toca el botón azul que dice Cómo llegar o Indicaciones.", keywords: ["camino", "dirección"] },
      { title: "Elige a pie", body: "Toca el dibujo de una persona caminando y sigue la línea azul.", keywords: ["caminar", "andar"] },
    ],
  },
  {
    idea: "Usa taxi o transporte",
    title: "Pedir un viaje en Uber",
    steps: [
      { title: "Abre Uber", body: "Busca el ícono negro que dice Uber y tócalo una vez.", app: "uber" },
      { title: "Toca ¿A dónde vas?", body: "Toca el cuadro de arriba que pregunta a dónde vas.", keywords: ["dirección", "lugar"] },
      { title: "Escribe tu destino", body: "Escribe o di la dirección y toca la que aparezca.", keywords: ["escribir", "dirección"] },
      { title: "Confirma el viaje", body: "Revisa el precio y toca el botón grande para pedirlo.", keywords: ["coche", "taxi"] },
      { title: "Revisa las placas", body: "Antes de subir, revisa que las placas y el nombre coincidan con la app.", keywords: ["mirar", "coche"] },
    ],
  },
  {
    idea: "Le gustan las plantas",
    title: "Buscar cómo cuidar una planta",
    steps: [
      { title: "Abre Chrome", body: "Busca el círculo de colores rojo, amarillo y verde, y tócalo.", app: "googlechrome" },
      { title: "Toca la barra de arriba", body: "Toca el cuadro donde se escribe, arriba de la pantalla.", keywords: ["buscar", "escribir"] },
      { title: "Usa el micrófono", body: "Toca el micrófono y di, por ejemplo: cómo cuidar una sábila.", keywords: ["micrófono", "hablar"] },
      { title: "Abre un resultado", body: "Toca uno de los resultados para leerlo.", keywords: ["leer", "planta"] },
    ],
  },
  // Para cualquier persona: completan si eligió pocos gustos.
  {
    title: "Llamar a un familiar",
    steps: [
      { title: "Abre el Teléfono", body: "Busca el ícono de un teléfono, casi siempre verde, y tócalo.", keywords: ["teléfono", "llamar"] },
      { title: "Toca Contactos", body: "Abajo verás la opción Contactos. Tócala.", keywords: ["agenda", "persona"] },
      { title: "Elige a la persona", body: "Toca el nombre de la persona a quien quieres llamar.", keywords: ["persona", "familia"] },
      { title: "Toca el botón verde", body: "Toca el teléfono verde para llamar.", keywords: ["llamar", "teléfono"] },
      { title: "Cuelga al terminar", body: "Toca el botón rojo para colgar.", keywords: ["colgar", "teléfono"] },
    ],
  },
  {
    title: "Hacer más grande la letra",
    steps: [
      { title: "Abre Ajustes", body: "Busca el ícono de un engrane y tócalo una vez.", keywords: ["ajustes", "configuración"] },
      { title: "Toca Pantalla", body: "Baja con el dedo y toca la opción Pantalla.", keywords: ["pantalla", "teléfono móvil"] },
      { title: "Toca Tamaño de fuente", body: "Busca la opción Tamaño de fuente o Tamaño de letra.", keywords: ["letra", "leer"] },
      { title: "Mueve la barra", body: "Desliza el punto hacia la derecha hasta que leas cómodo.", keywords: ["grande", "mover"] },
    ],
  },
]

const simplify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")

/** Convierte una guía de respaldo en una guía de la app, con sus imágenes. */
async function toGuide(b: BackupGuide, index: number): Promise<Guide> {
  const steps = await withImages(b.steps.map(({ title, body }) => ({ title, body })), b.steps)
  return {
    id: `respaldo-${index}-${Date.now().toString(36)}`,
    title: b.title,
    steps,
    source: "ai", // se muestra igual que las de la IA ("Creada para ti", se puede quitar)
    createdAt: new Date().toISOString(),
  }
}

/**
 * Elige guías de respaldo según los gustos tocados en el perfil.
 * Si faltan, completa con las generales. No repite títulos que ya existen.
 */
export async function backupGuides(routine: string, count: number, existingTitles: string[] = []) {
  const taken = new Set(existingTitles.map(simplify))
  const r = simplify(routine)
  const free = BACKUP.filter((b) => !taken.has(simplify(b.title)))
  const matching = free.filter((b) => b.idea && r.includes(simplify(b.idea)))
  const general = free.filter((b) => !b.idea)
  const others = free.filter((b) => b.idea && !matching.includes(b))
  const chosen = [...matching, ...general, ...others].slice(0, count)
  return Promise.all(chosen.map((b) => toGuide(b, BACKUP.indexOf(b))))
}

/** Busca una guía de respaldo para lo que alguien pidió aprender ("mandar fotos por wasap"). */
export async function findBackupGuide(topic: string, existingTitles: string[] = []) {
  const taken = new Set(existingTitles.map(simplify))
  const words = simplify(topic)
    .replace(/\bwasa\w*|\bguasa\w*/g, "whatsapp").replace(/\byutu\w*/g, "youtube")
    .split(/\W+/).filter((w) => w.length > 3)
  if (!words.length) return undefined
  const best = BACKUP
    .filter((b) => !taken.has(simplify(b.title)))
    .map((b) => {
      const text = simplify(`${b.title} ${b.idea ?? ""} ${b.steps.map((s) => s.app ?? "").join(" ")}`)
      return { b, hits: words.filter((w) => text.includes(w)).length }
    })
    .sort((a, b) => b.hits - a.hits)[0]
  return best && best.hits >= 2 ? toGuide(best.b, BACKUP.indexOf(best.b)) : undefined
}