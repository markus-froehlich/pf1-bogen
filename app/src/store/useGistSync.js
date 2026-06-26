import { useState, useRef } from 'react'

const API = 'https://api.github.com'

function profileKeys(profile) {
  const gm = profile === 'gm'
  return {
    LS_TOKEN: gm ? 'pf1_gist_token_gm' : 'pf1_gist_token',
    LS_GIST:  gm ? 'pf1_gist_id_gm'   : 'pf1_gist_id',
    LS_LAST:  gm ? 'pf1_gist_last_gm'  : 'pf1_gist_last',
    FILENAME: gm ? 'pf1-bogen-gm.json' : 'pf1-bogen.json',
  }
}

function ghHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export function useGistSync(profile = 'player') {
  const { LS_TOKEN, LS_GIST, LS_LAST, FILENAME } = profileKeys(profile)

  const [token,    setTokenState]  = useState(() => localStorage.getItem(LS_TOKEN) ?? '')
  const [gistId,   setGistIdState] = useState(() => localStorage.getItem(LS_GIST)  ?? '')
  const [status,   setStatus]      = useState('idle')
  const [lastSync, setLastSync]    = useState(() => localStorage.getItem(LS_LAST)  ?? '')
  const timerRef = useRef(null)

  const connected = Boolean(token && gistId)

  function persistToken(t)  { setTokenState(t);  if (t) localStorage.setItem(LS_TOKEN, t); else localStorage.removeItem(LS_TOKEN) }
  function persistGistId(id){ setGistIdState(id); if (id) localStorage.setItem(LS_GIST, id); else localStorage.removeItem(LS_GIST) }

  async function connect(t) {
    if (!t?.trim()) return { ok: false, error: 'Token fehlt' }
    setStatus('connecting')
    try {
      const headers = ghHeaders(t)
      const listRes = await fetch(`${API}/gists?per_page=100`, { headers })
      if (!listRes.ok) {
        setStatus('error')
        return { ok: false, error: `GitHub Fehler ${listRes.status} — Token ungültig?` }
      }
      const gists = await listRes.json()
      const existing = gists.find(g => g.files?.[FILENAME])
      if (existing) {
        persistToken(t); persistGistId(existing.id); setStatus('ok')
        return { ok: true, gistId: existing.id, existed: true }
      }
      const desc = profile === 'gm' ? 'PF1 SL-Backup' : 'PF1 Charakterbogen Backup'
      const createRes = await fetch(`${API}/gists`, {
        method: 'POST', headers,
        body: JSON.stringify({
          description: desc,
          public: false,
          files: { [FILENAME]: { content: '{"version":1}' } }
        })
      })
      if (!createRes.ok) {
        setStatus('error')
        return { ok: false, error: `Gist erstellen fehlgeschlagen (${createRes.status})` }
      }
      const newGist = await createRes.json()
      persistToken(t); persistGistId(newGist.id); setStatus('ok')
      return { ok: true, gistId: newGist.id, existed: false }
    } catch (e) {
      setStatus('error')
      return { ok: false, error: e.message }
    }
  }

  async function push(data) {
    if (!token || !gistId) return false
    setStatus('syncing')
    try {
      const res = await fetch(`${API}/gists/${gistId}`, {
        method: 'PATCH',
        headers: ghHeaders(token),
        body: JSON.stringify({ files: { [FILENAME]: { content: JSON.stringify(data) } } })
      })
      if (!res.ok) { setStatus('error'); return false }
      const now = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      setLastSync(now); localStorage.setItem(LS_LAST, now)
      setStatus('ok'); return true
    } catch { setStatus('error'); return false }
  }

  async function pull(overrideToken, overrideGistId) {
    const t  = overrideToken  ?? token
    const id = overrideGistId ?? gistId
    if (!t || !id) return null
    setStatus('syncing')
    try {
      const res = await fetch(`${API}/gists/${id}`, { headers: ghHeaders(t) })
      if (!res.ok) { setStatus('error'); return null }
      const gist = await res.json()
      const content = gist.files?.[FILENAME]?.content
      if (!content) { setStatus('ok'); return null }
      const data = JSON.parse(content)
      setStatus('ok'); return data
    } catch { setStatus('error'); return null }
  }

  function schedulePush(getData) {
    if (!token || !gistId) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { push(getData()) }, 3000)
  }

  function disconnect() {
    persistToken(''); persistGistId('')
    localStorage.removeItem(LS_LAST)
    setLastSync(''); setStatus('idle')
  }

  return { token, gistId, connected, status, lastSync, connect, push, pull, schedulePush, disconnect }
}
