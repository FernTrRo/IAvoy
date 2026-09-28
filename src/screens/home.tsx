import { BookOpen, ChevronRight, Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ScreenHeader } from "@/components/screen-header"
import { SpeakButton } from "@/components/speak-button"
import { formatToday, formatWhen } from "@/lib/format"
import { VoiceCommand } from "@/components/voice-command"
import { isIntent } from "@/lib/commands"
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
  onList: () => void
}

export function HomeScreen({ userName, onSettings, next, pendingCount, dailyQuestion, onDailyQuestion, onNewReminder, onGuide, onList }: Props) {
  return (
    <div className="flex flex-col gap-7">
      <ScreenHeader helpText="Toca el micrófono circular y dime qué necesitas. Puedes pedir un aviso o abrir tus actividades." />

      <section>
        <p className="mb-2 text-xl font-semibold">IA-Recuerdo</p>
        <h1 className="text-5xl font-bold tracking-tight">Hola, {userName}</h1>
        <p className="mt-1 text-xl text-muted-foreground">{formatToday()}</p>
      </section>

      {next && (
        <Card className="gap-3">
          <p className="text-lg text-muted-foreground">Tu próximo aviso</p>
          <p className="text-2xl font-bold leading-snug">{next.text}</p>
          <p className="text-xl">{formatWhen(next.when)}</p>
          <SpeakButton text={`Tu próximo aviso es: ${next.text}. ${formatWhen(next.when)}.`} className="self-start" />
        </Card>
      )}

      <section className="flex flex-col gap-4" aria-labelledby="que-hacer">
        <h2 id="que-hacer" className="text-3xl font-bold">¿Qué quieres hacer?</h2>
        <Button size="xl" onClick={() => onNewReminder()}>
          <span className="grid size-13 shrink-0 place-items-center rounded-full border-2 border-accion-borde bg-card">
            <Mic />
          </span>
          Decir un aviso
        </Button>
        <Button size="xl" onClick={onGuide}>
          <span className="grid size-13 shrink-0 place-items-center rounded-full border-2 border-accion-borde bg-card">
            <BookOpen />
          </span>
          Mis guías
        </Button>
        <Button variant="link" className="self-start px-0 text-xl" onClick={onList}>
          Ver mis avisos ({pendingCount}) <ChevronRight />
        </Button>
      </section>

      <VoiceCommand hint="Di crear aviso, mis avisos, mis guías o mi perfil." onCommand={text => {
        if (isIntent(text, "new")) onNewReminder(text)
        else if (isIntent(text, "reminders")) onList()
        else if (isIntent(text, "guides")) onGuide()
        else if (isIntent(text, "profile")) onSettings()
        else throw new Error("Puedes decir: hacer un aviso, ver pendientes, aprender o mi perfil.")
      }} />
      <Button variant="outline" onClick={onSettings}>Mi perfil y tutor</Button>
      <Card className="flex-row items-center justify-between gap-4">
        <Label htmlFor="daily" className="text-lg leading-snug font-normal">
          Preguntarme al entrar, una vez al día:
          <br />
          <strong>“¿Algo que recordar hoy?”</strong>
        </Label>
        <Switch id="daily" checked={dailyQuestion} onCheckedChange={onDailyQuestion} />
      </Card>
    </div>
  )
}
