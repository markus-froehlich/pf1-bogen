import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * Sheet: Handy = von unten (Griff, Backdrop 62 %), Tablet = Seitenpanel rechts (400px),
 * Desktop = zentriertes Fenster (Backdrop 38 %). Esc schließt (README „App-Shell" / „Responsive").
 * Wischen schließt wie in nativen Apps: Handy nach unten (wenn der Inhalt oben steht),
 * Seitenpanel auf Touch-Geräten nach rechts.
 */
export function Sheet({ open, onClose, layout, children, label }) {
  const sheetRef = useRef(null)
  const backRef = useRef(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const phone = layout === 'phone'
  const center = layout === 'desktop'
  useEffect(() => {
    const el = sheetRef.current
    if (!open || !el || center) return   // zentriert: kein Wischen (Maus)
    const axisY = phone
    let g = null   // { x0, y0, t0, can, active, d }
    const setOffset = d => {
      el.style.transform = d ? (axisY ? `translateY(${d}px)` : `translateX(${d}px)`) : ''
      const size = axisY ? el.offsetHeight : el.offsetWidth
      if (backRef.current) backRef.current.style.opacity = d ? String(Math.max(0.15, 1 - d / size)) : ''
    }
    const start = e => {
      if (e.touches.length !== 1) { g = null; return }
      const t = e.touches[0]
      // nur ziehen, wenn der Inhalt oben steht und nicht in einem eigenen Scrollbereich/Textfeld begonnen wird
      const inner = e.target.closest?.('textarea, input[type="range"], .nc-no-swipe')
      g = { x0: t.clientX, y0: t.clientY, t0: Date.now(), can: !inner && (!axisY || el.scrollTop <= 0), active: false, d: 0 }
    }
    const move = e => {
      if (!g || !g.can) return
      const t = e.touches[0]
      const dx = t.clientX - g.x0
      const dy = t.clientY - g.y0
      const d = axisY ? dy : dx
      const cross = axisY ? dx : dy
      if (!g.active) {
        if (Math.abs(d) < 8 && Math.abs(cross) < 8) return
        // Richtung falsch oder quer zur Wischachse → normales Scrollen, kein Ziehen
        if (d <= 0 || Math.abs(cross) > Math.abs(d)) { g.can = false; return }
        g.active = true
        el.style.transition = 'none'
      }
      e.preventDefault()
      g.d = Math.max(0, d)
      setOffset(g.d)
    }
    const end = () => {
      if (!g?.active) { g = null; return }
      const size = axisY ? el.offsetHeight : el.offsetWidth
      const speed = g.d / Math.max(1, Date.now() - g.t0)   // px/ms
      const shut = g.d > Math.min(140, size * 0.3) || (speed > 0.6 && g.d > 30)
      el.style.transition = 'transform 180ms ease-out'
      if (backRef.current) backRef.current.style.transition = 'opacity 180ms ease-out'
      if (shut) {
        setOffset(size + 40)
        setTimeout(() => closeRef.current?.(), 170)
      } else {
        setOffset(0)
      }
      g = null
    }
    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchmove', move, { passive: false })
    el.addEventListener('touchend', end)
    el.addEventListener('touchcancel', end)
    return () => {
      el.removeEventListener('touchstart', start)
      el.removeEventListener('touchmove', move)
      el.removeEventListener('touchend', end)
      el.removeEventListener('touchcancel', end)
    }
  }, [open, phone, center])

  if (!open) return null
  return createPortal(
    <div className={`nc-sheet-layer ${phone ? 'is-phone' : center ? 'is-panel is-center' : 'is-panel'}`}>
      <div className="nc-sheet-backdrop" ref={backRef} onClick={onClose} />
      <div className="nc-sheet" role="dialog" aria-modal="true" aria-label={label} ref={sheetRef}>
        {phone && <div className="nc-sheet-grab" />}
        {children}
      </div>
    </div>,
    document.body,
  )
}
