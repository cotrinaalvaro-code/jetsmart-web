import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const navStyle = (path) => ({
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    border: 'none',
    background: location.pathname === path ? '#e3f2fd' : 'transparent',
    color: location.pathname === path ? '#1565c0' : '#555',
    fontSize: '14px',
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
      borderBottom: '1px solid #e0e0e0',
      height: '52px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '20px' }}>✈</span>
        <span style={{ color: '#1a2235', fontWeight: '800', fontSize: '18px', letterSpacing: '-0.5px' }}>
          Jet<span style={{ color: '#00b4d8' }}>Smart</span>
        </span>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <button style={navStyle('/dashboard')} onClick={() => navigate('/dashboard')}>
          Dashboard
        </button>
        <button style={navStyle('/carga')} onClick={() => navigate('/carga')}>
          📂 Carga
        </button>
        <button style={navStyle('/tripulantes')} onClick={() => navigate('/tripulantes')}>
          Tripulantes
        </button>
        <button style={navStyle('/configuracion')} onClick={() => navigate('/configuracion')}>
          ⚙️ Config
        </button>
        <button style={navStyle('/corredores')} onClick={() => navigate('/corredores')}>
          🗺️ Corredores
        </button>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        style={{
          padding: '7px 16px',
          background: 'white',
          border: '1px solid #e53935',
          borderRadius: '6px',
          color: '#e53935',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '600'
        }}
      >
        Cerrar sesión
      </button>
    </nav>
  )
}

export default Navbar