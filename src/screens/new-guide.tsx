import { useEffect, useRef, useState } from "react"
import { Lightbulb, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScreenHeader } from "@/components/screen-header"
import { VoiceCommand } from "@/components/voice-command"
import { isIntent, reminderConfirmation, speechText } from "@/lib/commands"
import { speak, stopSpeaking } from "@/lib/voice"
import { load } from "@/lib/storage"
import { defaultProfile } from "@/lib/profile"
import { addGuide, useGuides } from "@/lib/guides-store"
import { generateGuide, suggestTopics, type TopicSuggestion } from "@/lib/ai"


type Props = { initialPhrase?: string; onCancel: () => void; onCreated: (guideId: string) => void }

const ASK = "¿Qué te gustaría aprender? Por ejemplo: mandar fotos por WhatsApp. Si no sabes, di: dame ideas."
const ORDINALS = ["Uno", "Dos", "Tres", "Cuatro"]

export function NewGuideScreen({ initialPhrase, onCancel, onCreated }: Props) {
  const profile = load("profile", defaultProfile)
  const guides = useGuides()
  // La frase que llegó del inicio o de la lista. Si es vaga ("enséñame") o pide ideas, no es un tema.
  const [first] = useState(() => {
    if (!initialPhrase) return ""
    const s = speechText(initialPhrase)
    return isVague(s) || wantsIdeas(s) ? "" : readTopic(initialPhrase)
  })
  const [topic, setTopic] = useState(first)
  const [phrase, setPhrase] = useState(first)
  const [question, setQuestion] = useState("")
  const [ideas, setIdeas] = useState<TopicSuggestion[]>([])
  const [busy, setBusy] = useState<"" | "ideas" | "guide">("")
  const abortRef = useRef<AbortController | null>(null)
  useEffect(() => () => { abortRef.current?.abort() }, [])

  const confirmText = (t: string) => `Quieres aprender: ${t}. ¿Te preparo la guía?`

  // Igual que en los avisos: si llegó una frase desde el inicio, se confirma en voz alta.
  useEffect(() => {
    if (!initialPhrase) return
    if (wantsIdeas(speechText(initialPhrase))) { void loadIdeas(); return }
    void speak(first ? confirmText(first) : ASK).catch(() => {})
  }, [])

  function setNewTopic(t: string) {
    setTopic(t); setPhrase(t); setQuestion("")
    void speak(confirmText(t)).catch(() => {})
  }

  async function create() {
    if (busy) return
    if (!topic.trim()) { setQuestion(ASK); void speak(ASK).catch(() => {}); return }
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setBusy("guide"); setQuestion("")
    const announce = speak(`Muy bien. Estoy preparando tu guía para ${topic}. Dame unos segundos.`).catch(() => {})
    try {
      const guide = await generateGuide(topic, { phoneModel: profile.phoneModel, routine: profile.routine }, abortRef.current.signal)
      addGuide(guide)
      await announce
      onCreated(guide.id)
    } catch (e) {
      if ((e as Error).name === "AbortError") return
      await stopSpeaking()
      const message = (e as Error).message
      setQuestion(message); void speak(message).catch(() => {})
    } finally {
      setBusy("")
    }
  }

  async function loadIdeas() {
    if (busy) return
    setBusy("ideas"); setQuestion("")
    void speak("Déjame pensar en algunas ideas para ti.").catch(() => {})
    try {
      const found = await suggestTopics({ phoneModel: profile.phoneModel, routine: profile.routine }, guides.map(g => g.title))
      if (!found.length) throw new Error("No se me ocurrieron ideas. Dime con tus palabras qué quieres aprender.")
      setIdeas(found)
      const list = found.map((t, i) => `${ORDINALS[i]}: ${t.title}.`).join(" ")
      void speak(`Te propongo ${found.length} ideas. ${list} ¿Cuál te gustaría? Toca el micrófono y di el número.`).catch(() => {})
    } catch (e) {
      const message = (e as Error).message
      setQuestion(message); void speak(message).catch(() => {})
    } finally {
      setBusy("")
    }
  }

  function command(raw: string, written = false) {
    if (busy === "guide") throw new Error("Estoy preparando tu guía. Espera un momento, por favor.")
    if (isIntent(raw, "cancel") || isIntent(raw, "back")) { onCancel(); return }
    if (isIntent(raw, "repeat")) { void speak(topic ? confirmText(topic) : ASK).catch(() => {}); return }

    const s = speechText(raw)
    // "La dos": elegir una de las ideas que se leyeron.
    if (ideas.length && !written) {
      const pick = pickIdea(raw, ideas)
      if (pick) { setNewTopic(pick.title); return }
    }
    if (wantsIdeas(s)) { void loadIdeas(); return }

    // "Sí" / "prepárala" / "no" — misma lógica de confirmación que los avisos.
    const confirmation = reminderConfirmation(raw)
    if (confirmation === "save" || (topic && /^(?:si|claro|sale|va|ok|okey|esta bien|preparala|creala|hazla|adelante)\b/.test(s))) { void create(); return }
    if (confirmation === "change") {
      setTopic(""); setPhrase(""); setQuestion(ASK)
      void speak("De acuerdo, todavía no la preparo. " + ASK).catch(() => {})
      return
    }

    if (isVague(s)) { setQuestion(ASK); void speak(ASK).catch(() => {}); return }
    const next = readTopic(raw)
    if (!next) throw new Error(ASK)
    setNewTopic(next)
  }

  return <div className="flex flex-col gap-6">
    <ScreenHeader onBack={onCancel} helpText="Toca el micrófono y di lo que quieres aprender con tus palabras. Te repito lo que entendí; si está bien, di sí y preparo la guía. Si no sabes qué aprender, di: dame ideas." />
    <header><h1 className="home-greeting">¿Qué quieres aprender?</h1></header>
    <VoiceCommand onCommand={command} hint="Di lo que quieres aprender. Por ejemplo: mandar fotos por WhatsApp. Si no sabes, di: dame ideas." />

    <form className="phrase-input" onSubmit={e => { e.preventDefault(); command(phrase, true) }}>
      <Label htmlFor="tema">Lo que quieres aprender · puedes editarlo</Label>
      <textarea id="tema" rows={2} value={phrase} onChange={e => setPhrase(e.target.value)} placeholder="Mandar fotos por WhatsApp" />
      <button type="submit" className="text-action" disabled={!phrase.trim() || !!busy}>Revisar frase</button>
    </form>

    <section className="reminder-note" aria-label="Resumen de la guía" aria-live="polite">
      <p className="eyebrow">Así queda tu guía</p>
      <h2>{topic || "Lo que quieres aprender"}</h2>
      <p>{busy === "guide" ? "Preparando los pasos… dame unos segundos." : topic ? "Pasos cortos, uno a la vez, con voz." : "Dímelo al micrófono."}</p>
    </section>

    {question && <p className="clarification" role="alert">{question}</p>}

    <Button size="xl" onClick={() => void create()} disabled={!topic.trim() || !!busy}>
      <Wand2 aria-hidden="true" /> {busy === "guide" ? "Preparando tu guía…" : "Preparar mi guía"}
    </Button>

    {ideas.length === 0 ? (
      <Button variant="outline" className="min-h-16 text-xl" disabled={!!busy} onClick={() => void loadIdeas()}>
        <Lightbulb aria-hidden="true" /> {busy === "ideas" ? "Buscando ideas…" : "No sé, dame ideas"}
      </Button>
    ) : (
      <section className="flex flex-col gap-3" aria-labelledby="ideas">
        <h2 id="ideas" className="text-2xl font-bold">Ideas para ti</h2>
        <ol className="flex flex-col gap-3">
          {ideas.map((t, i) => (
            <li key={t.title}>
              <Button variant="outline" className="h-auto min-h-20 w-full flex-col items-start gap-1 whitespace-normal px-5 py-4 text-left" disabled={!!busy} onClick={() => setNewTopic(t.title)}>
                <span className="text-xl font-bold">{i + 1}. {t.title}</span>
                <span className="text-lg font-normal">{t.why}</span>
              </Button>
            </li>
          ))}
        </ol>
      </section>
    )}
  </div>
}

/* ---------- Ayudas para entender la frase ---------- */

/** Quita "quiero aprender a", "enséñame a", "¿cómo se…?" y deja el tema con mayúscula inicial. */
function readTopic(raw: string) {
  const t = raw
    .replace(/^[\s¿¡]+/, "")
    .replace(/^(?:oye|por favor)[,\s]+/i, "")
    .replace(/^(?:yo\s+)?(?:quiero|quisiera|me gustar[ií]a|necesito)\s+/i, "")
    .replace(/^(?:aprender|ens[eé][nñ]ame|expl[ií]came)\s+(?:a|c[oó]mo)\s+/i, "")
    .replace(/^(?:aprender|ens[eé][nñ]ame|expl[ií]came)\s+/i, "")
    .replace(/[\s.?!¿¡]+$/, "")
    .trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : ""
}

/** "dame ideas", "no sé", "sugiéreme", "¿qué puedo aprender?" */
const wantsIdeas = (s: string) =>
  /^(?:no se,? )?(?:dame |dime |tienes |unas |algunas )?(?:ideas?|sugerencias?)\b|\b(?:sugiereme|recomiendame|que me recomiendas|que puedo aprender)\b|^no se(?: que(?: aprender)?)?$|^lo que sea$/.test(s)

/** Pide aprender, pero sin decir qué. */
const isVague = (s: string) =>
  /^(?:aprender|aprende|ensename|ensename algo|aprender algo(?: nuevo)?|algo nuevo|otra cosa|nueva guia|crear (?:una )?guia|hacer (?:una )?guia)$/.test(s)

const NUMBER_WORDS: [RegExp, number][] = [
  [/\b(1|uno|una|primera?o?)\b/, 0],
  [/\b(2|dos|segunda?o?)\b/, 1],
  [/\b(3|tres|tercera?o?)\b/, 2],
  [/\b(4|cuatro|cuarta?o?|ultima?o?)\b/, 3],
]

/** Elige una idea por número ("la dos") o por palabras de su título. */
function pickIdea(raw: string, ideas: TopicSuggestion[]) {
  const s = speechText(raw)
  // Solo respuestas cortas cuentan como número, para no confundir "mandar una foto".
  if (s.split(" ").length <= 3) for (const [re, i] of NUMBER_WORDS) if (re.test(s) && ideas[i]) return ideas[i]
  const words = s.split(" ").filter(w => w.length > 3)
  if (!words.length) return undefined
  const best = ideas
    .map(t => ({ t, hits: words.filter(w => speechText(t.title).includes(w)).length }))
    .sort((a, b) => b.hits - a.hits)[0]
  return best && best.hits >= 2 ? best.t : undefined
}