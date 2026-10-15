/**
 * Mi perfil y tutor.
 *
 * La llena el tutor junto con la persona mayor. Al guardar, la app prepara 3 guías con IA
 * a partir de sus gustos y, al terminar, abre Mis guías.
 *
 */
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Check, CircleAlert, LoaderCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { ScreenHeader } from "@/components/screen-header"
import { VoiceCommand } from "@/components/voice-command"
import type { Profile } from "@/lib/profile"
import { isIntent, speechText } from "@/lib/commands"
import { load, save as store } from "@/lib/storage"
import { speak } from "@/lib/voice"
import { addGuide, useGuides } from "@/lib/guides-store"
import { aiAvailable, generateGuide, suggestTopics } from "@/lib/ai"
import { PHONE_BRANDS, OTHER_BRAND, UNKNOWN, describePhone, findBrand, findBrandInText } from "@/data/phones"
import { cn } from "@/lib/utils"

type Props = {
  profile: Profile
  /** Guarda el perfil. Devuelve false si no se pudo guardar. */
  onSave: (p: Profile) => boolean
  onBack: () => void
  onOpenGuide?: (id: string) => void
  onOpenGuides?: () => void
}

const GUIDES_TO_CREATE = 3
/** Con un solo gusto tocado ya alcanza (el más corto tiene 15 letras). */
const MIN_ROUTINE = 12
const ROUTINE_KEY = "guidesRoutine"

/** H6: gustos que se tocan en lugar de escribirse. */
const ROUTINE_IDEAS = [
  "Habla con su familia por videollamada",
  "Manda mensajes por WhatsApp",
  "Va al médico cada mes",
  "Paga recibos de luz y agua",
  "Le gusta cocinar",
  "Ve videos y novelas",
  "Escucha música",
  "Sale a caminar",
  "Usa taxi o transporte",
  "Le gustan las plantas",
]

type Field = "name" | "tutorName" | "tutorPhone" | "phoneBrand" | "phoneExact" | "routine"
type Errors = Partial<Record<Field, string>>
type GenPhase = "idle" | "working" | "error"

const FIELD_ORDER: Field[] = ["name", "tutorName", "tutorPhone", "phoneBrand", "phoneExact", "routine"]
const FIELD_NAMES: Record<Field, string> = {
  name: "Su nombre",
  tutorName: "Nombre del tutor",
  tutorPhone: "Teléfono del tutor",
  phoneBrand: "Marca del teléfono",
  phoneExact: "Modelo del teléfono",
  routine: "Sus gustos",
}

const digits = (s: string) => s.replace(/\D/g, "")
const routineReady = (r: string) => r.trim().length >= MIN_ROUTINE

/** H5 + H9: reglas por campo, con mensajes que dicen cómo corregir. */
function validate(d: Profile, needsRoutine: boolean): Errors {
  const e: Errors = {}
  if (!d.name.trim()) e.name = "Escribe cómo le gusta que le digan."
  const phone = digits(d.tutorPhone)
  if (phone && !(phone.length === 10 || (phone.length === 12 && phone.startsWith("52"))))
    e.tutorPhone = `Debe tener 10 números (tiene ${phone.length}).`
  if (d.phoneBrand === OTHER_BRAND && !d.phoneExact?.trim()) e.phoneExact = "Escribe la marca y el modelo."
  if (needsRoutine && !routineReady(d.routine))
    e.routine = d.routine.trim() ? "Cuéntanos un poco más, o toca uno de sus gustos." : "Toca al menos uno de sus gustos. Sin esto no podemos preparar sus guías."
  return e
}

