import { createContext, useContext } from 'react'

export const ToastContext = createContext(() => {})

/** useToast()(text, { undo }) — Bestätigung 2,2 s; mit Rückgängig 5 s. */
export function useToast() {
  return useContext(ToastContext)
}
