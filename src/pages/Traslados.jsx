import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function Traslados() {
  const [traslados, setTraslados] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    fecha: '', hora_vuelo: '', tipo: '', vehiculo_id: ''
  })

  const fetchData = async () => {
    const [{ data: t }, { data: v }] = await Promise.all([
      supabase.from('traslados').select('*, vehiculos(placa, conductor)').order('fecha', { ascending: false }),
      supabase.from('vehiculos').select('*').eq('activo', true)
    ])
    setTraslados(t || [])
    setVehiculos(v || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('traslados').insert([form])
    if (!error) {
      setForm({ fecha: '', hora_vuelo: '', tipo: '', vehiculo_id: '' })
      setShowForm(false)
      fetchData()
    }
  }

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar traslado?')) {
      await supabase.from('traslados').delete().eq('id', id)
      fetchData()
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px', background: '#0d1526',
    border: '1px solid #2a3a4a', borderRadius: '8px',
    color: 'white', fontSize: '14px', boxSizing: 'border-box'
  }

  const labelStyle = { color: '#8899aa', fontSize: '13px', marginBottom: '4px', display: 'block' }

  const estadoColor = {
    pendiente: '#ffaa00',
    en_curso: '#00b4d8',
    completado: '#00cc88'
  }

  return (
    <div style={{ padding: '32px', background: '#0a0f1e', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: 'white' }}>📋 Traslados</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 20px', background: '#00b4d8',
            color: 'white', border: 'none', borderRadius: '8px',
            cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          {showForm ? 'Cancelar' : '+ Nuevo Traslado'}
        </button>
      </div>

      {showForm && (
        <div style={{
          background: '#1a2235', borderRadius: '12px',
          padding: '24px', marginBottom: '24px', border: '1px solid #2a3a4a'
        }}>
          <h3 style={{ color: 'white', marginBottom: '16px' }}>Nuevo Traslado</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Fecha</label>
                <input style={inputStyle} type="date" value={form.fecha}
                  onChange={e => setForm({ ...form, fecha: e.target.value })} required />
              </div>
              <div>
                <label style={labelStyle}>Hora de Vuelo</label>
                <input style={inputStyle} type="time" value={form.hora_vuelo}
                  onChange={e => setForm({ ...form, hora_vuelo: e.target.value })} required />
              </div>
              <div>
                <label style={labelStyle}>Tipo</label>
                <select style={inputStyle} value={form.tipo}
                  onChange={e => setForm({ ...form, tipo: e.target.value })} required>
                  <option value="">Seleccionar...</option>
                  <option value="Salida">Salida</option>
                  <option value="Llegada">Llegada</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Vehículo</label>
                <select style={inputStyle} value={form.vehiculo_id}
                  onChange={e => setForm({ ...form, vehiculo_id: e.target.value })}>
                  <option value="">Sin asignar</option>
                  {vehiculos.map(v => (
                    <option key={v.id} value={v.id}>{v.placa} — {v.conductor}</option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" style={{
              marginTop: '16px', padding: '10px 24px',
              background: '#00b4d8', color: 'white',
              border: 'none', borderRadius: '8px',
              cursor: 'pointer', fontWeight: 'bold'
            }}>
              Guardar Traslado
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#8899aa' }}>Cargando...</p>
      ) : (
        <div style={{
          background: '#1a2235', borderRadius: '12px',
          border: '1px solid #2a3a4a', overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0d1526' }}>
                {['Fecha', 'Hora Vuelo', 'Tipo', 'Vehículo', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', color: '#8899aa',
                    textAlign: 'left', fontSize: '13px'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {traslados.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', color: '#8899aa', textAlign: 'center' }}>
                    No hay traslados registrados
                  </td>
                </tr>
              ) : (
                traslados.map(t => (
                  <tr key={t.id} style={{ borderTop: '1px solid #2a3a4a' }}>
                    <td style={{ padding: '12px 16px', color: 'white' }}>{t.fecha}</td>
                    <td style={{ padding: '12px 16px', color: 'white' }}>{t.hora_vuelo}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '20px',
                        background: t.tipo === 'Salida' ? '#00b4d822' : '#ffaa0022',
                        color: t.tipo === 'Salida' ? '#00b4d8' : '#ffaa00',
                        fontSize: '12px'
                      }}>{t.tipo}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#8899aa' }}>
                      {t.vehiculos ? `${t.vehiculos.placa} — ${t.vehiculos.conductor}` : 'Sin asignar'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '20px',
                        background: `${estadoColor[t.estado]}22`,
                        color: estadoColor[t.estado],
                        fontSize: '12px'
                      }}>{t.estado}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => handleDelete(t.id)}
                        style={{
                          padding: '4px 12px', background: '#ff444422',
                          border: '1px solid #ff4444', borderRadius: '6px',
                          color: '#ff4444', cursor: 'pointer', fontSize: '12px'
                        }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Traslados