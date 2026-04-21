import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function Tripulantes() {
  const [tripulantes, setTripulantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    nombre: '', apellido: '', cargo: '',
    correo: '', telefono: '', distrito: ''
  })

  const fetchTripulantes = async () => {
    const { data } = await supabase
      .from('tripulantes')
      .select('*')
      .order('apellido')
    setTripulantes(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchTripulantes() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('tripulantes').insert([form])
    if (!error) {
      setForm({ nombre: '', apellido: '', cargo: '', correo: '', telefono: '', distrito: '' })
      setShowForm(false)
      fetchTripulantes()
    }
  }

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar tripulante?')) {
      await supabase.from('tripulantes').delete().eq('id', id)
      fetchTripulantes()
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px', background: '#0d1526',
    border: '1px solid #2a3a4a', borderRadius: '8px',
    color: 'white', fontSize: '14px', boxSizing: 'border-box'
  }

  const labelStyle = { color: '#8899aa', fontSize: '13px', marginBottom: '4px', display: 'block' }

  return (
    <div style={{ padding: '32px', background: '#0a0f1e', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: 'white' }}>👨‍✈️ Tripulantes</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 20px', background: '#00b4d8',
            color: 'white', border: 'none', borderRadius: '8px',
            cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          {showForm ? 'Cancelar' : '+ Nuevo Tripulante'}
        </button>
      </div>

      {showForm && (
        <div style={{
          background: '#1a2235', borderRadius: '12px',
          padding: '24px', marginBottom: '24px', border: '1px solid #2a3a4a'
        }}>
          <h3 style={{ color: 'white', marginBottom: '16px' }}>Nuevo Tripulante</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Nombre</label>
                <input style={inputStyle} value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })} required />
              </div>
              <div>
                <label style={labelStyle}>Apellido</label>
                <input style={inputStyle} value={form.apellido}
                  onChange={e => setForm({ ...form, apellido: e.target.value })} required />
              </div>
              <div>
                <label style={labelStyle}>Cargo</label>
                <select style={inputStyle} value={form.cargo}
                  onChange={e => setForm({ ...form, cargo: e.target.value })} required>
                  <option value="">Seleccionar...</option>
                  <option value="Comandante">Comandante</option>
                  <option value="Copiloto">Copiloto</option>
                  <option value="Sobrecargo">Sobrecargo</option>
                  <option value="Tripulante de Cabina">Tripulante de Cabina</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Correo</label>
                <input style={inputStyle} type="email" value={form.correo}
                  onChange={e => setForm({ ...form, correo: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Teléfono</label>
                <input style={inputStyle} value={form.telefono}
                  onChange={e => setForm({ ...form, telefono: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Distrito</label>
                <input style={inputStyle} value={form.distrito}
                  onChange={e => setForm({ ...form, distrito: e.target.value })} />
              </div>
            </div>
            <button type="submit" style={{
              marginTop: '16px', padding: '10px 24px',
              background: '#00b4d8', color: 'white',
              border: 'none', borderRadius: '8px',
              cursor: 'pointer', fontWeight: 'bold'
            }}>
              Guardar Tripulante
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
                {['Nombre', 'Cargo', 'Correo', 'Teléfono', 'Distrito', 'Acciones'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', color: '#8899aa',
                    textAlign: 'left', fontSize: '13px'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tripulantes.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', color: '#8899aa', textAlign: 'center' }}>
                    No hay tripulantes registrados
                  </td>
                </tr>
              ) : (
                tripulantes.map(t => (
                  <tr key={t.id} style={{ borderTop: '1px solid #2a3a4a' }}>
                    <td style={{ padding: '12px 16px', color: 'white' }}>
                      {t.nombre} {t.apellido}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '20px',
                        background: '#00b4d822', color: '#00b4d8', fontSize: '12px'
                      }}>{t.cargo}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#8899aa' }}>{t.correo}</td>
                    <td style={{ padding: '12px 16px', color: '#8899aa' }}>{t.telefono}</td>
                    <td style={{ padding: '12px 16px', color: '#8899aa' }}>{t.distrito}</td>
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

export default Tripulantes