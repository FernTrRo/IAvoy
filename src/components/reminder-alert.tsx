import { useEffect, useRef, useState } from "react"
import { BellRing, Check, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SpeakButton } from "@/components/speak-button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatTime } from "@/lib/format"
import { VoiceCommand } from "@/components/voice-command"
import { isIntent } from "@/lib/commands"
import { durationMinutes } from "@/lib/reminders"
import { speak, stopSpeaking } from "@/lib/voice"
import type { Reminder } from "@/data/demo"

type Props = {
  reminder: Reminder | null
  onDone: (id: string) => void
  onLater: (id: string, minutes?: number) => void
  onDismiss: (id: string) => void
}

/**
 * "Notificación" dentro de la app: aparece cuando llega la hora de un aviso
 * y lo lee en voz alta. (La notificación del sistema con la app cerrada queda
 * para la siguiente versión, como indica la diapositiva 9.)
 */
export function ReminderAlert({ reminder, onDone, onLater, onDismiss }: Props) {
  const phrase = reminder ? `Recordatorio: ${reminder.text}. Programado a las ${formatTime(reminder.when)}. ¿Ya lo hiciste?` : ""

  const listening = useRef(false)
  const [audioError, setAudioError] = useState(false)
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss
  useEffect(() => {
    if (!reminder) return
    let cancelled = false
    let count = 0
    let timer: ReturnType<typeof setTimeout>
    setAudioError(false)
    async function announce() {
      if (cancelled || !reminder) return
      if (listening.current) { timer = setTimeout(announce, 1000); return }
      if (count >= (reminder.repeats ?? 3)) { dismissRef.current(reminder.id); return }
      count++
      try { await speak(phrase) } catch { if (!cancelled) setAudioError(true) }
      if (!cancelled) timer = setTimeout(announce, (reminder.repeatSeconds ?? 30) * 1000)
    }
    void announce()
    return () => { cancelled = true; clearTimeout(timer); listening.current = false; void stopSpeaking() }
  }, [reminder, phrase])

  return (
    <Dialog open={!!reminder}>
      <DialogContent showClose={false} onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="pr-0">
          <div className="mb-2 grid size-16 place-items-center rounded-full border-2 border-ayuda-borde bg-ayuda">
            <BellRing className="size-9" />
          </div>
          <DialogTitle className="text-3xl">{reminder?.text}</DialogTitle>
          <DialogDescription className="text-xl text-foreground">{phrase}</DialogDescription>
          {reminder && <p className="text-muted-foreground text-lg">Aviso de las {formatTime(reminder.when)}</p>}
        </DialogHeader>
        <DialogFooter>
          {audioError && <p role="alert">No se pudo reproducir la voz. Revisa el volumen y toca Escuchar otra vez.</p>}
          <VoiceCommand priority={100} onListening={active => { listening.current = active }} hint="Di listo, más tarde, posponer cinco minutos o silenciar." onCommand={text => {
            if (!reminder) return
            const command = text
            if (isIntent(command, "done")) onDone(reminder.id)
            else if (isIntent(command, "later")) {
              const minutes = durationMinutes(command)
              if (minutes === null && /(?:minuto|hora|\d)/i.test(command)) throw new Error("Indica un tiempo entre un minuto y siete días.")
              onLater(reminder.id, minutes ?? undefined)
            } else if (isIntent(command, "silence")) onDismiss(reminder.id)
            else if (isIntent(command, "repeat")) void speak(phrase).catch(() => {})
            else throw new Error("Puedes decir ya lo hice, después, posponer cinco minutos o silencio.")
          }} />
          <Button size="xl" className="justify-center" onClick={() => reminder && onDone(reminder.id)}>
            <Check /> Listo
          </Button>
          <Button variant="outline" className="min-h-16 w-full text-xl" onClick={() => reminder && onLater(reminder.id)}>
            <Clock /> Más tarde
          </Button>
          <Button variant="outline" onClick={() => reminder && onDismiss(reminder.id)}>Silenciar este aviso</Button>
          <SpeakButton text={phrase} label="Escuchar otra vez" className="w-full" />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
