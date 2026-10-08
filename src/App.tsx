import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { VoiceProvider } from "@/components/voice-command"
import { Toaster } from "@/components/ui/sonner"
import { ReminderAlert } from "@/components/reminder-alert"
import { HomeScreen } from "@/screens/home"
import { NewReminderScreen } from "@/screens/new-reminder"
import { RemindersScreen } from "@/screens/reminders"
import { GuideListScreen, GuideScreen } from "@/screens/guide"
import { NewGuideScreen } from "@/screens/new-guide"
import { aiAvailable } from "@/lib/ai"
import { demoReminders, guides, type Reminder } from "@/data/demo"
import { load, save } from "@/lib/storage"
import { SettingsScreen } from "@/screens/settings"
import { defaultProfile, type Profile } from "@/lib/profile"
import { acknowledge, completeReminder, dueAt } from "@/lib/reminders"
import { speak } from "@/lib/voice"
import { formatWhen } from "@/lib/format"

type Screen =
  | { name: "home" }
  | { name: "new"; id?: string; phrase?: string }
  | { name: "settings" }
  | { name: "list" }
  | { name: "guides" }
  | { name: "guide"; id: string }
  | { name: "new-guide"; phrase?: string }

export default function App() {
  const [profile, setProfile] = useState(() => load("profile", defaultProfile))
  const [dailyShown, setDailyShown] = useState(() => load("dailyShown", ""))
  const [screen, setScreen] = useState<Screen>({ name: "home" })
  const [reminders, setReminders] = useState<Reminder[]>(() => load("reminders", demoReminders))
  const [progress, setProgress] = useState<Record<string, number>>(() => load("progress", {}))
  const [, setLastGuide] = useState<string>(() => load("lastGuide", guides[0].id))
  const [dailyQuestion, setDailyQuestion] = useState(() => load("dailyQuestion", false))
  const [alerting, setAlerting] = useState<Reminder | null>(null)

  useEffect(() => { save("reminders", reminders) }, [reminders])
  useEffect(() => { save("progress", progress) }, [progress])

  useEffect(() => { save("dailyQuestion", dailyQuestion) }, [dailyQuestion])
  useEffect(() => { window.scrollTo(0, 0) }, [screen])

  useEffect(() => {
    const goHome = () => {
      setAlerting(null)
      setScreen({ name: "home" })
    }
    window.addEventListener("iarecuerdo:home-confirmed", goHome)
    return () => window.removeEventListener("iarecuerdo:home-confirmed", goHome)
  }, [])


  useEffect(() => {
    const check = () => {
      if (alerting) return
      const due = [...reminders].sort((a, b) => dueAt(a) - dueAt(b)).find(r => dueAt(r) <= Date.now())
      if (due) setAlerting(due)
    }
    const first = setTimeout(check, 1500)
    const id = setInterval(check, 1000)
    return () => { clearTimeout(first); clearInterval(id) }
  }, [reminders, alerting])

  const pending = useMemo(
    () => reminders.filter((r) => !r.done && !r.cancelled).sort((a, b) => a.when.localeCompare(b.when)),
    [reminders]
  )
  const next = pending.find((r) => new Date(r.when).getTime() > Date.now()) ?? pending[0]

  function updateReminders(next: Reminder[]) {
    if (!save("reminders", next)) { toast.error("No se pudo guardar. Revisa el almacenamiento antes de continuar."); return false }
    setReminders(next)
    return true
  }
  const markDone = (id: string) => {
    if (updateReminders(reminders.map(r => r.id === id ? completeReminder(r) : r))) {
      setAlerting(null); toast.success("Actividad realizada")
    }
  }
  const snooze = (id: string, minutes?: number) => {
    const r = reminders.find(r => r.id === id)
    const delay = minutes ?? r?.snoozeMinutes ?? 10
    if (updateReminders(reminders.map(r => r.id === id ? { ...r, notified: false, nextAlertAt: new Date(Date.now() + delay * 60000).toISOString() } : r))) {
      setAlerting(null); toast(`Te aviso otra vez en ${delay} minutos`)
    }
  }
  const dismiss = (id: string) => {
    if (updateReminders(reminders.map(r => r.id === id ? acknowledge(r) : r))) setAlerting(null)
  }
  const addReminder = (r: Reminder) => {
    const next = reminders.some(item => item.id === r.id) ? reminders.map(item => item.id === r.id ? r : item) : [...reminders, r]
    if (!updateReminders(next)) return
    toast.success(`Aviso guardado para ${formatWhen(r.when).toLowerCase()}`)
    setScreen({ name: "home" })
  }
  // Sin llave de IA no se pueden crear guías: se abre la lista de ejemplo.
  const newGuide = (phrase?: string) => setScreen(aiAvailable() ? { name: "new-guide", phrase } : { name: "guides" })
  const openGuide = (id: string) => { setLastGuide(id); save("lastGuide", id); setScreen({ name: "guide", id }) }
  const saveProfile = (p: Profile) => {
    if (!save("profile", p)) { toast.error("No se pudo guardar el perfil."); return }
    setProfile(p); toast.success("Perfil guardado"); setScreen({ name: "home" })
  }
  useEffect(() => {
    const today = new Date().toDateString()
    if (dailyQuestion && dailyShown !== today && screen.name === "home" && !alerting) {
      setDailyShown(today); save("dailyShown", today)
      toast("¿Algo que recordar hoy?", { duration: 10000, action: { label: "Añadir", onClick: () => setScreen({ name: "new" }) } })
      void speak("¿Quieres agregar algo para recordar hoy?").catch(() => {})
    }
  }, [dailyQuestion, dailyShown, screen.name, alerting])

  return (
    <VoiceProvider><div className="safe-area mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5">
      {screen.name === "home" && (
        <HomeScreen
          userName={profile.name}
          onSettings={() => setScreen({ name: "settings" })}
          next={next}
          pendingCount={pending.length}
          dailyQuestion={dailyQuestion}
          onDailyQuestion={setDailyQuestion}
          onNewReminder={phrase => setScreen({ name: "new", phrase })}
          onGuide={() => setScreen({ name: "guides" })}
          onNewGuide={newGuide}
          onList={() => setScreen({ name: "list" })}
        />
      )}
      {screen.name === "new" && <NewReminderScreen key={screen.id ?? "new"} initialPhrase={screen.phrase} initial={reminders.find(r => r.id === screen.id)} onCancel={() => setScreen({ name: "home" })} onSave={addReminder} />}
      {screen.name === "list" && (
        <RemindersScreen
          onEdit={id => setScreen({ name: "new", id })}
          onCancel={id => { updateReminders(reminders.map(r => r.id === id ? { ...r, cancelled: true } : r)) }}
          reminders={reminders}
          onBack={() => setScreen({ name: "home" })}
          onDone={markDone}
          onNew={() => setScreen({ name: "new" })}
          onResetDemo={() => { updateReminders(demoReminders); toast("Avisos de demostración restablecidos") }}
        />
      )}
      {screen.name === "guides" && (
        <GuideListScreen progress={progress} onBack={() => setScreen({ name: "home" })} onOpen={openGuide} onNewGuide={newGuide} />
      )}
      {screen.name === "new-guide" && (
        <NewGuideScreen key={screen.phrase ?? "new-guide"} initialPhrase={screen.phrase} onCancel={() => setScreen({ name: "guides" })} onCreated={openGuide} />
      )}
      {screen.name === "guide" && (
        <GuideScreen
          guideId={screen.id}
          step={progress[screen.id] ?? 0}
          onStep={(n) => setProgress((p) => ({ ...p, [screen.id]: n }))}
          onBack={() => setScreen({ name: "guides" })}
          onFinish={() => {
            setProgress((p) => ({ ...p, [screen.id]: 0 }))
            toast.success("¡Terminaste la guía!")
            setScreen({ name: "home" })
          }}
        />
      )}

      {screen.name === "settings" && <SettingsScreen profile={profile} onSave={saveProfile} onBack={() => setScreen({ name: "home" })} onOpenGuide={openGuide} />}
      <ReminderAlert reminder={alerting} onDone={markDone} onLater={snooze} onDismiss={dismiss} />
      <Toaster />
    </div></VoiceProvider>
  )
}