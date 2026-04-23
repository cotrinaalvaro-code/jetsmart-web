import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

function Dashboard() {
  const [stats, setStats] = useState({ tripulantes: 0, vehiculos: 0, traslados: 0 })
  const navigate = useNavigate()

  useEffect(() => {
    const fetchStats = async () => {
      const [{ count: t }, { count: v }, { count: tr }] = await Promise.all([
        supabase.from('tripulantes').select('*', { count: 'exact', head: true }),
        supabase.from('vehiculos').select('*', { count: 'exact', head: true }),
        supabase.from('traslados').select('*', { count: 'exact', head: true })
      ])
      setStats({ tripulantes: t || 0, vehiculos: v || 0, traslados: tr || 0 })
    }
    fetchStats()
  }, [])

  const cards = [
    { icon: '👨‍✈️', label: 'Tripulantes', valor: stats.tripulantes, color: '#1565c0', bg: '#e3f2fd', path: '/tripulantes' },
    { icon: '🚐', label: 'Vehículos', valor: stats.vehiculos, color: '#2e7d32', bg: '#e8f5e9', path: '/traslados' },
    { icon: '📋', label: 'Traslados', valor: stats.traslados, color: '#e65100', bg: '#fff3e0', path: '/traslados' },
  ]

  return (
    <div style={{ background: 'white', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '24px', borderBottom: '1px solid #e0e0e0' }}>
        <h2 style={{ color: '#1a2235', margin: 0, fontSize: '20px' }}>Dashboard</h2>
        <p style={{ color: '#888', margin: '4px 0 0', fontSize: '13px' }}>Resumen del sistema de traslados JetSmart Perú</p>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
          {cards.map(card => (
            <div
              key={card.label}
              onClick={() => navigate(card.path)}
              style={{
                flex: 1, background: 'white', borderRadius: '10px',
                padding: '24px', border: '1px solid #e0e0e0',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                cursor: 'pointer', transition: 'box-shadow 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '10px',
                  background: card.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '24px'
                }}>{card.icon}</div>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: card.color }}>{card.valor}</div>
                  <div style={{ color: '#888', fontSize: '13px' }}>{card.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Accesos rápidos */}
        <div style={{ background: 'white', borderRadius: '10px', padding: '24px', border: '1px solid #e0e0e0' }}>
          <h3 style={{ color: '#1a2235', margin: '0 0 16px', fontSize: '16px' }}>⚡ Accesos Rápidos</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => navigate('/carga')}
              style={{
                padding: '10px 20px', background: '#00b4d8', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                fontWeight: '600', fontSize: '13px'
              }}>
              📂 Importar Tentativo
            </button>
            <button
              onClick={() => navigate('/tripulantes')}
              style={{
                padding: '10px 20px', background: 'white', color: '#1a2235',
                border: '1px solid #e0e0e0', borderRadius: '6px', cursor: 'pointer',
                fontWeight: '600', fontSize: '13px'
              }}>
              + Nuevo Tripulante
            </button>
            <button
              onClick={() => navigate('/configuracion')}
              style={{
                padding: '10px 20px', background: 'white', color: '#1a2235',
                border: '1px solid #e0e0e0', borderRadius: '6px', cursor: 'pointer',
                fontWeight: '600', fontSize: '13px'
              }}>
              ⚙️ Configuración
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard