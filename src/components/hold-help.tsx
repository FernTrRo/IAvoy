import { useEffect, useState } from "react"
import { buttonHelp } from "@/lib/button-help"
import { speak, stopSpeaking } from "@/lib/voice"

type Spotlight = { left: number; top: number; right: number; bottom: number }
export function HoldHelp({ onExplain, onClose }: { onExplain: (text: string) => void; onClose: () => void }) {
  const [spot, setSpot] = useState<Spotlight | null>(null)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let pressed: HTMLElement | null = null
    let active = false
    let origin = { x: 0, y: 0 }
    let suppressRelease = false
    const clear = () => { clearTimeout(timer); timer = undefined; pressed = null }
    const close = () => {
      clear()
      if (!active) return
      active = false; setSpot(null); onClose(); void stopSpeaking()
    }
    const start = (event: PointerEvent) => {
      if (active) return
      if (event.button !== 0 || !event.isPrimary) return
      // Un nuevo gesto sí puede activar un botón; el clic del gesto largo no.
      suppressRelease = false
      clear()
      const button = event.target instanceof Element ? event.target.closest<HTMLElement>('button, [role="button"], [role="switch"]') : null
      if (!button) return
      pressed = button; origin = { x: event.clientX, y: event.clientY }
      timer = setTimeout(() => {
        if (!button.isConnected) return
        const rect = button.getBoundingClientRect()
        active = true; suppressRelease = true
        setSpot({ left: rect.left - 5, top: rect.top - 5, right: rect.right + 5, bottom: rect.bottom + 5 })
        const label = button.getAttribute("aria-label") || button.textContent?.trim() || "usar este control"
        const explanation = (button.getAttribute("data-help") || buttonHelp(label)) + (button.matches(":disabled") ? " Ahora no está disponible." : "")
        onExplain(explanation)
        void speak(explanation).catch(() => {})
      }, 3000)
    }
    const move = (event: PointerEvent) => {
      if (pressed && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 12) clear()
    }
    const up = () => { close() }
    const click = (event: MouseEvent) => {
      if (!active && !suppressRelease) return
      event.preventDefault(); event.stopImmediatePropagation()
      if (suppressRelease) suppressRelease = false
      else close()
    }
    const key = (event: KeyboardEvent) => {
      if (!active) return
      event.preventDefault(); event.stopImmediatePropagation()
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") close()
    }
    const context = (event: Event) => { if (pressed || active) event.preventDefault() }
    document.addEventListener("pointerdown", start, true)
    document.addEventListener("pointermove", move, true)
    document.addEventListener("pointerup", up, true)
    document.addEventListener("pointercancel", close, true)
    document.addEventListener("click", click, true)
    document.addEventListener("keydown", key, true)
    document.addEventListener("contextmenu", context, true)
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    window.addEventListener("blur", close)
    return () => {
      clear()
      document.removeEventListener("pointerdown", start, true)
      document.removeEventListener("pointermove", move, true)
      document.removeEventListener("pointerup", up, true)
      document.removeEventListener("pointercancel", close, true)
      document.removeEventListener("click", click, true)
      document.removeEventListener("keydown", key, true)
      document.removeEventListener("contextmenu", context, true)
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
      window.removeEventListener("blur", close)
      if (active) { onClose(); void stopSpeaking() }
    }
  }, [onExplain, onClose])
  if (!spot) return null
  return <svg className="hold-help-shade" aria-hidden="true" width="100%" height="100%">
    <path fillRule="evenodd" d={`M0 0H${window.innerWidth}V${window.innerHeight}H0Z M${spot.left} ${spot.top}H${spot.right}V${spot.bottom}H${spot.left}Z`} />
  </svg>
}
