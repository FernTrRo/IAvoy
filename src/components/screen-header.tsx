import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  onBack?: () => void
  helpText?: string
}

/** Barra superior: solo el botón "Volver".*/
export function ScreenHeader({ onBack }: Props) {
  if (!onBack) return null
  return (
    <header className="flex items-center">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft /> Volver
      </Button>
    </header>
  )
}