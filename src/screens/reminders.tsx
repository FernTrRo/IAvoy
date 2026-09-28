import { useState } from "react"
import { VoiceCommand } from "@/components/voice-command"
import { isIntent, reminderTarget, speechText } from "@/lib/commands"
import { Check, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScreenHeader } from "@/components/screen-header"
import { SpeakButton } from "@/components/speak-button"
import { formatWhen, reminderPhrase } from "@/lib/format"
import type { Reminder } from "@/data/demo"

type Props = {
  onEdit: (id: string) => void
  onCancel: (id: string) => void
  reminders: Reminder[]
  onBack: () => void
  onDone: (id: string) => void
  onNew: () => void
  onResetDemo: () => void
}

export function RemindersScreen({ onEdit, onCancel, reminders, onBack, onDone, onNew, onResetDemo }: Props) {
  const [cancelId, setCancelId] = useState<string | null>(null)
  const pending = reminders.filter((r) => !r.done && !r.cancelled).sort((a, b) => a.when.localeCompare(b.when))
  const done = reminders.filter((r) => r.done && !r.cancelled)

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader onBack={onBack} helpText="Aquí están tus avisos. Toca Escuchar para oír uno, o Listo cuando ya lo hiciste." />
      <h1 className="text-4xl font-bold">Mis avisos</h1>

      <Button onClick={onNew}><Plus /> Crear aviso</Button>
      <VoiceCommand hint="Di modificar seguido del nombre del aviso, o cancelar seguido de su nombre." onCommand={text => {
        const command = text
        if (cancelId) {
          if (isIntent(command, "yes")) { onCancel(cancelId); setCancelId(null) }
          else if (isIntent(command, "no")) setCancelId(null)
          else throw new Error("Di sí para cancelar el aviso o no para conservarlo.")
          return
        }
        if (isIntent(command, "new")) { onNew(); return }
        if (isIntent(command, "back")) { onBack(); return }
        const match = reminderTarget(command)
        const matches = match ? pending.filter(r => speechText(r.text) === match.name) : []
        if (!match || matches.length !== 1) throw new Error("Di cambiar o quitar, seguido del nombre del aviso. Si hay nombres iguales, elige su botón.")
        if (match.action === "cancel") setCancelId(matches[0].id)
        else onEdit(matches[0].id)
      }} />
      {cancelId && <Card role="alert"><p>¿Cancelar el aviso «{reminders.find(r => r.id === cancelId)?.text}»?</p><Button onClick={() => { onCancel(cancelId); setCancelId(null) }}>Sí, cancelar aviso</Button><Button variant="outline" onClick={() => setCancelId(null)}>No, conservar</Button></Card>}
      {pending.length === 0 ? (
        <Card>
          <p className="text-xl">No tienes avisos pendientes.</p>
          <Button onClick={onNew} className="self-start"><Plus /> Decir un aviso</Button>
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {pending.map((r) => (
            <li key={r.id}>
              <Card className="gap-3">
                <p className="text-2xl font-bold leading-snug">{r.text}</p>
                <p className="text-xl">{formatWhen(r.when)}</p>
                <p>{r.advanceMinutes ? `${r.advanceMinutes} minutos antes y a la hora indicada` : "A la hora indicada"} · {r.recurrence === "daily" ? "Diario" : r.recurrence === "weekly" ? "Semanal" : "Una vez"}</p>
                <div className="grid grid-cols-2 gap-3">
                  <SpeakButton text={reminderPhrase(r.text)} />
                  <Button onClick={() => onDone(r.id)}><Check /> Listo</Button>
                  <Button variant="outline" onClick={() => onEdit(r.id)}>Modificar</Button>
                  <Button variant="outline" onClick={() => setCancelId(r.id)}>Cancelar aviso</Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-2xl font-bold">Ya hechos</h2>
          <ul className="flex flex-col gap-2">
            {done.map((r) => (
              <li key={r.id} className="flex items-center gap-3 text-xl text-muted-foreground">
                <Check className="size-6 shrink-0 text-accion-borde" /> <s>{r.text}</s>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Button variant="ghost" size="sm" className="mt-6 self-center text-muted-foreground" onClick={onResetDemo}>
        Restablecer datos de demostración
      </Button>
    </div>
  )
}
