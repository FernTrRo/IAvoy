/**
 * Guías de la app.
 * - Con la IA configurada: solo se muestran las guías que la persona va creando.
 * - Sin la IA (no hay llave en .env.local): se muestran las guías de ejemplo, para que la sección no quede vacía.
 *
 */
import { useSyncExternalStore } from "react"
import { guides as demoGuides, type Guide } from "@/data/demo"
import { load, save } from "@/lib/storage"
import { aiAvailable } from "@/lib/ai"

const KEY = "aiGuides"
const visible = (created: Guide[]) => (aiAvailable() ? created : demoGuides)

let aiGuides: Guide[] = load<Guide[]>(KEY, [])
let snapshot: Guide[] = visible(aiGuides)
const listeners = new Set<() => void>()

function commit(next: Guide[]) {
  aiGuides = next
  snapshot = visible(aiGuides)
  save(KEY, aiGuides)
  listeners.forEach((l) => l())
}

export const getGuides = () => snapshot
export const findGuide = (id: string) => snapshot.find((g) => g.id === id)

export function addGuide(g: Guide) {
  commit([...aiGuides.filter((x) => x.id !== g.id), g])
}

export function removeGuide(id: string) {
  commit(aiGuides.filter((g) => g.id !== id))
}

/** Borra todas las guías creadas (útil para limpiar pruebas). */
export function clearGuides() {
  commit([])
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function useGuides() {
  return useSyncExternalStore(subscribe, getGuides)
}