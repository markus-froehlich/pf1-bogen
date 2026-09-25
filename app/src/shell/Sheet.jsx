import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Sheet: Handy = von unten (Griff, Backdrop 62 %), Tablet/Desktop = Seitenpanel rechts
 * (400px, 16px Abstand, Backdrop 38 %). Esc schließt (README „App-Shell" / „Responsive").
 */
export function Sheet({ open, onClose, layout, children, label }) {
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const phone = layout === 'phone'
  return createPortal(
    <div className={`nc-sheet-layer ${phone ? 'is-phone' : 'is-panel'}`}>
      <div className="nc-sheet-backdrop" onClick={onClose} />
      <div className="nc-sheet" role="dialog" aria-modal="true" aria-label={label}>
        {phone && <div className="nc-sheet-grab" />}
        {children}
      </div>
    </div>,
    document.body,
  )
}
