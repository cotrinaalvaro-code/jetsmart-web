import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const GRUPOS = [
  {
    titulo: '🚗 Capacidad de Vehículos',
    params: ['max_pax_auto', 'van_disponible', 'max_pax_van', 'max_pax_punta']
  },
  {
    titulo: '📏 Distancias',
    params: ['dist_max_km', 'dist_max_p2_km', 'angulo_max']
  },
  {
    titulo: '⏱️ Ventanas de Tiempo',
    params: ['ventana_dist_vuelo', 'punta_manana_ini', 'punta_manana_fin', 'punta_noche_ini', 'punta_noche_fin']
  },
  {
    titulo: '⚙️ Opciones de Agrupamiento',
    params: ['dia_valle_total', 'agrupar_dist_vuelo']
  },
  {
    titulo: '📍 Coordenadas Aeropuerto',
    params: ['ato_lat', 'ato_lon']
  },
]

function Configuracion() {
  const navigate = useNavigate()
  const [config, setConfig] = useState({})
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase.from('configuracion').select('*')
      if (data) {
        const map = {}
        data.forEach(row => { map[row.id] = row })
        setConfig(map)
      }
      setLoading(false)
    }
    fetchConfig()
  }, [])

  const handleChange = (id, valor) => {
    setConfig(prev => ({
      ...prev,
      [id]: { ...prev[id], valor }
    }))
  }

  const handleGuardar = async () => {
    setGuardando(true)
    setMensaje('')
    let error = false
    for (const key of Object.keys(config)) {
      const { error: err } = await supabase
        .from('configuracion')
        .update({ valor: config[key].valor })
        .eq('id', key)
      if (err) error = true
    }
    setGuardando(false)
    setMensaje(error ? '❌ Error al guardar algunos parámetros.' : '✅ Configuración guardada correctamente.')
    setTimeout(() => setMensaje(''), 3000)
  }

  const renderInput = (param) => {
    const row = config[param]
    if (!row) return null
    const esBool = row.unidad === 'SI/NO'
    const esHora = row.unidad === 'HH:MM'

    return (
      <div key={param} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid #f0f4f8'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#1a2235', fontSize: '14px', fontWeight: '500' }}>
            {row.descripcion}
          </div>
          <div style={{ color: '#aab', fontSize: '11px', marginTop: '2px' }}>
            {param} · {row.unidad}
          </div>
        </div>
        <div style={{ marginLeft: '24px' }}>
          {esBool ? (
            <select
              value={row.valor}
              onChange={e => handleChange(param, e.target.value)}
              style={{
                padding: '8px 16px', borderRadius: '8px',
                border: '1px solid #e0e8f0', background: '#f4f6f9',
                color: '#1a2235', fontSize: '14px', fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          ) : esHora ? (
            <input
              type="time"
              value={row.valor}
              onChange={e => handleChange(param, e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #e0e8f0', background: '#f4f6f9',
                color: '#1a2235', fontSize: '14px', fontWeight: '600'
              }}
            />
          ) : (
            <input
              type="number"
              value={row.valor}
              step="any"
              onChange={e => handleChange(param, e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #e0e8f0', background: '#f4f6f9',
                color: '#1a2235', fontSize: '14px', fontWeight: '600',
                width: '120px', textAlign: 'right'
              }}
            />
          )}
        </div>
      </div>
    )
  }

  if (loading) return (
    <div style={{ padding: '32px', background: 'white', minHeight: '100vh' }}>
      <p style={{ color: '#667788' }}>Cargando configuración...</p>
    </div>
  )

  return (
    <div style={{ padding: '32px', background: 'white', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 style={{ color: '#1a2235', marginBottom: '4px' }}>⚙️ Configuración</h2>
          <p style={{ color: '#667788' }}>Parámetros del algoritmo de agrupamiento</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {mensaje && (
            <span style={{
              color: mensaje.includes('✅') ? '#00aa66' : '#ff4444',
              fontWeight: 'bold', fontSize: '14px'
            }}>{mensaje}</span>
          )}
          <button
            onClick={handleGuardar}
            disabled={guardando}
            style={{
              padding: '12px 28px', background: guardando ? '#aab' : '#00b4d8',
              color: 'white', border: 'none', borderRadius: '8px',
              fontWeight: 'bold', fontSize: '15px', cursor: guardando ? 'not-allowed' : 'pointer'
            }}
          >
            {guardando ? 'Guardando...' : '💾 Guardar cambios'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {GRUPOS.map(grupo => (
          <div key={grupo.titulo} style={{
            background: 'white', borderRadius: '12px',
            border: '1px solid #e0e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px', background: '#f8fafc',
              borderBottom: '2px solid #e0e8f0'
            }}>
              <h3 style={{ color: '#1a2235', margin: 0, fontSize: '15px' }}>
                {grupo.titulo}
              </h3>
            </div>
            {grupo.params.map(p => renderInput(p))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Configuracion
