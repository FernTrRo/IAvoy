import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Mic, MicOff, Square, LoaderCircle, Volume2 } from "lucide-react"
import { HoldHelp } from "@/components/hold-help"
import { isIntent } from "@/lib/commands"
import { canListen, listenOnce, finishListening, stopListening, stopSpeaking, speak } from "@/lib/voice"

type Handler = { onCommand: (text: string) => void | Promise<void>; hint: string; onListening?: (active: boolean) => void; priority?: number }
type Entry = { id: symbol; host: HTMLElement; handler: { current: Handler }; order: number }
const VoiceContext = createContext<((entry: Omit<Entry, "order">) => () => void) | null>(null)

/** Un solo micrófono. Su portal permanece dentro del diálogo activo para respetar el foco modal. */
export function VoiceProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [phase, setPhase] = useState<"idle" | "listening" | "working" | "error">("idle")
  const [message, setMessage] = useState("")
  const [speaking, setSpeaking] = useState(false)
  const [helpMessage, setHelpMessage] = useState("")
  const closeHelp = useCallback(() => setHelpMessage(""), [])
  const explain = useCallback((text: string) => {
    session.current++
    void stopListening()
    setPhase("idle")
    setHelpMessage(text)
  }, [])
  useEffect(() => {
    const update = (event: Event) => setSpeaking((event as CustomEvent<boolean>).detail)
    window.addEventListener("iarecuerdo:speaking", update)
    return () => window.removeEventListener("iarecuerdo:speaking", update)
  }, [])
  const serial = useRef(0)
  const session = useRef(0)
  const busy = useRef(false)
  const register = useCallback((entry: Omit<Entry, "order">) => {
    const full = { ...entry, order: serial.current++ }
    setEntries(old => [...old, full])
    return () => setEntries(old => old.filter(item => item.id !== entry.id))
  }, [])
  const target = [...entries].sort((a, b) => (b.handler.current.priority ?? 0) - (a.handler.current.priority ?? 0) || b.order - a.order)[0]
  const targetRef = useRef(target)
  targetRef.current = target
  useEffect(() => {
    session.current++
    setPhase("idle"); setMessage("")
    document.body.classList.remove("voice-has-feedback")
    if (busy.current) void stopListening()
    return () => { session.current++; void stopListening() }
  }, [target?.id])
  async function toggle() {
    if (busy.current) {
      if (phase === "listening") {
        setPhase("working")
        finishListening()
      }
      return
    }
    if (!target) return
    const request = ++session.current
    const selected = target
    busy.current = true
    setPhase("listening"); setMessage("")
    selected.handler.current.onListening?.(true)
    try {
      await stopSpeaking()
      const text = await listenOnce()
      if (request !== session.current || targetRef.current?.id !== selected.id) return
      selected.handler.current.onListening?.(false)
      if (!text.trim()) throw new Error("No escuché nada. Toca el micrófono e inténtalo otra vez.")
      setPhase("working"); setMessage(`Escuché: ${text}`)
      if (isIntent(text, "home")) {
        setPhase("working")
        const question = "¿Seguro que desea regresar al inicio?"
        setMessage(question)
        await speak(question)
        if (request !== session.current) return
        setPhase("listening")
        selected.handler.current.onListening?.(true)
        const answer = await listenOnce()
        selected.handler.current.onListening?.(false)
        if (request !== session.current) return
        if (isIntent(answer, "yes")) {
          window.dispatchEvent(new CustomEvent("iarecuerdo:home-confirmed"))
          setMessage("Regresando al inicio")
        } else if (isIntent(answer, "no")) {
          setMessage("De acuerdo, permaneces en esta pantalla")
          await speak("De acuerdo, permaneces en esta pantalla")
        } else {
          throw new Error("Di sí para regresar al inicio o no para continuar aquí.")
        }
      } else if (isIntent(text, "help")) {
        setMessage(selected.handler.current.hint)
        void speak(selected.handler.current.hint).catch(() => {})
      } else await selected.handler.current.onCommand(text)
      if (request === session.current) setPhase("idle")
    } catch (error) {
      if (request !== session.current) return
      const explanation = error instanceof Error ? error.message : "No se pudo escuchar. Inténtalo otra vez."
      setPhase("error"); setMessage(explanation)
      void speak(explanation).catch(() => {})
    } finally {
      busy.current = false
      selected.handler.current.onListening?.(false)
    }
  }
  useEffect(() => { document.body.classList.toggle("voice-has-feedback", !!message); return () => document.body.classList.remove("voice-has-feedback") }, [message])
  const available = canListen()
  const label = !available ? "Micrófono no disponible" : phase === "listening" ? "Detener escucha" : phase === "working" ? "Procesando" : "Activar micrófono"
  return <VoiceContext.Provider value={register}>{children}{target && createPortal(
    <><HoldHelp key={target.id.toString() + target.order} onExplain={explain} onClose={closeHelp} />
    <div className="voice-dock" data-state={speaking ? "speaking" : available ? phase : "unavailable"}>
      {(helpMessage || message) && <p className="voice-feedback" role={phase === "error" ? "alert" : "status"}><span className="voice-feedback-text">{helpMessage || message}{helpMessage && <small className="hold-help-dismiss">Suelta el botón para continuar.</small>}</span></p>}
      <div className="voice-dock-row">
        <span className="voice-state" aria-live="polite">{speaking ? "Hablando" : !available ? "Sin micrófono" : phase === "listening" ? "Te escucho" : phase === "working" ? "Un momento" : phase === "error" ? "Intenta de nuevo" : "Micrófono apagado"}</span>
        <button type="button" className="voice-orb" onClick={toggle} aria-label={label} aria-pressed={phase === "listening"} disabled={!available || phase === "working"} title={target.handler.current.hint}>
          {speaking ? <Volume2 aria-hidden="true" /> : phase === "listening" ? <Square aria-hidden="true" /> : phase === "working" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : !available ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
        </button>
      </div>
    </div></>, target.host
  )}</VoiceContext.Provider>
}

/** Registra el contexto de esta pantalla; no dibuja controles repetidos. */
export function VoiceCommand(props: Handler) {
  const register = useContext(VoiceContext)
  const host = useRef<HTMLDivElement>(null)
  const handler = useRef(props)
  handler.current = props
  useEffect(() => {
    if (!register || !host.current) return
    return register({ id: Symbol("voice-screen"), host: host.current, handler })
  }, [register])
  return <div ref={host} className="voice-host" />
}
