import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const COLORES_CORREDOR = {
  'AV. ARICA': '#00897b', 'AV. ARICA 1': '#00897b', 'AV. ARICA 2': '#00897b',
  'CALLAO 1': '#1e88e5', 'CALLAO 2': '#1e88e5', 'CALLAO 3': '#1e88e5',
  'CALLAO NORTE': '#1e88e5', 'CALLAO GAMBETA': '#1e88e5',
  'CENTRO': '#6d4c41', 'CENTRO 1': '#6d4c41', 'CENTRO 2': '#6d4c41', 'CENTRO 3': '#6d4c41',
  'COSTA VERDE': '#43a047', 'COSTA VERDE 1': '#43a047', 'COSTA VERDE 2': '#43a047', 'COSTA VERDE 3': '#43a047',
  'ESTE': '#00acc1', 'ESTE 1': '#00acc1', 'ESTE 2': '#00acc1', 'ESTE 3': '#00acc1', 'ESTE 4': '#00acc1', 'ESTE 5': '#00acc1',
  'NORTE 1': '#e53935', 'NORTE 2': '#e53935', 'NORTE 3': '#e53935', 'NORTE 4': '#e53935', 'NORTE 5': '#e53935',
  'NORESTE 1': '#ff7043', 'NORESTE 2': '#ff7043', 'NORESTE 3': '#ff7043',
  'PANAMERICANA SUR': '#5e35b1', 'PANAMERICANA SUR 1': '#5e35b1',
  'SAN MIGUEL': '#8e24aa', 'SAN MIGUEL 1': '#8e24aa', 'SAN MIGUEL 2': '#8e24aa',
  'VIA EVITAMIENTO': '#f9a825', 'VIA EVITAMIENTO 1': '#f9a825', 'VIA EVITAMIENTO 2': '#f9a825',
  'VENTANILLA': '#546e7a',
}

const getColor = (corredor) => COLORES_CORREDOR[(corredor || '').toUpperCase()] || '#90a4ae'

const FRANJA_COLORES = {
  '': { bg: '#f5f5f5', color: '#555', label: 'SIEMPRE' },
  'VALLE': { bg: '#e8f5e9', color: '#2e7d32', label: 'VALLE' },
  'PUNTA': { bg: '#fff3e0', color: '#e65100', label: 'PUNTA' },
}

