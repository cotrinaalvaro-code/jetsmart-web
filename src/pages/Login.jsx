import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos')
    } else {
      navigate('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* Lado izquierdo — Formulario */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '48px', background: 'white'
      }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>

          {/* Logo */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '28px' }}>✈</span>
              <span style={{ fontSize: '26px', fontWeight: '800', color: '#1a2235' }}>
                Jet<span style={{ color: '#00b4d8' }}>Smart</span>
              </span>
            </div>
            <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>
              Sistema de Traslados de Tripulación
            </p>
          </div>

          {/* Título */}
          <h2 style={{ color: '#1a2235', fontSize: '22px', margin: '0 0 8px', fontWeight: '700' }}>
            Bienvenido 👋
          </h2>
          <p style={{ color: '#888', fontSize: '13px', margin: '0 0 28px' }}>
            Inicia sesión con tu cuenta para continuar
          </p>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fff5f5', border: '1px solid #ffcdd2',
              color: '#c62828', padding: '10px 14px', borderRadius: '6px',
              marginBottom: '16px', fontSize: '13px'
            }}>
              {error}
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#555', fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="correo@jetsmart.com"
                required
                style={{
                  width: '100%', padding: '10px 12px',
                  border: '1px solid #ddd', borderRadius: '6px',
                  fontSize: '14px', color: '#333', outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ color: '#555', fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', padding: '10px 12px',
                  border: '1px solid #ddd', borderRadius: '6px',
                  fontSize: '14px', color: '#333', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px',
                background: loading ? '#90caf9' : '#00b4d8',
                color: 'white', border: 'none', borderRadius: '6px',
                fontSize: '14px', fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p style={{ color: '#bbb', fontSize: '12px', textAlign: 'center', marginTop: '32px' }}>
            © 2026 JetSmart Perú · Operaciones Lima
          </p>
        </div>
      </div>

      {/* Lado derecho — Panel */}
      <div style={{
        flex: 1, background: 'linear-gradient(135deg, #0a1628 0%, #1a3a5c 50%, #00b4d8 100%)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '48px', color: 'white'
      }}>
        <div style={{ maxWidth: '380px', textAlign: 'center' }}>
          <div style={{ fontSize: '72px', marginBottom: '24px' }}>✈</div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 16px', lineHeight: '1.3', color: 'white' }}>
            Gestión Inteligente de Traslados
          </h2>
          <p style={{ fontSize: '15px', opacity: 0.85, lineHeight: '1.7', margin: '0 0 32px' }}>
            Planifica, agrupa y optimiza los traslados de tripulación hacia el Aeropuerto Internacional Jorge Chávez.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
            {[
              { icon: '⚡', text: 'Agrupamiento automático por corredor y distancia' },
              { icon: '📊', text: 'Importación directa del MOV TENTATIVO' },
              { icon: '🗺️', text: 'Visualización geográfica de rutas' },
            ].map(item => (
              <div key={item.text} style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                background: 'rgba(255,255,255,0.1)', borderRadius: '8px',
                padding: '12px 16px'
              }}>
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                <span style={{ fontSize: '13px', opacity: 0.9, lineHeight: '1.5' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}

export default Login