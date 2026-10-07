import { useEffect } from "react"
import { ArrowLeft, ArrowRight, MessageCircle, Video, Play, RotateCcw, Bookmark } from "lucide-react"
import { ScreenHeader } from "@/components/screen-header"
import { speak, stopSpeaking } from "@/lib/voice"
import { guides } from "@/data/demo"
import { VoiceCommand } from "@/components/voice-command"
import { guideTopic, isIntent, speechText } from "@/lib/commands"
import { load } from "@/lib/storage"
import { defaultProfile } from "@/lib/profile"

const guideLabels: Record<string, { title: string; subtitle: string; say: string; icon: typeof MessageCircle }> = {
  "whatsapp-nota": { title: "Envía un audio", subtitle: "WhatsApp", say: "Enséñame a mandar un audio por wasa", icon: MessageCircle },
  videollamada: { title: "Contesta una videollamada", subtitle: "Videollamadas", say: "Quiero aprender videollamadas", icon: Video },
}

type GuideListProps = { progress: Record<string, number>; onBack: () => void; onOpen: (id: string) => void }
export function GuideListScreen({ progress, onBack, onOpen }: GuideListProps) {
  const profile = load("profile", defaultProfile)
  return <div className="learning-room">
    <ScreenHeader onBack={onBack} helpText="Elige una actividad o pídela al micrófono con tus palabras. Cada actividad conserva su avance." />
    <header className="learning-heading"><h1>Hoy aprendo<br /><em>a mi ritmo.</em></h1></header>
    <VoiceCommand hint="Di: enséñame a mandar un audio por wasa, o quiero aprender videollamadas." onCommand={text => {
      if (isIntent(text, "back")) { onBack(); return }
      const topic = guideTopic(text)
      const guide = guides.find(g => g.id === topic || speechText(g.title) === speechText(text))
      if (!guide) throw new Error(topic === "youtube" ? "Entendí YouTube. Esa actividad todavía no está disponible. Puedes elegir audios de WhatsApp o videollamadas." : "Puedes pedirme audios de WhatsApp o videollamadas.")
      onOpen(guide.id)
    }} />
    <ol className="activity-shelf">
      {guides.map((g, index) => {
        const step = Math.max(0, Math.min(progress[g.id] ?? 0, g.steps.length - 1))
        const label = guideLabels[g.id]; const Icon = label?.icon ?? Play
        return <li key={g.id} className={`activity-entry activity-${index}`}>
          <button className="activity-open" onClick={() => onOpen(g.id)} aria-label={`${step ? "Continuar" : "Empezar"}: ${g.title}`}>
            <span className="activity-number" aria-hidden="true">0{index + 1}</span>
            <span className="activity-copy"><span className="activity-topic"><Icon aria-hidden="true" />{label?.subtitle ?? g.title}</span><strong>{label?.title ?? g.title}</strong><span className="activity-progress">{step ? `Retomar en el paso ${step + 1} de ${g.steps.length}` : `${g.steps.length} pasos, sin prisa`}{profile.interests.includes(g.id) && <span className="suggested-note">Elegida para ti</span>}</span></span>
            <ArrowRight aria-hidden="true" className="activity-arrow" />
          </button>
        </li>
      })}
    </ol>
    <p className="learning-footnote"><Bookmark aria-hidden="true" /> Tu avance se guarda.</p>
  </div>
}

type GuideProps = { guideId: string; step: number; onStep: (n: number) => void; onBack: () => void; onFinish: () => void }
export function GuideScreen({ guideId, step, onStep, onBack, onFinish }: GuideProps) {
  const guide = guides.find(g => g.id === guideId)!
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
    <details className="manual-settings"><summary>¿Cómo uso otra aplicación?</summary><p>Usa Inicio o el gesto de inicio de tu teléfono. No cierres IA-Recuerdo. Vuelve aquí para seguir con el siguiente paso; el micrófono aún no escucha desde otras aplicaciones.</p></details>
  </div>
}
