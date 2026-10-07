import * as React from "react"
import { Slot } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-3 leading-tight rounded-xl font-semibold transition-colors select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:translate-y-px",
  {
    variants: {
      variant: {
        // Azul claro con texto oscuro para mantener el contraste.
        default: "bg-accion text-foreground hover:bg-[#a5ceff]",
        // Ayuda: siempre amarilla
        ayuda: "bg-ayuda text-foreground hover:bg-[#ffcc47]",
        outline: "bg-card text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        link: "text-foreground underline underline-offset-4 decoration-2 hover:decoration-4",
      },
      size: {
        default: "min-h-14 px-5 text-lg [&_svg:not([class*='size-'])]:size-6",
        // 96 px: supera los 87 px indicados en la propuesta
        xl: "min-h-24 w-full px-4 text-[1.4rem] text-left justify-start [&_svg:not([class*='size-'])]:size-9",
        sm: "min-h-12 px-4 text-base [&_svg:not([class*='size-'])]:size-5",
        icon: "size-14 [&_svg:not([class*='size-'])]:size-7",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button"
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
