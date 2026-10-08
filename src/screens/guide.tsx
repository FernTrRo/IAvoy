import { useEffect } from "react"
import { ArrowLeft, ArrowRight, MessageCircle, Video, Play, RotateCcw, Bookmark, Sparkles } from "lucide-react"
import { ScreenHeader } from "@/components/screen-header"
import { Button } from "@/components/ui/button"
import { speak, stopSpeaking } from "@/lib/voice"
import { VoiceCommand } from "@/components/voice-command"
import { guideTopic, isIntent, speechText } from "@/lib/commands"
import { load } from "@/lib/storage"
import { defaultProfile } from "@/lib/profile"
import { findGuide, useGuides } from "@/lib/guides-store"
import { aiAvailable } from "@/lib/ai"

const guideLabels: Record<string, { title: string; subtitle: string; say: string; icon: typeof MessageCircle }> = {
  "whatsapp-nota": { title: "Envía un audio", subtitle: "WhatsApp", say: "Enséñame a mandar un audio por wasa", icon: MessageCircle },
  videollamada: { title: "Contesta una videollamada", subtitle: "Videollamadas", say: "Quiero aprender videollamadas", icon: Video },
}

type GuideListProps = { progress: Record<string, number>; onBack: () => void; onOpen: (id: string) => void; onNewGuide: (phrase?: string) => void }
export function GuideListScreen({ progress, onBack, onOpen, onNewGuide }: GuideListProps) {
  const profile = load("profile", defaultProfile)
  const guides = useGuides()
  const ai = aiAvailable()
  const hint = ai
    ? "Di el nombre de una actividad, o lo que quieres aprender. Por ejemplo: quiero aprender a mandar fotos."
    : "Di: enséñame a mandar un audio por wasa, o quiero aprender videollamadas."
  return <div className="learning-room">
    <ScreenHeader onBack={onBack} helpText={ai
      ? "Toca una actividad para empezar. Para aprender algo nuevo, toca el micrófono y dilo con tus palabras, o toca Aprender algo nuevo. Cada actividad conserva su avance."
      : "Elige una actividad o pídela al micrófono con tus palabras. Cada actividad conserva su avance."} />
    <header className="learning-heading"><h1>Hoy aprendo<br /><em>a mi ritmo.</em></h1></header>
    <VoiceCommand hint={hint} onCommand={text => {
      if (isIntent(text, "back")) { onBack(); return }
      const topicId = guideTopic(text)
      const s = speechText(text)
      const exact = guides.find(g => speechText(g.title) === s)
      // "WhatsApp" solo abre la guía de audios si pide audios; si pide otra cosa (fotos, stickers…), es una guía nueva.
      const specific = topicId === "videollamada" || (topicId === "whatsapp-nota" && /\b(audios?|notas? de voz|mensajes? de voz)\b/.test(s))
      const guide = exact ?? (specific || !ai ? guides.find(g => g.id === topicId) : undefined)
      if (guide) { onOpen(guide.id); return }
      // Igual que "recuérdame…" abre la pantalla de avisos con la frase, aquí se abre "¿Qué quieres aprender?".
      if (ai) { if (!isIntent(text, "guides")) onNewGuide(text); return }
      throw new Error(topicId === "youtube" ? "Entendí YouTube. Esa actividad todavía no está disponible. Puedes elegir audios de WhatsApp o videollamadas." : "Puedes pedirme audios de WhatsApp o videollamadas.")
    }} />
    {ai && (
      <Button size="xl" onClick={() => onNewGuide()}>
        <span className="grid size-13 shrink-0 place-items-center"><Sparkles aria-hidden="true" /></span>
        Aprender algo nuevo
      </Button>
    )}
    {guides.length === 0 && (
      <p className="clarification">Todavía no tienes guías. Toca “Aprender algo nuevo” o dime al micrófono qué quieres aprender.</p>
    )}
    <ol className="activity-shelf">
      {guides.map((g, index) => {
        const step = Math.max(0, Math.min(progress[g.id] ?? 0, g.steps.length - 1))
        const isAi = g.source === "ai"
        const label = guideLabels[g.id]; const Icon = label?.icon ?? (isAi ? Sparkles : Play)
        return <li key={g.id} className={`activity-entry activity-${index}`}>
          <button className="activity-open" onClick={() => onOpen(g.id)} aria-label={`${step ? "Continuar" : "Empezar"}: ${g.title}`}>
            <span className="activity-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <span className="activity-copy"><span className="activity-topic"><Icon aria-hidden="true" />{label?.subtitle ?? (isAi ? "Creada para ti" : g.title)}</span><strong>{label?.title ?? g.title}</strong><span className="activity-progress">{step ? `Retomar en el paso ${step + 1} de ${g.steps.length}` : `${g.steps.length} pasos, sin prisa`}{profile.interests.includes(g.id) && <span className="suggested-note">Elegida para ti</span>}</span></span>
            <ArrowRight aria-hidden="true" className="activity-arrow" />
          </button>
        </li>
      })}
    </ol>
    <p className="learning-footnote"><Bookmark aria-hidden="true" /> Tu avance se guarda.</p>
  </div>
}

