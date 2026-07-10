import { useSyncExternalStore } from 'react'

const LS_KEY = 'pf1_links_external'
const listeners = new Set()

export function getExternalLinksPref() {
  return localStorage.getItem(LS_KEY) === '1'
}
export function setExternalLinksPref(value) {
  localStorage.setItem(LS_KEY, value ? '1' : '0')
  listeners.forEach(l => l())
}
function subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb) }
export function useExternalLinksPref() {
  return useSyncExternalStore(subscribe, getExternalLinksPref)
}

/** Reference link to an external site (prd.5footstep.de, GitHub Gist, …).
 * Behavior depends on the global "Links extern öffnen" setting:
 *  - off (default): target="_blank" — on an installed iOS home-screen app this
 *    opens a single in-app overlay (closes before the next one can be opened).
 *  - on: no target — a normal top-level navigation, which on an installed iOS
 *    app hands off fully to Safari, letting the user open several links as
 *    real, independently-switchable Safari tabs. */
export function RefLink({ href, className, title, children, onClick }) {
  const external = useExternalLinksPref()
  return (
    <a
      className={className}
      href={href}
      title={title}
      onClick={e => { e.stopPropagation(); onClick?.(e) }}
      {...(external ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
    >
      {children}
    </a>
  )
}
