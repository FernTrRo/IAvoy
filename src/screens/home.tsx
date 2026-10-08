import { useEffect, useState } from "react"
import { BookOpen, ListChecks, Mic, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ScreenHeader } from "@/components/screen-header"
import { SpeakButton } from "@/components/speak-button"
import { formatToday, formatWhen } from "@/lib/format"
import { VoiceCommand } from "@/components/voice-command"
import { isIntent, learnRequest } from "@/lib/commands"
import { type Reminder } from "@/data/demo"

type Props = {
  userName: string
  onSettings: () => void
  next?: Reminder
  pendingCount: number
  dailyQuestion: boolean
  onDailyQuestion: (v: boolean) => void
  onNewReminder: (phrase?: string) => void
  onGuide: () => void
  /** "Quiero aprender a…" dicho en el inicio: abre la pantalla de nueva guía con esa frase. */
  onNewGuide: (phrase?: string) => void
  onList: () => void
}

export function HomeScreen({ userName, onSettings, next, pendingCount, dailyQuestion, onDailyQuestion, onNewReminder, onGuide, onNewGuide, onList }: Props) {
  const name = userName.trim()
  const greetings = [
    `¿Cómo estás hoy${name ? `, ${name}` : ""}?`,
    `¿Hay algo que recordar${name ? `, ${name}` : ""}?`,
    `${name ? `¡${name}! ` : ""}¿Aprendemos algo nuevo?`,
    `${name ? `${name}, ¿` : "¿"}qué te gustaría hacer hoy?`,
    `¿Retomamos una actividad${name ? `, ${name}` : ""}?`,
  ]
  // El saludo cambia al volver al inicio, no mientras se lee o se usa el micrófono.
  const [greetingIndex] = useState(() => {
    let previous = -1
    try {
      const stored = sessionStorage.getItem("iarecuerdo:last-greeting")
      if (stored !== null) previous = Number(stored)
    } catch { /* También funciona cuando el almacenamiento está bloqueado. */ }
    const choices = greetings.map((_, index) => index).filter(index => index !== previous)
    return choices[Math.floor(Math.random() * choices.length)]
  })
  useEffect(() => {
    try { sessionStorage.setItem("iarecuerdo:last-greeting", String(greetingIndex)) } catch { /* Sin persistencia. */ }
  }, [greetingIndex])
  return (
    <div className="flex flex-col gap-7">
      <ScreenHeader helpText="Toca el micrófono circular y dime qué necesitas. Puedes pedir un aviso, abrir tus actividades o decir qué quieres aprender." />

      <section>
        <h1 className="home-greeting">{greetings[greetingIndex]}</h1>
        <p className="mt-1 text-xl text-muted-foreground">{formatToday()}</p>
      </section>

      {next && (
        <Card className="gap-3">
          <p className="text-lg text-muted-foreground">Tu próximo aviso</p>
          <div className="flex items-center gap-3">
            <SpeakButton iconOnly size="icon" label="Escuchar tu próximo aviso" text={`Tu próximo aviso es: ${next.text}. ${formatWhen(next.when)}.`} className="shrink-0" />
            <h2 className="min-w-0 break-words text-2xl leading-snug">{next.text}</h2>
          </div>
          <p className="text-xl">{formatWhen(next.when)}</p>
        </Card>
      )}

      <section className="flex flex-col gap-4" aria-labelledby="que-hacer">
        <h2 id="que-hacer" className="text-3xl font-bold">¿Qué quieres hacer?</h2>
        <div className="home-actions">
        <Button size="xl" onClick={() => onNewReminder()}>
          <span className="grid size-13 shrink-0 place-items-center">
            <Mic />
          </span>
          Decir un aviso
        </Button>
        <Button size="xl" onClick={onGuide}>
          <span className="grid size-13 shrink-0 place-items-center">
            <BookOpen />
          </span>
          Mis guías
        </Button>
        <Button size="xl" className="reminders-count-button" onClick={onList} aria-label={`Ver mis avisos: ${pendingCount} pendientes`}>
          <span className="grid size-13 shrink-0 place-items-center"><ListChecks aria-hidden="true" /></span>
          Ver mis avisos
          <span className="reminders-count-badge" aria-hidden="true">{pendingCount > 99 ? "99+" : pendingCount}</span>
        </Button>
        <Button size="xl" onClick={onSettings}>
          <span className="grid size-13 shrink-0 place-items-center"><Users aria-hidden="true" /></span>
          Mi perfil y tutor
        </Button>
        </div>
      </section>

      <VoiceCommand hint="Di crear aviso, mis avisos, mis guías, quiero aprender a… o mi perfil." onCommand={text => {
        if (isIntent(text, "new")) onNewReminder(text)
        else if (learnRequest(text)) onNewGuide(text)
        else if (isIntent(text, "reminders")) onList()
        else if (isIntent(text, "guides")) onGuide()
        else if (isIntent(text, "profile")) onSettings()
        else throw new Error("Puedes decir: hacer un aviso, ver pendientes, quiero aprender a… o mi perfil.")
      }} />
      <Card className="flex-row items-center justify-between gap-4">
        <Label htmlFor="daily" className="text-lg leading-snug font-normal">
          Preguntarme por mis pendientes cada día
        </Label>
        <Switch id="daily" checked={dailyQuestion} onCheckedChange={onDailyQuestion} />
      </Card>
    </div>
  )
}