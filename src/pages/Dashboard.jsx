import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function Dashboard() {
  const [stats, setStats] = useState({
    tripulantes: 0,
    vehiculos: 0,
    traslados: 0
  })

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

  const cardStyle = {
    background: '#1a2235',
    borderRadius: '12px',
    padding: '24px',
    flex: 1,
    textAlign: 'center',
    border: '1px solid #2a3a4a'
  }

  return (
    <div style={{ padding: '32px', background: '#0a0f1e', minHeight: '100vh' }}>
      <h2 style={{ color: 'white', marginBottom: '8px' }}>Panel Principal</h2>
      <p style={{ color: '#8899aa', marginBottom: '32px' }}>
        Resumen del sistema de traslados
      </p>

      <div style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
        <div style={cardStyle}>
          <div style={{ fontSize: '48px' }}>👨‍✈️</div>
          <div style={{ fontSize: '36px', color: '#00b4d8', fontWeight: 'bold' }}>
            {stats.tripulantes}
          </div>
          <div style={{ color: '#8899aa', marginTop: '8px' }}>Tripulantes</div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: '48px' }}>🚐</div>
          <div style={{ fontSize: '36px', color: '#00b4d8', fontWeight: 'bold' }}>
            {stats.vehiculos}
          </div>
          <div style={{ color: '#8899aa', marginTop: '8px' }}>Vehículos</div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: '48px' }}>📋</div>
          <div style={{ fontSize: '36px', color: '#00b4d8', fontWeight: 'bold' }}>
            {stats.traslados}
          </div>
          <div style={{ color: '#8899aa', marginTop: '8px' }}>Traslados</div>
        </div>
      </div>

      <div style={{
        background: '#1a2235',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #2a3a4a'
      }}>
        <h3 style={{ color: 'white', marginBottom: '16px' }}>⚡ Accesos Rápidos</h3>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a href="/tripulantes" style={{
            padding: '12px 24px',
            background: '#00b4d8',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 'bold'
          }}>
            + Nuevo Tripulante
          </a>
          <a href="/traslados" style={{
            padding: '12px 24px',
            background: '#2a3a4a',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 'bold'
          }}>
            + Nuevo Traslado
          </a>
        </div>
      </div>
    </div>
  )
}

export default Dashboard