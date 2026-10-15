import { useState } from "react"
import {
  AlarmClock, ArrowLeft, Bell, BookUser, Camera, Check, EllipsisVertical, Footprints, Heart, House, Image, Keyboard,
  LayoutGrid, MapPin, Maximize, MessageCircle, Mic, Navigation, Paperclip, Pause, Pencil, Phone, PhoneOff, Play, Plus,
  Search, SendHorizontal, Settings, Share2, Smile, Star, Trash2, Video, Volume2, Download, X, type LucideIcon,
} from "lucide-react"
import type { StepUi } from "@/data/demo"
import { APPS } from "@/lib/images"
import { POSITIONS, UI_ICONS } from "@/lib/ui-hints"
import { cn } from "@/lib/utils"

const ICONS: Record<string, LucideIcon> = {
  mic: Mic, search: Search, camera: Camera, video_call: Video, send: SendHorizontal, attach: Paperclip, plus: Plus,
  call: Phone, hang_up: PhoneOff, back: ArrowLeft, menu: EllipsisVertical, settings: Settings, home: House, share: Share2,
  heart: Heart, trash: Trash2, keyboard: Keyboard, play: Play, pause: Pause, volume: Volume2, download: Download,
  gallery: Image, contacts: BookUser, chat: MessageCircle, bell: Bell, location: MapPin, directions: Navigation,
  star: Star, close: X, ok: Check, emoji: Smile, fullscreen: Maximize, edit: Pencil, alarm: AlarmClock, walk: Footprints,
}

/** Dónde va el botón dentro del teléfono pequeño. */
const SPOT: Record<StepUi["position"], string> = {
  "top-left": "top-2 left-2",
  "top-right": "top-2 right-2",
  "bottom-left": "bottom-2 left-2",
  "bottom-right": "bottom-2 right-2",
  "bottom-center": "bottom-2 left-1/2 -translate-x-1/2",
  center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
}

/** El logotipo de la app; si no carga (sin internet), un cuadrito genérico. */
function AppLogo({ app, className }: { app: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  const info = APPS[app]
  if (failed || !info) return <LayoutGrid aria-hidden="true" className={className} />
  return <img src={`https://cdn.simpleicons.org/${info.slug}`} alt="" onError={() => setFailed(true)} className={cn("object-contain", className)} />
}

/**
 * Botones que en la pantalla real SÍ son un círculo de color.
 * Los demás íconos (lupa, tres puntitos, engrane…) son dibujos simples, sin fondo, como en las apps.
 */
function filledColor(ui: StepUi) {
  if (ui.icon === "hang_up") return "#D93025"
  if (ui.icon === "call") return "#1E8E3E"
  if (ui.app === "whatsapp" && (ui.icon === "mic" || ui.icon === "send")) return "#25D366"
  return undefined
}

/** El botón tal como se ve en la pantalla. */
function UiButton({ ui, big }: { ui: StepUi; big?: boolean }) {
  const Icon = ICONS[ui.icon]
  if (ui.icon === "app" && ui.app) {
    return <span className={cn("grid place-items-center rounded-2xl border-2 bg-white", big ? "size-24 p-3" : "size-9 p-1")}>
      <AppLogo app={ui.app} className="size-full" />
    </span>
  }
  if (!Icon) return null
  const color = filledColor(ui)
  return <span
    className={cn("grid place-items-center", big ? "size-24" : "size-9", color ? "rounded-full" : "rounded-2xl border-2 bg-white text-foreground")}
    style={color ? { backgroundColor: color, color: "#fff" } : undefined}>
    <Icon className={big ? "size-12" : "size-5"} strokeWidth={2.25} />
  </span>
}

/**
 * Pista visual del paso:
 * a la izquierda, un teléfono pequeño que señala DÓNDE está el botón;
 * a la derecha, el botón grande, tal como se ve, con su nombre.
 */
export function StepVisual({ ui }: { ui: StepUi }) {
  const isApp = ui.icon === "app"
  const label = isApp && ui.app ? APPS[ui.app]?.name ?? "La aplicación" : UI_ICONS[ui.icon]
  return <figure className="mx-auto mb-4 flex w-full max-w-sm items-center justify-center gap-5 rounded-2xl border-2 bg-white p-4"
    aria-label={`${label}. ${isApp ? "En la pantalla de inicio." : POSITIONS[ui.position]}.`}>
    {/* El teléfono pequeño */}
    <div aria-hidden="true" className="relative h-44 w-24 shrink-0 rounded-2xl border-[3px] border-foreground bg-background">
      {isApp ? (
        <div className="grid grid-cols-3 gap-1.5 p-2 pt-4">
          {Array.from({ length: 12 }, (_, i) => i === 4
            ? <span key={i} className="relative grid aspect-square place-items-center rounded-md bg-white ring-4 ring-ayuda motion-safe:animate-pulse"><AppLogo app={ui.app!} className="size-4/5" /></span>
            : <span key={i} className="aspect-square rounded-md bg-muted" />)}
        </div>
      ) : <>
        <span className="absolute inset-x-0 top-0 h-7 rounded-t-xl bg-muted" />
        <span className="absolute inset-x-0 bottom-0 h-7 rounded-b-xl bg-muted" />
        <span className={cn("absolute rounded-full ring-4 ring-ayuda motion-safe:animate-pulse", SPOT[ui.position])}>
          <UiButton ui={ui} />
        </span>
      </>}
    </div>
    {/* El botón grande y su nombre */}
    <figcaption className="flex min-w-0 flex-col items-center gap-2 text-center">
      <UiButton ui={ui} big />
      <span className="text-lg font-bold leading-tight">{label}</span>
      <span className="text-base leading-tight">{isApp ? "En tu pantalla de inicio" : POSITIONS[ui.position]}</span>
    </figcaption>
  </figure>
}