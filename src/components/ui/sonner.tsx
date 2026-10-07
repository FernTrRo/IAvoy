import { Toaster as Sonner, type ToasterProps } from "sonner"

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="top-center"
      offset={{ bottom: "max(env(safe-area-inset-bottom), 16px)" }}
      mobileOffset={{ bottom: "max(env(safe-area-inset-bottom), 16px)" }}
      toastOptions={{
        classNames: {
          toast: "large-alert !bg-card !text-foreground !rounded-xl !font-semibold",
        },
      }}
      {...props}
    />
  )
}
export { Toaster }