type GuideProps = { guideId: string; step: number; onStep: (n: number) => void; onBack: () => void; onFinish: () => void }
export function GuideScreen(props: GuideProps) {
  useGuides() // vuelve a dibujar si la lista de guías cambia
  const guide = findGuide(props.guideId)
  const { onBack } = props
  // La guía pudo borrarse desde el perfil: en lugar de fallar, se regresa a la lista.
  useEffect(() => { if (!guide) onBack() }, [guide, onBack])
  if (!guide) return null
  return <GuideLesson {...props} guide={guide} />
}

function GuideLesson({ guide, step, onStep, onBack, onFinish }: GuideProps & { guide: NonNullable<ReturnType<typeof findGuide>> }) {
  step = Math.max(0, Math.min(step, guide.steps.length - 1))
  const current = guide.steps[step]; const isLast = step === guide.steps.length - 1
  const spoken = `Paso ${step + 1}. ${current.title}. ${current.body}`
  useEffect(() => { void speak(spoken).catch(() => {}); return () => void stopSpeaking() }, [spoken])
  const next = () => { if (isLast) onFinish(); else onStep(step + 1) }
  return <div className="lesson-room">
    <ScreenHeader onBack={onBack} helpText="Toca el micrófono para decir sigue, vuelve al paso anterior, otra vez o luego sigo. Tu avance se guarda al cambiar de paso." />
    <VoiceCommand hint="Di: sigue, atrás, otra vez, más lento o luego sigo." onCommand={text => {
      if (isIntent(text, "next") || isIntent(text, "done")) next()
      else if (isIntent(text, "back")) onStep(Math.max(0, step - 1))
      else if (isIntent(text, "repeat") || isIntent(text, "slow")) void speak(spoken, { rate: isIntent(text, "slow") ? 0.75 : 0.9 }).catch(() => {})
      else if (isIntent(text, "pause") || isIntent(text, "close") || isIntent(text, "guides")) onBack()
      else throw new Error("Puedes decir sigue, atrás, otra vez, más lento o luego sigo.")
    }} />
    <p className="lesson-topic">{guide.title}</p>
    <section className="lesson-page" aria-label={`Paso ${step + 1} de ${guide.steps.length}`}>
      <div className="lesson-position"><span>Ahora, solo esto</span><span>{String(step + 1).padStart(2, "0")} / {String(guide.steps.length).padStart(2, "0")}</span></div>
      <h1>{current.title}</h1><p className="lesson-instruction">{current.body}</p>
      <div className="lesson-markers" aria-hidden="true">{guide.steps.map((_, i) => <span key={i} className={i <= step ? "reached" : ""} />)}</div>
      <button className="text-action lesson-repeat" onClick={() => void speak(spoken, { rate: 0.75 }).catch(() => {})}><RotateCcw aria-hidden="true" /> Escucharlo otra vez</button>
    </section>
    <nav className="lesson-navigation" aria-label="Pasos de la actividad"><button disabled={step === 0} onClick={() => onStep(step - 1)}><ArrowLeft aria-hidden="true" /> Anterior</button><button onClick={next}>{isLast ? "Terminé" : "Ya está, seguimos"}<ArrowRight aria-hidden="true" /></button></nav>
    <p className="lesson-pause">Si necesitas descansar, di “luego sigo”.</p>
    {guide.source === "ai" && <p className="lesson-pause">Guía creada con IA. Si un paso no coincide con tu teléfono, pide ayuda a tu tutor.</p>}
    <details className="manual-settings"><summary>¿Cómo uso otra aplicación?</summary><p>Usa Inicio o el gesto de inicio de tu teléfono. No cierres IAvoy. Vuelve aquí para seguir con el siguiente paso; el micrófono aún no escucha desde otras aplicaciones.</p></details>
  </div>
}