function Corredores() {
  const [tab, setTab] = useState('zonas')
  const [zonas, setZonas] = useState([])
  const [compat, setCompat] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState(null)
  const [formZona, setFormZona] = useState({ zona: '', corredor: '', ruta: '', tipo: '' })
  const [formCompat, setFormCompat] = useState({ corredor_a: '', corredor_b: '', franja: '' })
  const [showFormZona, setShowFormZona] = useState(false)
  const [showFormCompat, setShowFormCompat] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const fetchData = async () => {
    setLoading(true)
    const [{ data: z }, { data: c }] = await Promise.all([
      supabase.from('corredores').select('*').order('corredor').order('zona'),
      supabase.from('corredores_compat').select('*').order('corredor_a').order('corredor_b'),
    ])
    setZonas(z || [])
    setCompat(c || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const mostrarMensaje = (msg) => {
    setMensaje(msg)
    setTimeout(() => setMensaje(''), 3000)
  }

  // ZONAS
  const guardarZona = async () => {
    if (!formZona.zona || !formZona.corredor) return
    if (editando) {
      await supabase.from('corredores').update(formZona).eq('id', editando)
    } else {
      await supabase.from('corredores').insert([formZona])
    }
    setFormZona({ zona: '', corredor: '', ruta: '', tipo: '' })
    setShowFormZona(false)
    setEditando(null)
    fetchData()
    mostrarMensaje('✅ Guardado correctamente')
  }

  const editarZona = (z) => {
    setFormZona({ zona: z.zona, corredor: z.corredor, ruta: z.ruta || '', tipo: z.tipo || '' })
    setEditando(z.id)
    setShowFormZona(true)
    setTab('zonas')
  }

  const eliminarZona = async (id) => {
    if (!confirm('¿Eliminar esta zona?')) return
    await supabase.from('corredores').delete().eq('id', id)
    fetchData()
  }

  // COMPATIBILIDAD
  const guardarCompat = async () => {
    if (!formCompat.corredor_a || !formCompat.corredor_b) return
    await supabase.from('corredores_compat').insert([formCompat])
    setFormCompat({ corredor_a: '', corredor_b: '', franja: '' })
    setShowFormCompat(false)
    fetchData()
    mostrarMensaje('✅ Par de corredores agregado')
  }

  const eliminarCompat = async (id) => {
    if (!confirm('¿Eliminar este par de corredores?')) return
    await supabase.from('corredores_compat').delete().eq('id', id)
    fetchData()
  }

  const corredoresUnicos = [...new Set(zonas.map(z => z.corredor))].sort()

  const zonasFiltradas = zonas.filter(z =>
    `${z.zona} ${z.corredor}`.toLowerCase().includes(busqueda.toLowerCase())
  )
  const compatFiltrados = compat.filter(c =>
    `${c.corredor_a} ${c.corredor_b}`.toLowerCase().includes(busqueda.toLowerCase())
  )

  // Agrupar zonas por corredor
  const zonasPorCorredor = {}
  zonasFiltradas.forEach(z => {
    if (!zonasPorCorredor[z.corredor]) zonasPorCorredor[z.corredor] = []
    zonasPorCorredor[z.corredor].push(z)
  })

  const inputStyle = { width: '100%', padding: '7px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', color: '#333', boxSizing: 'border-box' }
  const labelStyle = { fontSize: '11px', color: '#555', fontWeight: '600', display: 'block', marginBottom: '3px' }

  return (
    <div style={{ background: 'white', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#1a2235' }}>🗺️ Corredores</h2>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#888' }}>
            {zonas.length} zonas · {corredoresUnicos.length} corredores · {compat.length} pares compatibles
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {mensaje && <span style={{ color: '#2e7d32', fontWeight: '600', fontSize: '13px' }}>{mensaje}</span>}
          <input
            placeholder="🔍 Buscar..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', width: '200px' }}
          />
          {tab === 'zonas' && (
            <button onClick={() => { setShowFormZona(!showFormZona); setEditando(null); setFormZona({ zona: '', corredor: '', ruta: '', tipo: '' }) }}
              style={{ padding: '7px 16px', background: '#00b4d8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
              {showFormZona ? 'Cancelar' : '+ Nueva Zona'}
            </button>
          )}
          {tab === 'compat' && (
            <button onClick={() => setShowFormCompat(!showFormCompat)}
              style={{ padding: '7px 16px', background: '#00b4d8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
              {showFormCompat ? 'Cancelar' : '+ Nuevo Par'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', background: 'white' }}>
        {[
          { key: 'zonas', label: `📍 Zona → Corredor (${zonas.length})` },
          { key: 'compat', label: `🔗 Compatibilidad (${compat.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: tab === t.key ? '700' : '500',
            color: tab === t.key ? '#1565c0' : '#888',
            borderBottom: tab === t.key ? '2px solid #1565c0' : '2px solid transparent',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Formulario Zona */}
      {tab === 'zonas' && showFormZona && (
        <div style={{ padding: '16px 24px', background: '#fafafa', borderBottom: '1px solid #e0e0e0' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#1a2235' }}>
            {editando ? '✏️ Editar Zona' : '➕ Nueva Zona'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Zona (BD col K)</label>
              <input style={inputStyle} value={formZona.zona} onChange={e => setFormZona({ ...formZona, zona: e.target.value.toUpperCase() })} placeholder="Ej: MIRAFLORES HUACA" />
            </div>
            <div>
              <label style={labelStyle}>Corredor</label>
              <input style={inputStyle} value={formZona.corredor} onChange={e => setFormZona({ ...formZona, corredor: e.target.value.toUpperCase() })}
                list="corredores-list" placeholder="Ej: COSTA VERDE 2" />
              <datalist id="corredores-list">
                {corredoresUnicos.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label style={labelStyle}>Ruta hacia ATO</label>
              <input style={inputStyle} value={formZona.ruta} onChange={e => setFormZona({ ...formZona, ruta: e.target.value })} placeholder="Ej: Via Expressa → ATO" />
            </div>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select style={inputStyle} value={formZona.tipo} onChange={e => setFormZona({ ...formZona, tipo: e.target.value })}>
                <option value="">RADIO (distancia)</option>
                <option value="LINEAL">LINEAL (sin límite)</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={guardarZona} style={{ padding: '7px 20px', background: '#00b4d8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
              {editando ? '💾 Guardar cambios' : '➕ Agregar'}
            </button>
            <button onClick={() => { setShowFormZona(false); setEditando(null) }} style={{ padding: '7px 20px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Formulario Compatibilidad */}
      {tab === 'compat' && showFormCompat && (
        <div style={{ padding: '16px 24px', background: '#fafafa', borderBottom: '1px solid #e0e0e0' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#1a2235' }}>➕ Nuevo Par Compatible</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Corredor A</label>
              <input style={inputStyle} value={formCompat.corredor_a} onChange={e => setFormCompat({ ...formCompat, corredor_a: e.target.value.toUpperCase() })}
                list="corredores-list-a" placeholder="Ej: COSTA VERDE" />
              <datalist id="corredores-list-a">
                {corredoresUnicos.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label style={labelStyle}>Corredor B</label>
              <input style={inputStyle} value={formCompat.corredor_b} onChange={e => setFormCompat({ ...formCompat, corredor_b: e.target.value.toUpperCase() })}
                list="corredores-list-b" placeholder="Ej: SAN MIGUEL" />
              <datalist id="corredores-list-b">
                {corredoresUnicos.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label style={labelStyle}>Franja horaria</label>
              <select style={inputStyle} value={formCompat.franja} onChange={e => setFormCompat({ ...formCompat, franja: e.target.value })}>
                <option value="">SIEMPRE</option>
                <option value="VALLE">VALLE (fuera de punta)</option>
                <option value="PUNTA">PUNTA (hora punta)</option>
              </select>
            </div>
          </div>
          <button onClick={guardarCompat} style={{ padding: '7px 20px', background: '#00b4d8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
            ➕ Agregar Par
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Cargando...</div>
      ) : (
        <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 160px)' }}>

          {/* TAB ZONAS — agrupado por corredor */}
          {tab === 'zonas' && (
            <div style={{ padding: '16px 24px' }}>
              {Object.entries(zonasPorCorredor).map(([corredor, zonasList]) => {
                const color = getColor(corredor)
                const esLineal = zonasList.some(z => z.tipo === 'LINEAL')
                return (
                  <div key={corredor} style={{ marginBottom: '20px', border: '1px solid #e0e0e0', borderRadius: '10px', overflow: 'hidden' }}>
                    {/* Header corredor */}
                    <div style={{ padding: '10px 16px', background: color, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{corredor}</span>
                      {esLineal && (
                        <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.25)', borderRadius: '4px', fontSize: '11px', color: 'white', fontWeight: '600' }}>LINEAL</span>
                      )}
                      <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>{zonasList.length} zona{zonasList.length !== 1 ? 's' : ''}</span>
                    </div>
                    {/* Zonas */}
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#fafafa' }}>
                          <th style={{ padding: '7px 16px', fontSize: '11px', color: '#888', textAlign: 'left', fontWeight: '600' }}>ZONA</th>
                          <th style={{ padding: '7px 16px', fontSize: '11px', color: '#888', textAlign: 'left', fontWeight: '600' }}>RUTA HACIA ATO</th>
                          <th style={{ padding: '7px 16px', fontSize: '11px', color: '#888', textAlign: 'left', fontWeight: '600' }}>TIPO</th>
                          <th style={{ padding: '7px 16px', fontSize: '11px', color: '#888', textAlign: 'center', fontWeight: '600' }}>ACCIONES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zonasList.map((z, idx) => (
                          <tr key={z.id} style={{ borderTop: '1px solid #f0f0f0', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                            <td style={{ padding: '7px 16px', fontSize: '12px', fontWeight: '600', color: '#333' }}>{z.zona}</td>
                            <td style={{ padding: '7px 16px', fontSize: '12px', color: '#888' }}>{z.ruta}</td>
                            <td style={{ padding: '7px 16px' }}>
                              {z.tipo === 'LINEAL' && (
                                <span style={{ padding: '2px 6px', background: color + '20', color: color, borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>LINEAL</span>
                              )}
                            </td>
                            <td style={{ padding: '7px 16px', textAlign: 'center' }}>
                              <button onClick={() => editarZona(z)} style={{ padding: '3px 10px', border: '1px solid #00b4d8', borderRadius: '4px', background: 'white', color: '#00b4d8', cursor: 'pointer', fontSize: '11px', marginRight: '6px' }}>✏️ Editar</button>
                              <button onClick={() => eliminarZona(z.id)} style={{ padding: '3px 10px', border: '1px solid #e53935', borderRadius: '4px', background: 'white', color: '#e53935', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          )}

          {/* TAB COMPATIBILIDAD */}
          {tab === 'compat' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                  {['Corredor A', 'Corredor B', 'Franja', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', color: '#555', textAlign: 'left', fontSize: '11px', fontWeight: '600', background: 'white', position: 'sticky', top: 0 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compatFiltrados.map((c, idx) => {
                  const colorA = getColor(c.corredor_a)
                  const colorB = getColor(c.corredor_b)
                  const franja = FRANJA_COLORES[c.franja || ''] || FRANJA_COLORES['']
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '8px 16px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '5px', background: colorA + '20', color: colorA, fontWeight: '700', fontSize: '12px' }}>{c.corredor_a}</span>
                      </td>
                      <td style={{ padding: '8px 16px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '5px', background: colorB + '20', color: colorB, fontWeight: '700', fontSize: '12px' }}>{c.corredor_b}</span>
                      </td>
                      <td style={{ padding: '8px 16px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '5px', background: franja.bg, color: franja.color, fontWeight: '600', fontSize: '11px' }}>{franja.label}</span>
                      </td>
                      <td style={{ padding: '8px 16px' }}>
                        <button onClick={() => eliminarCompat(c.id)} style={{ padding: '3px 10px', border: '1px solid #e53935', borderRadius: '4px', background: 'white', color: '#e53935', cursor: 'pointer', fontSize: '11px' }}>✕ Eliminar</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

export default Corredores
