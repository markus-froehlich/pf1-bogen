import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Alle Zahlenfelder: bei Fokus Inhalt sofort markieren → direkt überschreiben
document.addEventListener('focusin', e => {
  if (e.target.tagName === 'INPUT' && e.target.type === 'number') {
    e.target.select()
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
