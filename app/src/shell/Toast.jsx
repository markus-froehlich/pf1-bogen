import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Info, ArrowCounterClockwise } from '@phosphor-icons/react'

const ToastContext = createContext(() => {})

/** useToast()(text, { undo }) — Bestätigung 2,2 s; mit Rückgängig 5 s. */
export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children, lang = 'de' }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const show = useCallback((text, { undo } = {}) => {
    clearTimeout(timer.current)
    setToast({ text, undo: undo ?? null, key: Date.now() })
    timer.current = setTimeout(() => setToast(null), undo ? 5000 : 2200)
  }, [])

  function doUndo() {
    clearTimeout(timer.current)
    toast?.undo?.()
    setToast(null)
  }

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="nc-toast" role="status" key={toast.key}>
          <Info className="nc-toast-icon" />
          <span className="nc-toast-text">{toast.text}</span>
          {toast.undo && (
            <button className="nc-btn nc-btn-ghost nc-toast-undo" onClick={doUndo}>
              <ArrowCounterClockwise />{lang === 'de' ? 'Rückgängig' : 'Undo'}
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  )
}
