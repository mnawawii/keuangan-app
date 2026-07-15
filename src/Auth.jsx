import { useState } from 'react'
import { supabase } from './lib/supabaseClient'

export default function Auth({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    const { data, error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else if (data.session) {
      onLogin(data.session.user)
    } else {
      setInfo('Akun dibuat. Cek email kamu untuk verifikasi sebelum login.')
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-mark">Catatan Keuangan</div>
        <h1 className="auth-title">{mode === 'login' ? 'Masuk' : 'Buat Akun'}</h1>
        <p className="auth-sub">
          {mode === 'login'
            ? 'Lanjutkan pencatatan keuanganmu.'
            : 'Mulai kelola keuangan dengan metode 50/30/20.'}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar'}
          </button>
        </form>

        {error && <div className="error-text">{error}</div>}
        {info && <div className="info-text">{info}</div>}

        <div className="auth-switch">
          {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setError('')
              setInfo('')
            }}
          >
            {mode === 'login' ? 'Daftar' : 'Masuk'}
          </button>
        </div>
      </div>
    </div>
  )
}
