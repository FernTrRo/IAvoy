export type Reminder = {
  id: string
  text: string
  /** fecha y hora en ISO */
  when: string
  done: boolean
  advanceMinutes?: number
  recurrence?: "once" | "daily" | "weekly"
  repeats?: number
  repeatSeconds?: number
  snoozeMinutes?: number
  nextAlertAt?: string
  notified?: boolean
  cancelled?: boolean
}

export type GuideStep = { title: string; body: string }
export type Guide = { id: string; title: string; steps: GuideStep[] }

const at = (hoursFromNow: number, minutes = 0) => {
  const d = new Date()
  d.setHours(d.getHours() + hoursFromNow, minutes, 0, 0)
  return d.toISOString()
}

export const demoReminders: Reminder[] = [
  { id: "r1", text: "Llamar al médico", when: at(1), done: false },
  { id: "r2", text: "Tomar la pastilla de la tarde", when: at(3), done: false },
  { id: "r3", text: "Llamar a mi hija", when: at(24, 0), done: false },
]

export const guides: Guide[] = [
  {
    id: "whatsapp-nota",
    title: "Enviar una nota de voz por WhatsApp",
    steps: [
      { title: "Abre WhatsApp", body: "Busca el ícono verde con un teléfono blanco y tócalo una vez." },
      { title: "Elige a la persona", body: "Toca el nombre de la persona a quien le quieres hablar." },
      { title: "Busca el micrófono", body: "Abajo, a la derecha, hay un botón con un micrófono." },
      { title: "Mantén presionado y habla", body: "Deja el dedo sobre el micrófono mientras hablas. No lo sueltes." },
      { title: "Suelta para enviar", body: "Cuando termines, levanta el dedo. La nota se envía sola." },
    ],
  },
  {
    id: "videollamada",
    title: "Contestar una videollamada",
    steps: [
      { title: "Escucha el timbre", body: "La pantalla muestra el nombre de quien llama." },
      { title: "Toca el botón verde", body: "Tócalo o deslízalo hacia arriba para contestar." },
      { title: "Mira la pantalla", body: "Ya puedes ver y hablar con la otra persona." },
    ],
  },
]

export const userName = "Chuy"
