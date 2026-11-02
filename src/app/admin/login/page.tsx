'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/admin')
    } else {
      setError('Mot de passe incorrect.')
      setLoading(false)
    }
  }

  return (
    <div className="login">
      <style>{`
        .login { min-height: 100vh; display: grid; grid-template-rows: auto 1fr; }
        .login-header { background: var(--petrol-deep); color: #fff; padding: 22px 24px 20px; }
        .login-header p { margin: 0 0 2px; font-size: 13px; color: #A9DADA; }
        .login-header h1 { margin: 0; font-size: 20px; font-weight: 600; }
        .login-body { display: flex; align-items: flex-start; justify-content: center; padding: 64px 16px; }
        .login-card { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 28px; width: 100%; max-width: 380px; }
        .login-card h2 { margin: 0 0 4px; font-size: 18px; font-weight: 600; }
        .login-card > p { margin: 0 0 22px; font-size: 14px; color: var(--muted); }
        .login-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
        .login-input { width: 100%; padding: 9px 11px; border: 1px solid var(--line); border-radius: 6px; font-size: 15px; background: var(--surface); color: var(--ink); }
        .login-input:focus { border-color: var(--petrol); outline: none; box-shadow: 0 0 0 3px var(--petrol-tint); }
        .login-error { font-size: 13px; color: #A3261A; margin: 10px 0 0; }
        .login-btn { width: 100%; margin-top: 18px; padding: 10px; background: var(--petrol); color: #fff; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; }
        .login-btn:hover { background: var(--petrol-deep); }
        .login-btn:disabled { opacity: 0.7; }
        .login-back { display: inline-block; margin-top: 16px; font-size: 13px; color: var(--petrol-deep); font-weight: 600; }
      `}</style>
      <header className="login-header">
        <p>INNOVÉA, Siemens Healthineers France</p>
        <h1>Veille des appels à projets MedTech</h1>
      </header>
      <div className="login-body">
        <div className="login-card">
          <h2>Accès administration</h2>
          <p>Pour valider les appels détectés et mettre à jour les échéances.</p>
          <form onSubmit={handleSubmit}>
            <label className="login-label" htmlFor="password">Mot de passe</label>
            <input
              id="password"
              className="login-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
            {error && <p className="login-error" role="alert">{error}</p>}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
          <a href="/" className="login-back">Retour au dashboard</a>
        </div>
      </div>
    </div>
  )
}