export function SettingsScreen({ profile, onSave, onBack, onOpenGuides }: Props) {
  const allGuides = useGuides()
  const myGuides = allGuides.filter((g) => g.source === "ai")
  const [saved, setSaved] = useState(profile)
  const [draft, setDraft] = useState(profile)
  const [errors, setErrors] = useState<Errors>({})
  const [confirmExit, setConfirmExit] = useState(false)
  const [phase, setPhase] = useState<GenPhase>("idle")
  /** 0 = eligiendo temas; 1, 2, 3 = preparando esa guía. */
  const [genStep, setGenStep] = useState(0)
  const [genMessage, setGenMessage] = useState("")
  const abortRef = useRef<AbortController | null>(null)
  useEffect(() => () => { abortRef.current?.abort() }, [])

  const ai = aiAvailable()
  const who = draft.name.trim() || "la persona"
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const generating = phase === "working"
  const brand = findBrand(draft.phoneBrand)
  const errorList = FIELD_ORDER.filter((f) => errors[f])

  // H1: cuántos datos lleva.
  const filled = [
    !!draft.name.trim(),
    !!draft.tutorName.trim(),
    !!draft.tutorPhone.trim(),
    !!draft.phoneBrand && draft.phoneBrand !== UNKNOWN,
    routineReady(draft.routine),
  ].filter(Boolean).length

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    if (errors[key as Field]) setErrors((e) => ({ ...e, [key]: undefined }))
  }
  /** H5: revisa un campo al salir de él, no mientras se escribe. */
  const check = (field: Field) => setErrors((e) => ({ ...e, [field]: validate(draft, false)[field] }))

  /** H9: lleva al campo con el error. */
  const goTo = (field: Field) => {
    const el = document.getElementById(field)
    el?.scrollIntoView({ behavior: "smooth", block: "center" })
    el?.focus({ preventScroll: true })
  }

  /** H6: tocar un gusto lo agrega o lo quita de la rutina. */
  const hasIdea = (idea: string) => draft.routine.toLowerCase().includes(idea.toLowerCase())
  function toggleIdea(idea: string) {
    const current = draft.routine.trim()
    if (hasIdea(idea)) {
      set("routine", current.replace(new RegExp(`\\s*${idea.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.?`, "i"), "").trim())
    } else {
      set("routine", `${current}${current && !/[.!?]$/.test(current) ? "." : ""} ${idea}.`.trim())
    }
  }

  function chooseBrand(id: string) {
    setDraft((d) => ({ ...d, phoneBrand: id, phoneSeries: undefined, phoneExact: id === OTHER_BRAND ? d.phoneExact : undefined }))
    setErrors((e) => ({ ...e, phoneExact: undefined }))
  }

  function saveProfile() {
    const found = validate(draft, ai)
    setErrors(found)
    const first = FIELD_ORDER.find((f) => found[f])
    if (first) {
      goTo(first)
      const missing = FIELD_ORDER.filter((f) => found[f]).map((f) => FIELD_NAMES[f].toLowerCase())
      throw new Error(`Falta revisar: ${missing.join(", ")}.`)
    }
    const next: Profile = {
      ...draft,
      name: draft.name.trim(),
      tutorName: draft.tutorName.trim(),
      tutorPhone: digits(draft.tutorPhone),
      routine: draft.routine.trim(),
      phoneModel: describePhone(draft.phoneBrand, draft.phoneSeries, draft.phoneExact),
    }
    if (!onSave(next)) return
    setSaved(next); setDraft(next)

    // Guías automáticas: la primera vez, o cuando sus gustos cambiaron.
    const lastRoutine = load(ROUTINE_KEY, "")
    if (ai && (next.routine !== lastRoutine || myGuides.length === 0)) {
      void generate(next)
    } else {
      toast.success("Perfil guardado")
      onBack()
    }
  }

  /** Crea las 3 guías con un cargador encima (H1). Al terminar, abre Mis guías. */
  async function generate(p: Profile) {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const ctx = { phoneModel: p.phoneModel, routine: p.routine }
    setPhase("working"); setGenStep(0)
    setGenMessage(`Pensando qué le sirve aprender a ${p.name}…`)
    try {
      const topics = (await suggestTopics(ctx, allGuides.map((g) => g.title), controller.signal)).slice(0, GUIDES_TO_CREATE).map((t) => t.title)
      if (!topics.length) throw new Error("No encontré ideas con esos gustos. Toca otros y guarda otra vez.")

      const created: string[] = []
      for (let i = 0; i < topics.length; i++) {
        setGenStep(i + 1)
        setGenMessage(`Guía ${i + 1} de ${topics.length}: ${topics[i]}`)
        try {
          const guide = await generateGuide(topics[i], ctx, controller.signal)
          addGuide(guide)
          created.push(guide.id)
        } catch (e) {
          if ((e as Error).name === "AbortError") throw e
          // Si una falla, se sigue con las demás.
        }
      }
      if (!created.length) throw new Error("Revisa la conexión a internet e inténtalo otra vez.")

      store(ROUTINE_KEY, created.length === topics.length ? p.routine : "")
      const withInterests = { ...p, interests: [...new Set([...p.interests, ...created])] }
      if (onSave(withInterests)) setSaved(withInterests)

      const message = created.length === topics.length
        ? `Listo. Preparé ${created.length} guías para ${p.name}. Están en Mis guías.`
        : `Preparé ${created.length} de ${topics.length} guías. Están en Mis guías.`
      setPhase("idle")
      toast.success(message)
      void speak(message).catch(() => {})
      ;(onOpenGuides ?? onBack)()
    } catch (e) {
      if ((e as Error).name === "AbortError") return
      setPhase("error"); setGenMessage((e as Error).message)
    }
  }

  /** H3: detener. Las guías que ya estaban listas se conservan. */
  function cancelGeneration() {
    abortRef.current?.abort()
    setPhase("idle")
    store(ROUTINE_KEY, "") // al volver a guardar, se intentan de nuevo
    toast("Se detuvo. Las guías que ya estaban listas están en Mis guías.")
  }

  /** H3 + H4: preguntar antes de salir si hay cambios (igual que en los avisos). */
  function requestBack() {
    if (dirty) setConfirmExit(true)
    else onBack()
  }

  function discard() {
    setDraft(saved); setErrors({})
    toast("Cambios descartados")
  }

  /** H7: también se puede llenar por voz. */
  function command(raw: string): void {
    const s = speechText(raw)
    if (confirmExit) {
      if (isIntent(raw, "yes")) onBack()
      else if (isIntent(raw, "no")) setConfirmExit(false)
      else throw new Error("¿Salir sin guardar? Di sí o no.")
      return
    }
    if (isIntent(raw, "save")) { saveProfile(); return }
    if (isIntent(raw, "back") || isIntent(raw, "close")) { requestBack(); return }
    const after = (prefix: RegExp) => raw.replace(prefix, "").trim()
    if (/^(?:mi nombre es|me llamo|me dicen) /.test(s)) { set("name", after(/^.*?(?:mi nombre es|me llamo|me dicen)\s+/i)); return }
    if (/^mi tutor se llama /.test(s)) { set("tutorName", after(/^.*?mi tutor se llama\s+/i)); return }
    if (/^mi rutina es /.test(s)) { set("routine", after(/^.*?mi rutina es\s+/i)); return }
    if (/^mi telefono es /.test(s)) {
      const found = findBrandInText(raw)
      const text = after(/^.*?mi tel[eé]fono es\s+(?:un |una )?/i)
      setDraft((d) => ({ ...d, phoneBrand: found?.id ?? OTHER_BRAND, phoneSeries: undefined, phoneExact: text }))
      return
    }
    throw new Error("Di: me llamo…, mi tutor se llama…, mi teléfono es…, mi rutina es…, o guardar.")
  }

  return <div className="flex flex-col gap-6">
    <ScreenHeader onBack={requestBack} />
    <h1 className="home-greeting">Mi perfil y tutor</h1>
    <VoiceCommand onCommand={command} hint="Di: me llamo…, mi tutor se llama…, mi teléfono es…, mi rutina es…, o guardar." />

    {/* H10 + H1: instrucción breve y avance */}
    <Card className="gap-3">
      <p className="text-xl leading-snug">
        Llénalo junto con {who}.{ai && <> Al guardar, preparamos <strong>{GUIDES_TO_CREATE} guías</strong> en Mis guías.</>}
      </p>
      <p className="text-lg font-semibold" aria-live="polite">Llevas {filled} de 5 datos</p>
      <Progress value={(filled / 5) * 100} aria-label={`Llevas ${filled} de 5 datos`} />
    </Card>

    {/* ---------- 1 ---------- */}
    <Section number={1} title="Su nombre">
      <FieldBox id="name" label="¿Cómo le gusta que le digan?" error={errors.name}>
        <Input id="name" value={draft.name} autoComplete="off" placeholder="Ejemplo: Chuy"
          aria-invalid={!!errors.name} aria-describedby={describedBy("name", errors.name)}
          onChange={(e) => set("name", e.target.value)} onBlur={() => check("name")} />
      </FieldBox>
    </Section>

    {/* ---------- 2 ---------- */}
    <Section number={2} title="Su tutor">
      <FieldBox id="tutorName" label="Nombre" optional error={errors.tutorName}>
        <Input id="tutorName" value={draft.tutorName} autoComplete="off" placeholder="Ejemplo: Ana, su hija"
          onChange={(e) => set("tutorName", e.target.value)} />
      </FieldBox>
      <FieldBox id="tutorPhone" label="Teléfono" optional hint="10 números." error={errors.tutorPhone}>
        <Input id="tutorPhone" type="tel" inputMode="numeric" autoComplete="off" value={draft.tutorPhone} placeholder="55 1234 5678"
          aria-invalid={!!errors.tutorPhone} aria-describedby={describedBy("tutorPhone", errors.tutorPhone)}
          onChange={(e) => set("tutorPhone", e.target.value.replace(/[^\d\s+()-]/g, ""))} onBlur={() => check("tutorPhone")} />
      </FieldBox>
    </Section>

    {/* ---------- 3: botones en lugar de select, se acomodan a cualquier pantalla ---------- */}
    <Section number={3} title="Su teléfono">
      <ChoiceGroup id="phoneBrand" label="Marca" optional>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PHONE_BRANDS.map((b) => (
            <Choice key={b.id} selected={draft.phoneBrand === b.id} onClick={() => chooseBrand(b.id)}>{b.name}</Choice>
          ))}
          <Choice selected={draft.phoneBrand === OTHER_BRAND} onClick={() => chooseBrand(OTHER_BRAND)}>Otra</Choice>
          <Choice selected={draft.phoneBrand === UNKNOWN} onClick={() => chooseBrand(UNKNOWN)}>No sé</Choice>
        </div>
      </ChoiceGroup>

      {draft.phoneBrand === UNKNOWN && (
        <p className="clarification">Viene escrita atrás del teléfono o en <strong>Ajustes → Acerca del teléfono</strong>.</p>
      )}

      {/* H8: la línea aparece solo después de elegir la marca */}
      {brand && (
        <ChoiceGroup id="phoneSeries" label={brand.os === "iphone" ? "¿Cuál iPhone?" : "¿Cuál modelo?"} optional>
          <div className="flex flex-col gap-2">
            {brand.series.map((s) => (
              <Choice key={s.id} wide selected={draft.phoneSeries === s.id} onClick={() => set("phoneSeries", draft.phoneSeries === s.id ? undefined : s.id)}>
                <span className="font-bold">{s.name}</span>
                {s.examples && <span className="text-lg font-normal">{s.examples}</span>}
              </Choice>
            ))}
          </div>
        </ChoiceGroup>
      )}

      {draft.phoneBrand === OTHER_BRAND && (
        <FieldBox id="phoneExact" label="Marca y modelo" error={errors.phoneExact}>
          <Input id="phoneExact" value={draft.phoneExact ?? ""} autoComplete="off" placeholder="Ejemplo: Nokia G21"
            aria-invalid={!!errors.phoneExact} aria-describedby={describedBy("phoneExact", errors.phoneExact)}
            onChange={(e) => set("phoneExact", e.target.value)} onBlur={() => check("phoneExact")} />
        </FieldBox>
      )}
    </Section>

    {/* ---------- 4 ---------- */}
    <Section number={4} title="Sus gustos">
      <ChoiceGroup id="routine-ideas" label={`Toca lo que ${who} hace o le gusta`} error={errors.routine}>
        <div className="flex flex-wrap gap-2">
          {ROUTINE_IDEAS.map((idea) => (
            <Choice key={idea} selected={hasIdea(idea)} onClick={() => toggleIdea(idea)}>{idea}</Choice>
          ))}
        </div>
      </ChoiceGroup>
      <FieldBox id="routine" label="Algo más" optional>
        <Textarea id="routine" rows={3} value={draft.routine} aria-invalid={!!errors.routine}
          placeholder="Ejemplo: Vive sola y habla con sus nietos los domingos."
          onChange={(e) => set("routine", e.target.value)} />
      </FieldBox>
    </Section>

    {/* H9: resumen de lo que falta, justo arriba del botón */}
    {errorList.length > 0 && (
      <div role="alert" className="flex flex-col gap-3 rounded-2xl border-2 border-destructive bg-card p-5">
        <p className="flex items-center gap-2 text-xl font-bold">
          <CircleAlert aria-hidden="true" className="size-7 shrink-0 text-destructive" />
          {errorList.length === 1 ? "Falta 1 dato" : `Faltan ${errorList.length} datos`}
        </p>
        {errorList.map((f) => (
          <Button key={f} variant="outline" className="justify-start" onClick={() => goTo(f)}>{FIELD_NAMES[f]}</Button>
        ))}
      </div>
    )}

    {/* H1 + H3 */}
    {dirty && errorList.length === 0 && (
      <div className="flex flex-wrap items-center justify-between gap-3" role="status">
        <p className="text-lg font-semibold">Tienes cambios sin guardar.</p>
        <Button variant="outline" onClick={discard}>Descartar</Button>
      </div>
    )}

    <Button size="xl" className="justify-center" disabled={generating} onClick={() => { try { saveProfile() } catch { /* el resumen ya lo muestra */ } }}>
      <Check aria-hidden="true" /> Guardar perfil
    </Button>

    {/* ---------- Cargador: estado (H1), detener (H3), reintentar (H9) ---------- */}
    <Dialog open={phase !== "idle"} onOpenChange={() => {}}>
      <DialogContent showClose={false} onPointerDownOutside={(event) => event.preventDefault()} onEscapeKeyDown={(event) => event.preventDefault()}>
        <div className="grid place-items-center pt-2" aria-hidden="true">
          {phase === "error"
            ? <CircleAlert className="size-16 text-destructive" />
            : <LoaderCircle className="size-16 animate-spin text-accion-borde" />}
        </div>
        <DialogTitle className="text-center text-3xl">
          {phase === "error" ? "No se pudieron preparar" : `Preparando sus guías`}
        </DialogTitle>
        <DialogDescription className="text-center text-xl text-foreground" aria-live="polite">{genMessage}</DialogDescription>
        {phase === "working" && <Progress value={(genStep / GUIDES_TO_CREATE) * 100} aria-label={`Guía ${genStep} de ${GUIDES_TO_CREATE}`} />}
        <VoiceCommand priority={200} hint={phase === "error" ? "Di otra vez para reintentar, o cerrar." : "Di detener si quieres pararlo."} onCommand={(raw) => {
          if (phase === "error" && (isIntent(raw, "repeat") || isIntent(raw, "yes"))) { void generate(saved); return }
          if (isIntent(raw, "cancel") || isIntent(raw, "pause") || isIntent(raw, "close") || isIntent(raw, "back")) {
            if (phase === "error") setPhase("idle"); else cancelGeneration()
            return
          }
          throw new Error(phase === "error" ? "Di otra vez para reintentar, o cerrar." : "Estoy preparando las guías. Di detener si quieres pararlo.")
        }} />
        <DialogFooter>
          {phase === "working"
            ? <Button className="min-h-16 text-2xl" variant="outline" onClick={cancelGeneration}>Detener</Button>
            : <>
              <Button className="min-h-16 text-2xl" onClick={() => void generate(saved)}>Reintentar</Button>
              <Button className="min-h-16 text-2xl" variant="outline" onClick={() => setPhase("idle")}>Cerrar</Button>
            </>}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* H4: misma confirmación que en los avisos */}
    <Dialog open={confirmExit} onOpenChange={setConfirmExit}>
      <DialogContent showClose={false} className="exit-confirmation" onPointerDownOutside={(event) => event.preventDefault()}>
        <DialogTitle className="text-3xl">¿Salir sin guardar?</DialogTitle>
        <DialogDescription className="text-2xl">Di sí para salir o no para seguir.</DialogDescription>
        <VoiceCommand priority={200} onCommand={command} hint="Di sí para salir sin guardar o no para seguir con el perfil." />
        <DialogFooter>
          <Button className="min-h-16 text-2xl" onClick={() => setConfirmExit(false)}>No, seguir</Button>
          <Button className="min-h-16 text-2xl" variant="outline" onClick={onBack}>Sí, salir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
}

