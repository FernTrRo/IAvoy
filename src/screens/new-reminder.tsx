import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScreenHeader } from "@/components/screen-header"
import { VoiceCommand } from "@/components/voice-command"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { localDateInput, numbers, durationMinutes } from "@/lib/reminders"
import { isIntent, parseReminderRequest, speechText, reminderConfirmation, type ReminderContext } from "@/lib/commands"
import { speak } from "@/lib/voice"
import { formatWhen } from "@/lib/format"
import type { Reminder } from "@/data/demo"

type Props = { initial?: Reminder; initialPhrase?: string; onCancel: () => void; onSave: (reminder: Reminder) => void }
export function NewReminderScreen({ initial, initialPhrase, onCancel, onSave }: Props) {
  const [first] = useState(() => initialPhrase ? parseReminderRequest(initialPhrase) : { patch: {}, questions: [] })
  const [text, setText] = useState(first.patch.text ?? initial?.text ?? "")
  const [date, setDate] = useState(first.patch.when ? localDateInput(new Date(first.patch.when)) : initial ? localDateInput(new Date(initial.when)) : "")
  const [advance, setAdvance] = useState(first.patch.advanceMinutes ?? initial?.advanceMinutes ?? 0)
  const [recurrence, setRecurrence] = useState<NonNullable<Reminder["recurrence"]>>(first.patch.recurrence ?? initial?.recurrence ?? "once")
  const [repeats, setRepeats] = useState(initial?.repeats ?? 3)
  const [snooze, setSnooze] = useState(initial?.snoozeMinutes ?? 10)
  const [phrase, setPhrase] = useState(initialPhrase ?? "")
  const [context, setContext] = useState<ReminderContext>(first.context ?? {})
  const [questions, setQuestions] = useState<string[]>(first.questions)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const valid = !!date && Number.isFinite(new Date(date).getTime()) && new Date(date).getTime() > Date.now()
  const frequency = recurrence === "daily" ? "Todos los días" : recurrence === "weekly" ? "Cada semana" : "Una sola vez"
  const summary = `${text || "Falta el contenido"}. ${valid ? formatWhen(new Date(date).toISOString()) : "Falta una fecha futura"}. ${frequency}. ${advance ? `Con ${advance} minutos de anticipación` : "A la hora exacta"}.`
  useEffect(() => {
    if (initialPhrase) void speak(first.questions[0] ?? (first.patch.when && first.patch.text ? `${summary} ¿Lo guardo?` : "Dime qué quieres recordar, cuándo y con qué frecuencia.")).catch(() => {})
  }, [])
  function save() {
    if (!text.trim() || !valid || new Date(date).getTime() <= Date.now() || questions.length) {
      const message = questions[0] || (!text.trim() ? "¿Qué quieres que te recuerde?" : "Dime una fecha y hora futuras.")
      setQuestions([message]); void speak(message).catch(() => {}); return
    }
    if (!Number.isInteger(advance) || advance < 0 || advance > 10080 || !Number.isInteger(snooze) || snooze < 1 || snooze > 10080) { setQuestions(["Revisa los minutos: anticipación entre 0 y 10080; posposición entre 1 y 10080."]); return }
    onSave({ id: initial?.id ?? crypto.randomUUID(), text: text.trim(), when: new Date(date).toISOString(), done: false, advanceMinutes: advance, recurrence, repeats, repeatSeconds: 30, snoozeMinutes: snooze })
  }
  function command(raw: string, written = false) {
    if (confirmCancel) {
      if (isIntent(raw, "yes")) onCancel()
      else if (isIntent(raw, "no")) setConfirmCancel(false)
      else throw new Error("¿Salir sin guardar? Di sí o no.")
      return
    }
    const confirmation = reminderConfirmation(raw)
    if (confirmation === "save") { save(); return }
    if (confirmation === "change") {
      void speak("De acuerdo, todavía no lo guardo. ¿Qué quieres cambiar: el pendiente, el día o la hora?").catch(() => {})
      return
    }
    if (isIntent(raw, "cancel") || isIntent(raw, "back")) { setConfirmCancel(true); return }
    if (isIntent(raw, "repeat")) { void speak(summary).catch(() => {}); return }
    let request = raw
    const simple = speechText(raw)
    const count = numbers(simple).match(/^(?:repetir|repite|repetirlo) ([1-5]) veces?$/)
    if (count) { setRepeats(Number(count[1])); return }
    if (isIntent(raw, "later")) {
      const minutes = durationMinutes(raw)
      if (!minutes) throw new Error("Dime cuántos minutos quieres posponer, por ejemplo: posponer diez minutos.")
      setSnooze(minutes); return
    }
    if (/^(?:texto|cambiar texto a|cambia el texto a|cambiar nombre a|cambia el nombre a) /.test(simple)) {
      const newText = raw.replace(/^(?:texto|cambiar texto a|cambia el texto a|cambiar nombre a|cambia el nombre a) /i, "")
      setText(newText)
      setPhrase(current => current.toLowerCase().startsWith(text.toLowerCase()) ? newText + current.slice(text.length) : newText)
      void speak(`${newText}. ${valid ? formatWhen(new Date(date).toISOString()) : "Falta precisar el día y la hora"}. ${valid && !questions.length ? "¿Lo guardo?" : ""}`).catch(() => {})
      return
    }
    if (isIntent(raw, "next")) throw new Error("Ahora puedes decir el aviso completo o guardar el resumen. No hay un siguiente formulario.")
    request = request.replace(/^(?:cambia(?:r)?|modifica(?:r)?) (?:la )?(?:hora|fecha) a /i, "")
    const result = parseReminderRequest(request, new Date(), { ...context, recurrence })
    const patch = result.patch
    const replaceText = !text || written || isIntent(raw, "new")
    const nextText = replaceText ? patch.text ?? text : text
    if (replaceText && patch.text) setText(patch.text)
    if (patch.when) setDate(localDateInput(new Date(patch.when)))
    if (patch.advanceMinutes !== undefined) setAdvance(patch.advanceMinutes)
    if (patch.recurrence) setRecurrence(patch.recurrence)
    const nextQuestions = [...result.questions]
    if (!patch.text && !text) nextQuestions.push("¿Qué quieres que te recuerde?")
    if (!patch.when && !date && !nextQuestions.length) nextQuestions.push("¿Qué día y a qué hora? Por ejemplo: mañana a las diez de la mañana.")
    if (patch.text && text && !replaceText && !patch.when && patch.recurrence === undefined && patch.advanceMinutes === undefined && !result.questions.length) {
      void speak("Para cambiar el pendiente, di cambiar texto a, seguido del nuevo pendiente. También puedes indicar el día o la hora.").catch(() => {})
      return
    }
    setQuestions(nextQuestions); setContext(result.context ?? {})
    const nextContext = result.context ?? {}
    const nextFrequency = patch.recurrence ?? recurrence
    const nextAdvance = patch.advanceMinutes ?? advance
    const relativePhrase = request.match(/\b(?:dentro de|en) (?:\d+|[a-z]+(?: y [a-z]+)?) (?:minutos?|horas?)\b/i)?.[0]
    setPhrase([nextText, relativePhrase ?? nextContext.day, nextContext.time, nextFrequency === "daily" ? "todos los días" : nextFrequency === "weekly" ? "cada semana" : "una sola vez", nextAdvance ? `con ${nextAdvance} minutos de anticipación` : "sin anticipación"].filter(Boolean).join(" "))
    const nextDate = patch.when ?? (date ? new Date(date).toISOString() : "")
    void speak(nextQuestions[0] ?? `${nextText}. ${nextDate ? formatWhen(nextDate) : ""}. ${patch.recurrence === "daily" ? "Todos los días." : patch.recurrence === "weekly" ? "Cada semana." : frequency + "."} ¿Lo guardo?`).catch(() => {})
  }
  return <div className="flex flex-col gap-6">
    <ScreenHeader onBack={() => setConfirmCancel(true)} helpText="Toca el micrófono y di qué quieres recordar, cuándo y con qué frecuencia en una sola frase. Revisa el resumen y di guardar. También puedes escribir o ajustar los datos." />
    <header><h1 className="home-greeting">{initial ? "Cambiemos tu aviso" : "¿Qué te recuerdo?"}</h1></header>
    <VoiceCommand onCommand={command} hint="Di la tarea, la fecha, la hora y la frecuencia en una sola frase." />
    <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
      <DialogContent showClose={false} className="exit-confirmation" onPointerDownOutside={event => event.preventDefault()}>
        <DialogTitle className="text-3xl">¿Salir sin guardar?</DialogTitle>
        <DialogDescription className="text-2xl">Di sí para salir o no para seguir.</DialogDescription>
        <VoiceCommand priority={200} onCommand={command} hint="Di sí para salir sin guardar o no para seguir con tu aviso." />
        <DialogFooter>
          <Button className="min-h-16 text-2xl" onClick={() => setConfirmCancel(false)}>No, seguir</Button>
          <Button className="min-h-16 text-2xl" variant="outline" onClick={onCancel}>Sí, salir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <form className="phrase-input" onSubmit={e => { e.preventDefault(); command(phrase, true) }}>
      <Label htmlFor="frase">Tu aviso · puedes editarlo</Label>
      <textarea id="frase" rows={2} value={phrase} onChange={e => setPhrase(e.target.value)} placeholder="Llamar a mi hija mañana a las diez de la mañana, todos los días" />
      <button type="submit" className="text-action" disabled={!phrase.trim()}>Revisar frase</button>
    </form>
    <section className="reminder-note" aria-label="Resumen del aviso" aria-live="polite">
      <p className="eyebrow">Así queda tu aviso</p>
      <h2>{text || "Tu pendiente"}</h2>
      <p>{valid ? formatWhen(new Date(date).toISOString()) : "Falta el día y la hora"}</p>
      <p>{frequency}{advance ? ` · ${advance} minutos antes` : " · Sin anticipación"}</p>
    </section>
    {questions.length > 0 && <p className="clarification" role="alert">{questions.join(" ")}</p>}
    <Button size="xl" onClick={save} disabled={!text.trim() || !valid || !!questions.length}>Guardar aviso</Button>
    <details className="manual-settings"><summary>Corregir datos a mano</summary><div className="flex flex-col gap-3 pt-4">
      <Label htmlFor="aviso">Qué recordar</Label><Input id="aviso" value={text} onChange={e => { setText(e.target.value); setQuestions([]) }} />
      <Label htmlFor="fecha">Fecha y hora</Label><Input id="fecha" type="datetime-local" value={date} onChange={e => { setDate(e.target.value); setQuestions([]) }} />
      <Label htmlFor="frecuencia">Frecuencia</Label><select id="frecuencia" value={recurrence} onChange={e => { setRecurrence(e.target.value as typeof recurrence); setQuestions([]) }}><option value="once">Una sola vez</option><option value="daily">Todos los días</option><option value="weekly">Cada semana</option></select>
      <Label htmlFor="anticipacion">Minutos antes (0 = hora exacta)</Label><Input id="anticipacion" type="number" min="0" max="10080" value={advance} onChange={e => { setAdvance(Number(e.target.value)); setQuestions([]) }} />
      <Label htmlFor="repeticiones">Repeticiones de voz, cada 30 segundos</Label><select id="repeticiones" value={repeats} onChange={e => setRepeats(Number(e.target.value))}>{[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}</select>
      <Label htmlFor="posponer">Minutos al posponer</Label><Input id="posponer" type="number" min="1" max="10080" value={snooze} onChange={e => setSnooze(Number(e.target.value))} />
    </div></details>
  </div>
}
