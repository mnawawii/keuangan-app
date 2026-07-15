import { useState } from 'react'
import { supabase } from './lib/supabaseClient'

export default function Auth({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const { data, error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
    } else if (data.session) {
      onLogin(data.session.user)
    } else {
      setError('Cek email untuk verifikasi akun.')
    }
  }

  return (
    <div style={{ maxWidth: 320, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h2>{mode === 'login' ? 'Login' : 'Daftar'}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: 8 }}
        />
        <input
          type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: 8 }}
        />
        <button type="submit" style={{ width: '100%' }}>
          {mode === 'login' ? 'Login' : 'Daftar'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <p style={{ cursor: 'pointer', color: 'blue' }} onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        {mode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Login'}
      </p>
    </div>
  )
}
