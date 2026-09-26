import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Alle Zahlenfelder (type=number oder inputMode numeric/decimal): beim Hineintippen/-klicken den
// Inhalt markieren → die neue Zahl ersetzt den alten Wert, keine führende 0 mehr.
// Safari/iOS heben die Markierung beim Loslassen von Maus/Finger wieder auf → nachträglich markieren
// und genau dieses eine mouseup unterdrücken.
const isNumField = el => el?.tagName === 'INPUT' && (el.type === 'number' || /^(numeric|decimal)$/.test(el.inputMode))
let justFocused = null
document.addEventListener('focusin', e => {
  const el = e.target
  if (!isNumField(el)) return
  el.select()
  justFocused = el
  setTimeout(() => { if (document.activeElement === el && justFocused === el) el.select() }, 0)
})
document.addEventListener('mouseup', e => {
  if (justFocused && e.target === justFocused) e.preventDefault()
  justFocused = null
}, true)
document.addEventListener('focusout', () => { justFocused = null })
// Falls der Cursor doch hinter einer 0 steht: „05" → „5" (vor React, damit der State sauber ist)
document.addEventListener('input', e => {
  const el = e.target
  if (!isNumField(el)) return
  const fixed = el.value.replace(/^(-?)0+(?=\d)/, '$1')
  // Prototyp-Setter: umgeht Reacts Wert-Tracker, damit onChange den korrigierten Wert trotzdem meldet
  if (fixed !== el.value) Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, fixed)
}, true)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
