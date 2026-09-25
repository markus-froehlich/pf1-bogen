import { useEffect, useState } from 'react'

// Schriftgröße S/M/L/XL skaliert den ganzen Inhalt (README „App-Shell").
export const FONT_SCALES = { s: 0.9, m: 1, l: 1.12, xl: 1.25 }

// Breakpoints nach verfügbarer Breite in CSS-px NACH Schriftskalierung:
// Handy < 700 · Tablet 700–1099 · Desktop ≥ 1100 (README „Responsive").
export function layoutFor(width, fontScale) {
  const eff = width / (FONT_SCALES[fontScale] ?? 1)
  if (eff < 700) return 'phone'
  if (eff < 1100) return 'tablet'
  return 'desktop'
}

export function useLayout(fontScale) {
  const [width, setWidth] = useState(() => window.innerWidth)
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return layoutFor(width, fontScale)
}

// ── Darstellung Standard | Kontrast ───────────────────────────────────────────
export const THEME_KEY = 'pf1_theme'

export function initialTheme() {
  try {
    let saved = localStorage.getItem(THEME_KEY)
    try { saved = JSON.parse(saved) } catch { /* ältere Rohwerte */ }
    if (saved === 'standard' || saved === 'kontrast') return saved
    // Erster Start: automatisch Kontrast, wenn das System es verlangt
    const wantsContrast = window.matchMedia?.('(prefers-contrast: more)').matches
      || window.matchMedia?.('(forced-colors: active)').matches
    const theme = wantsContrast ? 'kontrast' : 'standard'
    saveTheme(theme)
    return theme
  } catch {
    return 'standard'
  }
}

// JSON-kodiert wie die übrigen PREF_KEYS (Gist-Backup schreibt JSON.stringify zurück)
export function saveTheme(theme) {
  try { localStorage.setItem(THEME_KEY, JSON.stringify(theme)) } catch { /* privat/voll */ }
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'kontrast' ? '#000000' : '#161826')
}
