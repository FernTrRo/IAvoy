import { useEffect, useState } from "react"
import { Volume2, Square } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { speak, stopSpeaking } from "@/lib/voice"
import type { ComponentProps } from "react"

type Props = { text: string; label?: string; slow?: boolean; iconOnly?: boolean } & Omit<ComponentProps<typeof Button>, "onClick">

/** Botón "Escuchar": lee el texto en voz alta. Tocar de nuevo lo detiene. */
export function SpeakButton({ text, label = "Escuchar", slow, iconOnly = false, ...props }: Props) {
  const [speaking, setSpeaking] = useState(false)
  useEffect(() => () => void stopSpeaking(), [])

  async function toggle() {
    if (speaking) {
      await stopSpeaking()
      setSpeaking(false)
      return
    }
    setSpeaking(true)
    try {
      await speak(text, { rate: slow ? 0.75 : 0.9 })
    } catch (e) {
      toast.error((e as Error).message ?? "No se pudo leer en voz alta.")
    } finally {
      setSpeaking(false)
    }
  }

  return (
    <Button variant="outline" onClick={toggle} aria-pressed={speaking} {...props}>
      {speaking ? <Square aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
      <span className={iconOnly ? "sr-only" : undefined}>{speaking ? "Detener" : label}</span>
    </Button>
  )
}
