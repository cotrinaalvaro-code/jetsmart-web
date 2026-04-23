import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function Tripulantes() {
  const [tripulantes, setTripulantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [form, setForm] = useState({
    dni: '', nombre: '', apellido: '', cargo: '', correo: '',
    telefono: '', direccion: '', distrito: '', zona_distrito: '',
    lat: '', lng: '', referencia: '', fecha_ingreso: ''
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
    if (editando) {
      await supabase.from('tripulantes').update(form).eq('id', editando)
    } else {
      await supabase.from('tripulantes').insert([form])
    }
    setForm({
      dni: '', nombre: '', apellido: '', cargo: '', correo: '',
      telefono: '', direccion: '', distrito: '', zona_distrito: '',
      lat: '', lng: '', referencia: '', fecha_ingreso: ''
    })
    setShowForm(false)
    setEditando(null)
    fetchTripulantes()
  }

  const handleEdit = (t) => {
    setForm({
      dni: t.dni || '', nombre: t.nombre || '', apellido: t.apellido || '',
      cargo: t.cargo || '', correo: t.correo || '', telefono: t.telefono || '',
      direccion: t.direccion || '', distrito: t.distrito || '',
      zona_distrito: t.zona_distrito || '', lat: t.lat || '',
      lng: t.lng || '', referencia: t.referencia || '',
      fecha_ingreso: t.fecha_ingreso || ''
    })
    setEditando(t.id)
    setShowForm(true)
    window.scrollTo(0, 0)
  }

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar tripulante?')) {
      await supabase.from('tripulantes').delete().eq('id', id)
      fetchTripulantes()
    }
  }

  const filtrados = tripulantes.filter(t =>
    `${t.nombre} ${t.apellido} ${t.cargo} ${t.distrito} ${t.dni}`.toLowerCase().includes(busqueda.toLowerCase())
  )

  const inputStyle = {
    width: '100%', padding: '7px 10px', background: 'white',
    border: '1px solid #ddd', borderRadius: '6px',
    color: '#333', fontSize: '13px', boxSizing: 'border-box'
  }
  const labelStyle = { color: '#555', fontSize: '11px', marginBottom: '3px', display: 'block', fontWeight: '600' }

  const cargos = ['Capitán', 'Capitán Instructor', 'Primer Oficial', 'Sobrecargo',
    'TEA', 'TEA Senior', 'TEA TRAINEE', 'TEA Instructor', 'TEA Coordinador',
    'TEA Ultra', 'Jefe de Instrucción', 'Jefe de Pilotos', 'Safety Pilot',
    'Gerente de Operación Piloto', 'Gerente General']

  return (
    <div style={{ background: 'white', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ color: '#1a2235', margin: 0, fontSize: '20px' }}>👨‍✈️ Tripulantes</h2>
          <p style={{ color: '#888', margin: '4px 0 0', fontSize: '13px' }}>{tripulantes.length} tripulantes registrados</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            placeholder="🔍 Buscar por nombre, DNI, cargo..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{
              padding: '7px 12px', border: '1px solid #ddd', borderRadius: '6px',
              fontSize: '13px', width: '260px', outline: 'none'
            }}
          />
          <button
            onClick={() => { setShowForm(!showForm); setEditando(null); setForm({ dni: '', nombre: '', apellido: '', cargo: '', correo: '', telefono: '', direccion: '', distrito: '', zona_distrito: '', lat: '', lng: '', referencia: '', fecha_ingreso: '' }) }}
            style={{
              padding: '8px 18px', background: '#00b4d8', color: 'white',
              border: 'none', borderRadius: '6px', cursor: 'pointer',
              fontWeight: '600', fontSize: '13px'
            }}
          >
            {showForm && !editando ? 'Cancelar' : '+ Nuevo Tripulante'}
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e0e0e0', background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: '#1a2235', margin: 0, fontSize: '15px' }}>
              {editando ? '✏️ Editar Tripulante' : '➕ Nuevo Tripulante'}
            </h3>
            <button onClick={() => { setShowForm(false); setEditando(null) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '18px' }}>✕</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>DNI</label>
                <input style={inputStyle} value={form.dni}
                  onChange={e => setForm({ ...form, dni: e.target.value })} required />
              </div>
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
                  {cargos.map(c => <option key={c} value={c}>{c}</option>)}
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
                <label style={labelStyle}>Fecha de Ingreso</label>
                <input style={inputStyle} type="date" value={form.fecha_ingreso}
                  onChange={e => setForm({ ...form, fecha_ingreso: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Distrito</label>
                <input style={inputStyle} value={form.distrito}
                  onChange={e => setForm({ ...form, distrito: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Zona Distrito</label>
                <input style={inputStyle} value={form.zona_distrito}
                  onChange={e => setForm({ ...form, zona_distrito: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Latitud</label>
                <input style={inputStyle} value={form.lat}
                  onChange={e => setForm({ ...form, lat: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Longitud</label>
                <input style={inputStyle} value={form.lng}
                  onChange={e => setForm({ ...form, lng: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Dirección completa</label>
                <input style={inputStyle} value={form.direccion}
                  onChange={e => setForm({ ...form, direccion: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Referencia</label>
                <input style={inputStyle} value={form.referencia}
                  onChange={e => setForm({ ...form, referencia: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" style={{
                padding: '8px 20px', background: '#00b4d8', color: 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px'
              }}>
                {editando ? '💾 Guardar cambios' : '➕ Agregar Tripulante'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditando(null) }} style={{
                padding: '8px 20px', background: 'white', color: '#555',
                border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px'
              }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Cargando...</div>
      ) : (
        <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 120px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                {['DNI', 'Nombre', 'Cargo', 'Correo', 'Teléfono', 'Zona Distrito', 'Dirección', 'Lat', 'Lng', 'F. Ingreso', 'Acciones'].map(h => (
                  <th key={h} style={{
                    padding: '10px 12px', color: '#555', textAlign: 'left',
                    fontSize: '11px', fontWeight: '600', background: 'white',
                    position: 'sticky', top: 0, whiteSpace: 'nowrap',
                    borderBottom: '2px solid #e0e0e0'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: '40px', color: '#888', textAlign: 'center' }}>
                    No hay tripulantes
                  </td>
                </tr>
              ) : (
                filtrados.map((t, idx) => (
                  <tr key={t.id} style={{
                    borderBottom: '1px solid #f0f0f0',
                    background: idx % 2 === 0 ? 'white' : '#fafafa'
                  }}>
                    <td style={{ padding: '8px 12px', color: '#888', fontSize: '12px' }}>{t.dni}</td>
                    <td style={{ padding: '8px 12px', color: '#333', fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap' }}>
                      {t.nombre} {t.apellido}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        padding: '2px 6px', borderRadius: '4px',
                        background: '#e3f2fd', color: '#1565c0', fontSize: '11px', fontWeight: '600',
                        whiteSpace: 'nowrap'
                      }}>{t.cargo}</span>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#888', fontSize: '12px' }}>{t.correo}</td>
                    <td style={{ padding: '8px 12px', color: '#888', fontSize: '12px' }}>{t.telefono}</td>
                    <td style={{ padding: '8px 12px', color: '#888', fontSize: '12px', whiteSpace: 'nowrap' }}>{t.zona_distrito}</td>
                    <td style={{ padding: '8px 12px', color: '#888', fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.direccion}</td>
                    <td style={{ padding: '8px 12px', color: '#aaa', fontSize: '11px' }}>{t.lat ? parseFloat(t.lat).toFixed(6) : ''}</td>
                    <td style={{ padding: '8px 12px', color: '#aaa', fontSize: '11px' }}>{t.lng ? parseFloat(t.lng).toFixed(6) : ''}</td>
                    <td style={{ padding: '8px 12px', color: '#888', fontSize: '12px', whiteSpace: 'nowrap' }}>{t.fecha_ingreso}</td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => handleEdit(t)}
                        style={{
                          padding: '3px 10px', background: 'white',
                          border: '1px solid #00b4d8', borderRadius: '4px',
                          color: '#00b4d8', cursor: 'pointer', fontSize: '11px',
                          fontWeight: '600', marginRight: '6px'
                        }}
                      >Editar</button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        style={{
                          padding: '3px 10px', background: 'white',
                          border: '1px solid #e53935', borderRadius: '4px',
                          color: '#e53935', cursor: 'pointer', fontSize: '11px', fontWeight: '600'
                        }}
                      >Eliminar</button>
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