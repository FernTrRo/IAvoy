import { useState } from "react"
import { VoiceCommand } from "@/components/voice-command"
import { isIntent, speechText } from "@/lib/commands"
import { speak } from "@/lib/voice"
import { CircleHelp, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SpeakButton } from "@/components/speak-button"
import { load } from "@/lib/storage"
import { defaultProfile } from "@/lib/profile"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"

export function HelpDialog({ helpText }: { helpText: string }) {
  const [open, setOpen] = useState(false)
  const profile = load("profile", defaultProfile)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ayuda">
          <CircleHelp /> Ayuda
        </Button>
      </DialogTrigger>
      <DialogContent>
        <VoiceCommand priority={50} hint="Di: escuchar ayuda, llamar a mi tutor o cerrar." onCommand={text => {
          if (isIntent(text, "close") || isIntent(text, "back")) setOpen(false)
          else if (isIntent(text, "repeat") || isIntent(text, "help") || speechText(text) === "escuchar ayuda") void speak(helpText).catch(() => {})
          else if (/^(?:llamar|llama) (?:a )?(?:mi |el )?(?:tutor|familiar)$/.test(speechText(text))) {
            if (!profile.tutorPhone) throw new Error("Primero agrega el teléfono del tutor en tu perfil.")
            window.location.href = `tel:${profile.tutorPhone}`
          } else throw new Error("Di escuchar ayuda, llamar a mi tutor o cerrar.")
        }} />
        <DialogHeader>
          <DialogTitle>¿Cómo te ayudo?</DialogTitle>
          <DialogDescription>{helpText}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <SpeakButton text={helpText} label="Escuchar explicación" slow className="w-full" />
          {profile.tutorPhone ? <Button variant="ayuda" className="w-full" asChild>
            <a href={`tel:${profile.tutorPhone}`}>
              <Phone /> Llamar a {profile.tutorName || "mi tutor"}
            </a>
          </Button> : <p>Agrega el teléfono de tu tutor en Mi perfil y tutor, desde el inicio.</p>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