/* ---------- Piezas de la pantalla ---------- */

const describedBy = (id: string, error?: string) => [`${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ")

function Section({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return <section className="flex flex-col gap-4 rounded-2xl border-2 bg-card p-4 sm:p-5" aria-labelledby={`seccion-${number}`}>
    <h2 id={`seccion-${number}`} className="flex items-center gap-3 text-2xl font-bold">
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-accion-borde bg-accion text-xl">{number}</span>
      {title}
    </h2>
    {children}
  </section>
}

function ErrorText({ id, error }: { id: string; error?: string }) {
  if (!error) return null
  return <p id={`${id}-error`} className="flex items-start gap-2 text-lg font-semibold text-destructive">
    <CircleAlert aria-hidden="true" className="mt-0.5 size-6 shrink-0" /> {error}
  </p>
}

/** Etiqueta + campo + error junto al campo (H9). */
function FieldBox({ id, label, hint, error, optional, children }: { id: string; label: string; hint?: string; error?: string; optional?: boolean; children: ReactNode }) {
  return <div className="flex flex-col gap-2">
    <Label htmlFor={id}>{label}{optional && <span className="font-normal"> (opcional)</span>}</Label>
    {hint && <p id={`${id}-hint`} className="text-lg leading-snug">{hint}</p>}
    {children}
    <ErrorText id={id} error={error} />
  </div>
}

/** Grupo de botones para elegir (marca, modelo, gustos). Recibe el foco cuando tiene un error. */
function ChoiceGroup({ id, label, error, optional, children }: { id: string; label: string; error?: string; optional?: boolean; children: ReactNode }) {
  const focusId = id === "routine-ideas" ? "routine" : id
  return <div className="flex flex-col gap-2">
    <p id={`${id}-label`} className="text-lg font-semibold">{label}{optional && <span className="font-normal"> (opcional)</span>}</p>
    <div id={focusId === id ? id : undefined} role="group" aria-labelledby={`${id}-label`} aria-describedby={error ? `${id}-error` : undefined} tabIndex={-1}
      className={cn("rounded-xl outline-none", error && "border-2 border-destructive p-2")}>
      {children}
    </div>
    <ErrorText id={id} error={error} />
  </div>
}

/** Botón seleccionable: grande, con borde visible y palomita cuando está elegido. */
function Choice({ selected, onClick, wide, children }: { selected: boolean; onClick: () => void; wide?: boolean; children: ReactNode }) {
  return <Button type="button" variant={selected ? "default" : "outline"} aria-pressed={selected} onClick={onClick}
    className={cn("h-auto min-h-14 whitespace-normal px-4 py-2 text-left text-lg leading-snug", wide ? "w-full flex-col items-start gap-0.5" : "justify-start")}>
    {selected && !wide && <Check aria-hidden="true" className="shrink-0" />}
    {children}
  </Button>
}