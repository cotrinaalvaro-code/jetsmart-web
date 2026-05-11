import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

const DIRECTO_BLUE = '#1a3fa0'
const DIRECTO_LIGHT = '#e8eef8'

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

          {/* Logo Rutas Crew */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              {/* Logo Directo estilo puntitos */}
              <div style={{ position: 'relative', width: '36px', height: '36px' }}>
                <div style={{ position: 'absolute', top: 0, left: 4, width: 8, height: 8, borderRadius: '50%', background: DIRECTO_BLUE, opacity: 0.4 }} />
                <div style={{ position: 'absolute', top: 0, left: 14, width: 8, height: 8, borderRadius: '50%', background: DIRECTO_BLUE, opacity: 0.7 }} />
                <div style={{ position: 'absolute', top: 0, left: 24, width: 8, height: 8, borderRadius: '50%', background: DIRECTO_BLUE }} />
                <div style={{ position: 'absolute', top: 12, left: 4, width: 8, height: 8, borderRadius: '50%', background: DIRECTO_BLUE, opacity: 0.7 }} />
                <div style={{ position: 'absolute', top: 12, left: 14, width: 8, height: 8, borderRadius: '50%', background: DIRECTO_BLUE }} />
                <div style={{ position: 'absolute', top: 24, left: 4, width: 8, height: 8, borderRadius: '50%', background: DIRECTO_BLUE }} />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: DIRECTO_BLUE, lineHeight: 1 }}>
                  Rutas <span style={{ color: '#00b4d8' }}>Crew</span>
                </div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>by Directo App</div>
              </div>
            </div>
            <p style={{ color: '#888', fontSize: '13px', margin: '8px 0 0' }}>
              Sistema de Traslados de Tripulación ✈
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
                placeholder="correo@empresa.com"
                required
                style={{
                  width: '100%', padding: '10px 12px',
                  border: '1px solid #ddd', borderRadius: '6px',
                  fontSize: '14px', color: '#333', outline: 'none',
                  boxSizing: 'border-box', transition: 'border-color 0.2s'
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
                background: loading ? '#90a4c8' : DIRECTO_BLUE,
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
            © 2026 Directo App · Operaciones Lima
          </p>
        </div>
      </div>

      {/* Lado derecho — Panel */}
      <div style={{
        flex: 1,
        background: `linear-gradient(135deg, #0d1f4e 0%, ${DIRECTO_BLUE} 50%, #00b4d8 100%)`,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '48px', color: 'white'
      }}>
        <div style={{ maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ fontSize: '72px', marginBottom: '24px', animation: 'volar 3s ease-in-out infinite' }}>✈</div>
<style>{`
  @keyframes volar {
    0%   { transform: translateX(-10px) translateY(0px) rotate(-5deg); }
    25%  { transform: translateX(5px)  translateY(-12px) rotate(2deg); }
    50%  { transform: translateX(10px) translateY(0px) rotate(5deg); }
    75%  { transform: translateX(5px)  translateY(12px) rotate(2deg); }
    100% { transform: translateX(-10px) translateY(0px) rotate(-5deg); }
  }
`}</style>
          <h2 style={{ fontSize: '30px', fontWeight: '800', margin: '0 0 8px', lineHeight: '1.2', color: 'white' }}>
            Rutas Crew
          </h2>
          <p style={{ fontSize: '14px', opacity: 0.7, margin: '0 0 8px' }}>by Directo App</p>
          <p style={{ fontSize: '15px', opacity: 0.85, lineHeight: '1.7', margin: '0 0 36px' }}>
            Planifica, agrupa y optimiza los traslados de tripulación hacia el Aeropuerto Internacional Jorge Chávez.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
            {[
  { icon: '⚡', text: 'Agrupamiento automático por corredor y distancia' },
  { icon: '🕐', text: 'Cálculo de tiempos de traslado con análisis de tráfico en vivo y rutas históricas.' },
  { icon: '📊', text: 'Importación automática de la programación de vuelos y tripulación.' },
  { icon: '🗺️', text: 'Mapa interactivo con gestión de grupos en tiempo real para maximizar la eficiencia operativa.' },
  { icon: '📋', text: 'Base de datos histórica de rutas que mejora automáticamente la precisión de cada traslado.' },
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