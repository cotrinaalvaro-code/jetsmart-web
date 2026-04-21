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
    borderRadius: '8px',
    cursor: 'pointer',
    border: 'none',
    background: location.pathname === path ? '#00b4d8' : 'transparent',
    color: location.pathname === path ? 'white' : '#8899aa',
    fontSize: '14px',
    fontWeight: 'bold'
  })

  return (
    <nav style={{
      background: '#1a2235',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid #2a3a4a'
    }}>
      <span style={{ color: '#00b4d8', fontWeight: 'bold', fontSize: '18px' }}>
        ✈ JetSmart
      </span>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button style={navStyle('/dashboard')} onClick={() => navigate('/dashboard')}>
          Dashboard
        </button>
        <button style={navStyle('/tripulantes')} onClick={() => navigate('/tripulantes')}>
          Tripulantes
        </button>
        <button style={navStyle('/traslados')} onClick={() => navigate('/traslados')}>
          Traslados
        </button>
      </div>

      <button
        onClick={handleLogout}
        style={{
          padding: '8px 16px',
          background: '#ff444422',
          border: '1px solid #ff4444',
          borderRadius: '8px',
          color: '#ff4444',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold'
        }}
      >
        Cerrar sesión
      </button>
    </nav>
  )
}

export default Navbar