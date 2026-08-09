import { useState, type ReactNode } from 'react'

// Not real security — a static site with no backend can't have any. This just
// keeps the trip off search engines and out of casual eyes on a shared link.
// The password is checked as a hash so it isn't sitting in plain text in the
// bundle; someone who opens devtools and really wants in still can.
const HASH = '82347b147da17d4cd492d9327fd8c9227b5a2d01fc6073aec341dfd94d679873'
const KEY = 'gate:v1'

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export default function Gate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return localStorage.getItem(KEY) === HASH
    } catch {
      return false
    }
  })
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)

  if (unlocked) return <>{children}</>

  const submit = async () => {
    if (!pw || busy) return
    setBusy(true)
    setErr(false)
    const h = await sha256Hex(pw.trim())
    setBusy(false)
    if (h === HASH) {
      try {
        localStorage.setItem(KEY, HASH)
      } catch {
        /* ignore */
      }
      setUnlocked(true)
    } else {
      setErr(true)
    }
  }

  return (
    <div className="gate">
      <div className="gate-card">
        <span className="gate-mark">⌂</span>
        <h1>Albánie 2026</h1>
        <p>Soukromý plán cesty. Zadej heslo.</p>
        <input
          type="password"
          autoFocus
          placeholder="Heslo"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value)
            setErr(false)
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        {err && <div className="gate-err">Špatné heslo, zkus to znovu.</div>}
        <button className="gate-btn" onClick={submit} disabled={busy || !pw}>
          {busy ? 'Ověřuji…' : 'Vstoupit'}
        </button>
      </div>
    </div>
  )
}
