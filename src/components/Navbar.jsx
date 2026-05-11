import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const DIRECTO_BLUE = '#1a3fa0'

function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const navStyle = (path) => ({
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    border: 'none',
    background: location.pathname === path ? '#e8eef8' : 'transparent',
    color: location.pathname === path ? DIRECTO_BLUE : '#555',
    fontSize: '13px',
    fontWeight: location.pathname === path ? '700' : '500',
    transition: 'all 0.2s'
  })

  return (
    <nav style={{
      background: 'white',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: `2px solid ${DIRECTO_BLUE}`,
      height: '52px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ position: 'relative', width: '28px', height: '28px' }}>
          <div style={{ position: 'absolute', top: 0, left: 3, width: 6, height: 6, borderRadius: '50%', background: DIRECTO_BLUE, opacity: 0.4 }} />
          <div style={{ position: 'absolute', top: 0, left: 11, width: 6, height: 6, borderRadius: '50%', background: DIRECTO_BLUE, opacity: 0.7 }} />
          <div style={{ position: 'absolute', top: 0, left: 19, width: 6, height: 6, borderRadius: '50%', background: DIRECTO_BLUE }} />
          <div style={{ position: 'absolute', top: 9, left: 3, width: 6, height: 6, borderRadius: '50%', background: DIRECTO_BLUE, opacity: 0.7 }} />
          <div style={{ position: 'absolute', top: 9, left: 11, width: 6, height: 6, borderRadius: '50%', background: DIRECTO_BLUE }} />
          <div style={{ position: 'absolute', top: 18, left: 3, width: 6, height: 6, borderRadius: '50%', background: DIRECTO_BLUE }} />
        </div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: DIRECTO_BLUE, lineHeight: 1 }}>
            Rutas <span style={{ color: '#00b4d8' }}>Crew</span>
          </div>
          <div style={{ fontSize: '9px', color: '#aaa', lineHeight: 1 }}>by Directo App</div>
        </div>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
        <button style={navStyle('/dashboard')} onClick={() => navigate('/dashboard')}>Dashboard</button>
        <button style={navStyle('/carga')} onClick={() => navigate('/carga')}>📂 Carga</button>
        <button style={navStyle('/tripulantes')} onClick={() => navigate('/tripulantes')}>👨‍✈️ Tripulantes</button>
        <button style={navStyle('/configuracion')} onClick={() => navigate('/configuracion')}>⚙️ Config</button>
        <button style={navStyle('/corredores')} onClick={() => navigate('/corredores')}>🗺️ Corredores</button>
        <button style={navStyle('/traslados')} onClick={() => navigate('/traslados')}>🚐 Traslados</button>
        <button style={navStyle('/historico-eta')} onClick={() => navigate('/historico-eta')}>📋 Histórico ETA</button>
      </div>

      {/* Logout */}
      <button onClick={handleLogout} style={{
        padding: '7px 16px', background: 'white',
        border: `1px solid ${DIRECTO_BLUE}`, borderRadius: '6px',
        color: DIRECTO_BLUE, cursor: 'pointer', fontSize: '13px', fontWeight: '600'
      }}>
        Cerrar sesión
      </button>
    </nav>
  )
}

export default Navbar