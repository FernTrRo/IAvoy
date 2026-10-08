import { useEffect, useRef, useState } from "react"
import { Sparkles, Trash2, Wand2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScreenHeader } from "@/components/screen-header"
import { SpeakButton } from "@/components/speak-button"
import { VoiceCommand } from "@/components/voice-command"
import type { Profile } from "@/lib/profile"
import { isIntent, speechText, guideTopic, learnRequest } from "@/lib/commands"
import { addGuide, removeGuide, useGuides } from "@/lib/guides-store"
import { aiAvailable, generateGuide, suggestTopics, UnsuitableTopicError, type TopicSuggestion } from "@/lib/ai"

type Props = {
  profile: Profile
  onSave: (p: Profile) => void
  onBack: () => void
  /** Opcional: abrir la guía recién creada. */
  onOpenGuide?: (id: string) => void
}

export function SettingsScreen({ profile, onSave, onBack, onOpenGuide }: Props) {
  const guides = useGuides()
  const [draft, setDraft] = useState(profile)
  const [error, setError] = useState("")

  // IA
  const [learnTopic, setLearnTopic] = useState("")
  const [busy, setBusy] = useState<"" | "guide" | "topics">("")
  const [aiMessage, setAiMessage] = useState("")
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([])
  const [lastGuideId, setLastGuideId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  useEffect(() => () => { abortRef.current?.abort() }, [])

  const aiContext = { phoneModel: draft.phoneModel, routine: draft.routine }
  const toggleInterest = (id: string, on: boolean) =>
    setDraft((d) => ({ ...d, interests: on ? [...new Set([...d.interests, id])] : d.interests.filter((x) => x !== id) }))

  function save() {
    const phone = draft.tutorPhone.replace(/[\s()-]/g, "")
    if (phone && !/^\+?\d{7,15}$/.test(phone)) { setError("Escribe un teléfono válido, con 7 a 15 dígitos."); return }
    if (!draft.name.trim()) { setError("Indica cómo quieres que te llamemos."); return }
    onSave({ ...draft, name: draft.name.trim(), tutorPhone: phone })
  }

  function startRequest() {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setAiMessage("")
    return abortRef.current.signal
  }

  async function createGuide(topic: string) {
    if (!topic.trim() || busy) return
    const signal = startRequest()
    setBusy("guide")
    setLastGuideId(null)
    try {
      const guide = await generateGuide(topic, aiContext, signal)
      addGuide(guide)
      toggleInterest(guide.id, true)
      setLastGuideId(guide.id)
      setLearnTopic("")
      setSuggestions((s) => s.filter((t) => t.title !== topic))
      setAiMessage(`Listo. Creé la guía: ${guide.title}. Tiene ${guide.steps.length} pasos.`)
      toast.success("Guía creada")
    } catch (e) {
      if ((e as Error).name === "AbortError") return
      setAiMessage(e instanceof UnsuitableTopicError ? e.message : (e as Error).message)
    } finally {
      setBusy("")
    }
  }

  async function suggest() {
    if (busy) return
    if (!draft.routine.trim()) { setAiMessage("Primero escribe tu rutina y lo que te gusta. Así te sugiero cosas útiles."); return }
    const signal = startRequest()
    setBusy("topics")
    try {
      const topics = await suggestTopics(aiContext, guides.map((g) => g.title), signal)
      setSuggestions(topics)
      setAiMessage(topics.length ? "Estas son algunas ideas para ti. Toca la que te interese." : "No encontré ideas. Escribe un poco más sobre tu rutina.")
    } catch (e) {
      if ((e as Error).name === "AbortError") return
      setAiMessage((e as Error).message)
    } finally {
      setBusy("")
    }
  }

  function command(raw: string): void | Promise<void> {
    const s = speechText(raw)
    if (isIntent(raw, "save")) { save(); return }
    if (isIntent(raw, "back") || isIntent(raw, "close")) { onBack(); return }
    for (const [prefix, key] of [["mi nombre es ", "name"], ["mi telefono es ", "phoneModel"], ["mi rutina es ", "routine"], ["mi tutor se llama ", "tutorName"]] as const) {
      if (s.startsWith(prefix)) { setDraft({ ...draft, [key]: raw.slice(prefix.length) }); return }
    }
    // "quiero aprender a…" / "enséñame a…" → crea una guía con IA
    if (aiAvailable() && learnRequest(raw) && !guideTopic(s)) return createGuide(raw)
    if (aiAvailable() && /^(?:sugiereme|sugiere|sugerir|que puedo aprender|dame ideas)/.test(s) && !guideTopic(s)) return suggest()

    const topic = guideTopic(s)
    const guide = guides.find(g => (topic === g.id && /^(?:no )?(?:sugerir|sugiere|recomendar|recomienda|me interesa|agrega)/.test(s)) || s === `sugerir ${speechText(g.title)}` || s === `no sugerir ${speechText(g.title)}`)
    if (guide) { toggleInterest(guide.id, !s.startsWith("no ")); return }
    throw new Error("Di: mi nombre es…, mi rutina es…, quiero aprender a…, o guardar.")
  }

  return <div className="flex flex-col gap-5">
    <ScreenHeader onBack={onBack} helpText="El tutor y tú pueden preparar el perfil en este teléfono. Escribe tu rutina y lo que quieres aprender, y la app te crea guías paso a paso. Guarda al terminar." />
    <h1 className="home-greeting">Mi perfil y tutor</h1>
    <VoiceCommand onCommand={command} hint="Di: mi nombre es…, mi rutina es…, quiero aprender a…, o guardar." />

    {([['name','Tu nombre'],['tutorName','Nombre del tutor'],['tutorPhone','Teléfono del tutor'],['phoneModel','Modelo del teléfono']] as const).map(([key, label]) =>
      <div key={key} className="flex flex-col gap-2">
        <Label htmlFor={key}>{label}</Label>
        <Input id={key} type={key === 'tutorPhone' ? 'tel' : 'text'} placeholder={key === 'phoneModel' ? 'Ejemplo: Samsung A15' : undefined} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} />
      </div>)}

    <div className="flex flex-col gap-2">
      <Label htmlFor="routine">Rutina, gustos y necesidades</Label>
      <Textarea id="routine" value={draft.routine} placeholder="Ejemplo: Voy al médico cada mes, me gusta cocinar y hablo con mis nietos por videollamada." onChange={e => setDraft({ ...draft, routine: e.target.value })} />
      <p className="text-lg">Con esto la app te sugiere guías. Tu nombre y los teléfonos no se envían.</p>
    </div>

    {/* ---------- Aprender con IA ---------- */}
    <section className="flex flex-col gap-4" aria-labelledby="aprender">
      <h2 id="aprender" className="text-2xl font-bold">¿Qué quieres aprender?</h2>

      {!aiAvailable() ? (
        <p className="text-lg">Para crear guías nuevas hace falta configurar la IA. Por ahora puedes usar las guías de ejemplo.</p>
      ) : <>
        <div className="flex flex-col gap-2">
          <Label htmlFor="learn">Escribe o di lo que quieres aprender</Label>
          <Input id="learn" value={learnTopic} placeholder="Ejemplo: mandar una foto por WhatsApp" onChange={e => setLearnTopic(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void createGuide(learnTopic) }} />
        </div>
        <Button size="xl" className="justify-center" disabled={!learnTopic.trim() || !!busy} onClick={() => void createGuide(learnTopic)}>
          <Wand2 /> {busy === "guide" ? "Creando tu guía…" : "Crear mi guía"}
        </Button>
        <Button variant="outline" className="min-h-16" disabled={!!busy} onClick={() => void suggest()}>
          <Sparkles /> {busy === "topics" ? "Buscando ideas…" : "Sugiéreme qué aprender"}
        </Button>

        {aiMessage && (
          <Card className="gap-3" role="status" aria-live="polite">
            <p className="text-xl leading-snug">{aiMessage}</p>
            <div className="flex flex-wrap gap-3">
              <SpeakButton text={aiMessage} />
              {lastGuideId && onOpenGuide && <Button onClick={() => onOpenGuide(lastGuideId)}>Ver la guía</Button>}
            </div>
          </Card>
        )}

        {suggestions.length > 0 && (
          <ul className="flex flex-col gap-3">
            {suggestions.map(t => (
              <li key={t.title}>
                <Card className="gap-3">
                  <p className="text-xl font-bold leading-snug">{t.title}</p>
                  <p className="text-lg">{t.why}</p>
                  <div className="flex flex-wrap gap-3">
                    <Button disabled={!!busy} onClick={() => void createGuide(t.title)}><Wand2 /> Crear esta guía</Button>
                    <SpeakButton text={`${t.title}. ${t.why}`} />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </>}
    </section>

    <h2 className="text-2xl font-bold">Mis guías</h2>
    <p className="text-lg">Marca las que quieres ver al aprender.</p>
    <ul className="flex flex-col gap-2">
      {guides.map(g => (
        <li key={g.id} className="flex items-center justify-between gap-3">
          <label className="flex min-h-14 flex-1 items-center gap-3">
            <input type="checkbox" className="size-6 shrink-0" checked={draft.interests.includes(g.id)} onChange={e => toggleInterest(g.id, e.target.checked)} />
            <span>{g.title}{g.source === "ai" && <span className="ml-2 inline-flex items-center gap-1 rounded-md border-2 px-2 text-base"><Sparkles className="size-4" /> Creada para ti</span>}</span>
          </label>
          {g.source === "ai" && (
            <Button variant="outline" size="icon" aria-label={`Quitar la guía ${g.title}`} onClick={() => { removeGuide(g.id); toggleInterest(g.id, false) }}>
              <Trash2 />
            </Button>
          )}
        </li>
      ))}
    </ul>

    {error && <p role="alert">{error}</p>}
    <Button size="xl" onClick={save}>Guardar perfil</Button>
  </div>
}
