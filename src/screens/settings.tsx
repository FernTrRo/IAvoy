import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScreenHeader } from "@/components/screen-header"
import { VoiceCommand } from "@/components/voice-command"
import type { Profile } from "@/lib/profile"
import { guides } from "@/data/demo"
import { isIntent, speechText, guideTopic } from "@/lib/commands"

export function SettingsScreen({ profile, onSave, onBack }: { profile: Profile; onSave: (p: Profile) => void; onBack: () => void }) {
  const [draft, setDraft] = useState(profile)
  const [error, setError] = useState("")
  function save() {
    const phone = draft.tutorPhone.replace(/[\s()-]/g, "")
    if (phone && !/^\+?\d{7,15}$/.test(phone)) { setError("Escribe un teléfono válido, con 7 a 15 dígitos."); return }
    if (!draft.name.trim()) { setError("Indica cómo quieres que te llamemos."); return }
    onSave({ ...draft, name: draft.name.trim(), tutorPhone: phone })
  }
  function command(raw: string) {
    const s = speechText(raw)
    if (isIntent(raw, "save")) { save(); return }
    if (isIntent(raw, "back") || isIntent(raw, "close")) { onBack(); return }
    for (const [prefix, key] of [["mi nombre es ", "name"], ["mi telefono es ", "phoneModel"], ["mi rutina es ", "routine"], ["mi tutor se llama ", "tutorName"]] as const) {
      if (s.startsWith(prefix)) { setDraft({ ...draft, [key]: raw.slice(prefix.length) }); return }
    }
    const topic = guideTopic(s)
    const guide = guides.find(g => (topic === g.id && /^(?:no )?(?:sugerir|sugiere|recomendar|recomienda|me interesa|agrega)/.test(s)) || s === `sugerir ${speechText(g.title)}` || s === `no sugerir ${speechText(g.title)}`)
    if (guide) { setDraft({ ...draft, interests: s.startsWith("no ") ? draft.interests.filter(id => id !== guide.id) : [...new Set([...draft.interests, guide.id])] }); return }
    throw new Error("Di: mi nombre es…, mi teléfono es…, mi rutina es…, o guardar.")
  }
  return <div className="flex flex-col gap-5">
    <ScreenHeader onBack={onBack} helpText="El tutor y tú pueden preparar el perfil en este teléfono. Marca las guías que te interesan. Guarda al terminar." />
    <h1 className="text-4xl font-bold">Mi perfil y tutor</h1>
    <VoiceCommand onCommand={command} hint="Di: mi nombre es…, mi teléfono es…, mi rutina es…, o guardar." />
    {([['name','Tu nombre'],['tutorName','Nombre del tutor'],['tutorPhone','Teléfono del tutor'],['phoneModel','Modelo del teléfono']] as const).map(([key, label]) => <div key={key} className="flex flex-col gap-2"><Label htmlFor={key}>{label}</Label><Input id={key} type={key === 'tutorPhone' ? 'tel' : 'text'} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></div>)}
    <Label htmlFor="routine">Rutina y necesidades</Label><Textarea id="routine" value={draft.routine} onChange={e => setDraft({ ...draft, routine: e.target.value })} />
    <p>El modelo y la rutina quedan guardados en este dispositivo. Las guías de ejemplo todavía no se adaptan automáticamente.</p>
    <h2 className="text-2xl font-bold">Guías sugeridas para ti</h2>
    {guides.map(g => <label key={g.id} className="flex min-h-14 items-center gap-3"><input type="checkbox" className="size-6" checked={draft.interests.includes(g.id)} onChange={e => setDraft({ ...draft, interests: e.target.checked ? [...draft.interests, g.id] : draft.interests.filter(id => id !== g.id) })} />{g.title}</label>)}
    {error && <p role="alert">{error}</p>}
    <Button size="xl" onClick={save}>Guardar perfil</Button>
  </div>
}
