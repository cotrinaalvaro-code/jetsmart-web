import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const ATO_LAT = -12.0305
const ATO_LNG = -77.1154

const GRUPO_COLORES = [
  '#e53935','#8e24aa','#1e88e5','#43a047','#f9a825','#00acc1','#00897b','#6d4c41',
  '#e91e63','#7b1fa2','#1976d2','#388e3c','#f57f17','#0097a7','#00695c','#5d4037',
]

const horaAMin = (h) => {
  if (!h || !String(h).includes(':')) return 0
  const [hh, mm] = String(h).split(':').map(Number)
  return hh * 60 + mm
}

const getProv = (pax) => {
  if (pax >= 4) return 'Directo Van'
  if (pax === 3) return 'Directo XL'
  return 'Directo Auto'
}

const getGrupoColor = (grp, gruposList) => {
  const idx = gruposList.indexOf(grp)
  return GRUPO_COLORES[idx % GRUPO_COLORES.length] || '#888'
}

const crearIconoNumero = (numero, color, size = 24) => L.divIcon({
  className: '',
  html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:${size < 24 ? 10 : 12}px;font-family:sans-serif;">${numero}</div>`,
  iconSize: [size, size], iconAnchor: [size/2, size/2],
})

const iconoATO = L.divIcon({
  className: '',
  html: `<div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">✈️</div>`,
  iconSize: [32, 32], iconAnchor: [16, 16],
})

function MapaPage() {
  const [datos, setDatos] = useState([])
  const [filtroVuelo, setFiltroVuelo] = useState('TODOS')
  const [filtroES, setFiltroES] = useState('TODOS')
  const [filtroProv, setFiltroProv] = useState('TODOS')
  const [filtroHATO, setFiltroHATO] = useState('TODOS')
  const [moverDesde, setMoverDesde] = useState(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mapaData')
      if (raw) setDatos(JSON.parse(raw))
    } catch (e) {}
    const handleStorage = (e) => {
      if (e.key === 'mapaData') {
        try { setDatos(JSON.parse(e.newValue)) } catch {}
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const sincronizar = (nuevosDatos) => {
    setDatos(nuevosDatos)
    localStorage.setItem('mapaData', JSON.stringify(nuevosDatos))
    window.dispatchEvent(new StorageEvent('storage', { key: 'mapaData', newValue: JSON.stringify(nuevosDatos) }))
  }

  const datosActivos = datos.filter(d => d.activo && d.col21_lat && d.col22_lng)

  // Vuelos ordenados por H.ATO — filtrados por E/S y Prov activos
  const datosParaVuelos = datosActivos.filter(d => {
    if (filtroES !== 'TODOS' && d.col4_es !== filtroES) return false
    if (filtroProv !== 'TODOS' && d.col8_prov !== filtroProv) return false
    if (filtroHATO !== 'TODOS' && d.col10_hato !== filtroHATO) return false
    return true
  })
  const vuelosConHato = {}
  datosParaVuelos.forEach(d => {
    const v = (d.col9_vuelo || '').trim()
    if (!vuelosConHato[v]) vuelosConHato[v] = horaAMin(d.col10_hato)
    else vuelosConHato[v] = Math.min(vuelosConHato[v], horaAMin(d.col10_hato))
  })
  const vuelosUnicos = Object.entries(vuelosConHato).sort((a, b) => a[1] - b[1]).map(([v]) => v).filter(Boolean)

  // Filtros encadenados — cada opción depende de los otros filtros activos
  const datosParaHATO = datosActivos.filter(d => {
    if (filtroVuelo !== 'TODOS' && (d.col9_vuelo || '').trim() !== filtroVuelo) return false
    if (filtroES !== 'TODOS' && d.col4_es !== filtroES) return false
    if (filtroProv !== 'TODOS' && d.col8_prov !== filtroProv) return false
    return true
  })
  const hatosUnicos = [...new Set(datosParaHATO.map(d => d.col10_hato).filter(Boolean))]
    .sort((a, b) => horaAMin(a) - horaAMin(b))

  const datosParaProv = datosActivos.filter(d => {
    if (filtroVuelo !== 'TODOS' && (d.col9_vuelo || '').trim() !== filtroVuelo) return false
    if (filtroES !== 'TODOS' && d.col4_es !== filtroES) return false
    if (filtroHATO !== 'TODOS' && d.col10_hato !== filtroHATO) return false
    return true
  })
  const provsUnicas = [...new Set(datosParaProv.map(d => d.col8_prov))].filter(Boolean).sort()

  // Datos filtrados final
  const datosFiltrados = datosActivos.filter(d => {
    if (filtroVuelo !== 'TODOS' && (d.col9_vuelo || '').trim() !== filtroVuelo) return false
    if (filtroES !== 'TODOS' && d.col4_es !== filtroES) return false
    if (filtroProv !== 'TODOS' && d.col8_prov !== filtroProv) return false
    if (filtroHATO !== 'TODOS' && d.col10_hato !== filtroHATO) return false
    return true
  })

  // Grupos filtrados ordenados por H.ATO
  const hatoAnclaGrupo = {}
  datosFiltrados.forEach(d => {
    if (!hatoAnclaGrupo[d.col23_grupo] || horaAMin(d.col10_hato) < hatoAnclaGrupo[d.col23_grupo]) {
      hatoAnclaGrupo[d.col23_grupo] = horaAMin(d.col10_hato)
    }
  })
  const gruposFiltrados = [...new Set(datosFiltrados.filter(d => d.col23_grupo).map(d => d.col23_grupo))]
    .sort((a, b) => (hatoAnclaGrupo[a] || 0) - (hatoAnclaGrupo[b] || 0))

  // Agrupar por grupo
  const grupoMap = {}
  datosFiltrados.forEach(d => {
    if (!d.col23_grupo) return
    if (!grupoMap[d.col23_grupo]) grupoMap[d.col23_grupo] = []
    grupoMap[d.col23_grupo].push(d)
  })
  Object.values(grupoMap).forEach(m => m.sort((a, b) => parseInt(a.col24_orden) - parseInt(b.col24_orden)))

  const hayFiltroActivo = filtroVuelo !== 'TODOS' || filtroES !== 'TODOS' || filtroProv !== 'TODOS' || filtroHATO !== 'TODOS'

  // Recalcular grupo completo
  const recalcularGrupo = (nuevosDatos, grp, es) => {
    const miembros = nuevosDatos
      .filter(x => x.col23_grupo === grp && x.col4_es === es)
      .sort((a, b) => parseInt(a.col24_orden) - parseInt(b.col24_orden))
    const pax = miembros.length
    const prov = getProv(pax)
    return nuevosDatos.map(x => {
      const idx = miembros.findIndex(m => m.uid === x.uid)
      if (idx >= 0) return { ...x, col24_orden: idx + 1, col7_pax: pax, col8_prov: prov }
      return x
    })
  }

  const moverATripulante = (uid, grupoDestino) => {
    const d = datos.find(x => x.uid === uid)
    if (!d || d.col23_grupo === grupoDestino) { setMoverDesde(null); return }
    const grpOrigen = d.col23_grupo
    const es = d.col4_es
    const miembrosDestino = datos.filter(x => x.col23_grupo === grupoDestino && x.col4_es === es)
    let nuevosDatos = datos.map(x => {
      if (x.uid === uid) return { ...x, col23_grupo: grupoDestino, col24_orden: miembrosDestino.length + 1 }
      return x
    })
    nuevosDatos = recalcularGrupo(nuevosDatos, grupoDestino, es)
    nuevosDatos = recalcularGrupo(nuevosDatos, grpOrigen, es)
    sincronizar(nuevosDatos)
    setMoverDesde(null)
  }

  const moverANuevoGrupo = () => {
    const d = datos.find(x => x.uid === moverDesde.uid)
    if (!d) return
    const es = d.col4_es
    const prefix = es === 'E' ? 'E' : 'S'
    const nums = datos.filter(x => x.col23_grupo?.startsWith(prefix))
      .map(x => parseInt(x.col23_grupo?.replace(prefix, '') || '0'))
    const nuevoNum = Math.max(...nums, 0) + 1
    const nuevoGrupo = `${prefix}${String(nuevoNum).padStart(3, '0')}`
    const grpOrigen = d.col23_grupo
    let nuevosDatos = datos.map(x => {
      if (x.uid === moverDesde.uid) return { ...x, col23_grupo: nuevoGrupo, col24_orden: 1, col7_pax: 1, col8_prov: 'Directo Auto' }
      return x
    })
    nuevosDatos = recalcularGrupo(nuevosDatos, grpOrigen, es)
    sincronizar(nuevosDatos)
    setMoverDesde(null)
  }

  const moverOrden = (uid, direccion) => {
    const d = datos.find(x => x.uid === uid)
    if (!d) return
    const miembros = datos.filter(x => x.col23_grupo === d.col23_grupo && x.col4_es === d.col4_es)
      .sort((a, b) => parseInt(a.col24_orden) - parseInt(b.col24_orden))
    const idx = miembros.findIndex(x => x.uid === uid)
    const nuevoIdx = idx + direccion
    if (nuevoIdx < 0 || nuevoIdx >= miembros.length) return
    const copia = [...miembros]
    const temp = copia[idx].col24_orden
    copia[idx] = { ...copia[idx], col24_orden: copia[nuevoIdx].col24_orden }
    copia[nuevoIdx] = { ...copia[nuevoIdx], col24_orden: temp }
    sincronizar(datos.map(x => { const a = copia.find(m => m.uid === x.uid); return a ? { ...x, col24_orden: a.col24_orden } : x }))
  }

  const eliminarDelGrupo = (uid) => {
    if (!confirm('¿Eliminar este tripulante del grupo?')) return
    const d = datos.find(x => x.uid === uid)
    if (!d) return
    const grp = d.col23_grupo
    const es = d.col4_es
    let nuevosDatos = datos.map(x => x.uid === uid ? { ...x, col23_grupo: '', col24_orden: '', col7_pax: 1, col8_prov: 'Directo Auto', activo: false } : x)
    nuevosDatos = recalcularGrupo(nuevosDatos, grp, es)
    sincronizar(nuevosDatos)
  }

  const resetFiltros = () => {
    setFiltroVuelo('TODOS')
    setFiltroES('TODOS')
    setFiltroProv('TODOS')
    setFiltroHATO('TODOS')
    setMoverDesde(null)
  }

  const selectStyle = { padding: '4px 8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px', color: '#333', background: 'white', cursor: 'pointer' }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'white', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '7px 16px', borderBottom: '1px solid #e0e0e0', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ minWidth: '110px' }}>
            <h2 style={{ margin: 0, fontSize: '13px', color: '#1a2235' }}>🗺️ Mapa de Traslados</h2>
            <p style={{ margin: 0, fontSize: '10px', color: '#888' }}>{datosActivos.length} trip. · {gruposFiltrados.length || new Set(datosActivos.filter(d=>d.col23_grupo).map(d=>d.col23_grupo)).size} grupos</p>
          </div>

          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#555', fontWeight: '600' }}>Vuelo:</span>
            <select style={selectStyle} value={filtroVuelo} onChange={e => {
              const vuelo = e.target.value
              setFiltroVuelo(vuelo)
              setMoverDesde(null)
              if (vuelo !== 'TODOS') {
                const hato = datosActivos.find(d => (d.col9_vuelo || '').trim() === vuelo && (filtroES === 'TODOS' || d.col4_es === filtroES))?.col10_hato
                if (hato) setFiltroHATO(hato)
                else setFiltroHATO('TODOS')
              } else {
                setFiltroHATO('TODOS')
              }
            }}>
              <option value="TODOS">Todos</option>
              {vuelosUnicos.map(v => <option key={v} value={v}>{v}</option>)}
            </select>

            <span style={{ fontSize: '10px', color: '#555', fontWeight: '600' }}>E/S:</span>
            <select style={selectStyle} value={filtroES} onChange={e => {
              setFiltroES(e.target.value)
              setFiltroVuelo('TODOS')
              setFiltroHATO('TODOS')
              setFiltroProv('TODOS')
              setMoverDesde(null)
            }}>
              <option value="TODOS">Todos</option>
              <option value="E">Entrada</option>
              <option value="S">Salida</option>
            </select>

            <span style={{ fontSize: '10px', color: '#555', fontWeight: '600' }}>H.ATO:</span>
            <select style={selectStyle} value={filtroHATO} onChange={e => {
              const hato = e.target.value
              setFiltroHATO(hato)
              setMoverDesde(null)
              if (hato !== 'TODOS' && filtroVuelo === 'TODOS') {
                const vuelo = datosActivos.find(d => d.col10_hato === hato && (filtroES === 'TODOS' || d.col4_es === filtroES))?.col9_vuelo?.trim()
                if (vuelo) setFiltroVuelo(vuelo)
              }
            }}>
              <option value="TODOS">Todos</option>
              {hatosUnicos.map(h => <option key={h} value={h}>{h}</option>)}
            </select>

            <span style={{ fontSize: '10px', color: '#555', fontWeight: '600' }}>Prov.:</span>
            <select style={selectStyle} value={filtroProv} onChange={e => { setFiltroProv(e.target.value); setMoverDesde(null) }}>
              <option value="TODOS">Todos</option>
              {provsUnicas.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            {hayFiltroActivo && (
              <button onClick={resetFiltros} style={{ padding: '3px 8px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', color: '#555' }}>↺ Limpiar</button>
            )}
          </div>

          <div style={{ flex: 1 }} />

          <button onClick={() => window.close()} style={{ padding: '5px 12px', background: 'white', border: '1px solid #e53935', borderRadius: '6px', color: '#e53935', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>✕ Cerrar</button>
        </div>
      </div>

      {/* Aviso mover */}
      {moverDesde && (
        <div style={{ padding: '6px 16px', background: '#fff8e1', borderBottom: '1px solid #ffd54f', fontSize: '12px', color: '#f57f17', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>⚡ Moviendo: <strong>{moverDesde.nombre}</strong> — Selecciona grupo destino en el panel</span>
          <button onClick={moverANuevoGrupo} style={{ padding: '3px 10px', border: '1px solid #43a047', borderRadius: '4px', background: '#e8f5e9', cursor: 'pointer', fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>
            ➕ Nuevo grupo
          </button>
          <button onClick={() => setMoverDesde(null)} style={{ padding: '3px 10px', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '11px' }}>Cancelar</button>
        </div>
      )}

      {/* Contenido */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Panel lateral */}
        <div style={{ width: '300px', borderRight: '1px solid #e0e0e0', overflowY: 'auto', background: 'white', flexShrink: 0 }}>
          {gruposFiltrados.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
              Selecciona un filtro para ver grupos
            </div>
          ) : (
            gruposFiltrados.map(grp => {
              const miembros = grupoMap[grp] || []
              const color = getGrupoColor(grp, gruposFiltrados)
              const esMoverDestino = moverDesde && moverDesde.grp !== grp
              return (
                <div key={grp} style={{ borderBottom: '2px solid #e0e0e0', background: esMoverDestino ? '#f0f7ff' : 'white' }}>
                  <div style={{
                    padding: '7px 12px', display: 'flex', alignItems: 'center', gap: '8px',
                    background: color + '18', borderBottom: '1px solid ' + color + '33',
                    cursor: esMoverDestino ? 'pointer' : 'default'
                  }} onClick={() => esMoverDestino && moverATripulante(moverDesde.uid, grp)}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#1a2235' }}>{grp}</span>
                    <span style={{ fontSize: '11px', color: '#888' }}>{miembros[0]?.col8_prov}</span>
                    <span style={{ fontSize: '11px', color: '#888', marginLeft: 'auto' }}>{miembros.length} pax</span>
                    {esMoverDestino && <span style={{ fontSize: '11px', color: '#1565c0', fontWeight: '700' }}>← aquí</span>}
                  </div>

                  {miembros.map((d, idx) => {
                    const nombre = d.col14_nombres?.split('-').slice(1).join('-') || d.col14_nombres
                    const esMover = moverDesde?.uid === d.uid
                    return (
                      <div key={d.uid} style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '6px', background: esMover ? '#fff8e1' : 'white', borderBottom: '1px solid #f5f5f5' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: color, color: 'white', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0 }}>{d.col24_orden}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '11px', fontWeight: '600', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombre}</div>
                          <div style={{ fontSize: '10px', color: '#888' }}>{d.col13_cat} · {d.col17_dist}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                          <button onClick={() => moverOrden(d.uid, -1)} disabled={idx === 0}
                            style={{ padding: '1px 4px', fontSize: '10px', border: '1px solid #ddd', borderRadius: '3px', background: 'white', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                          <button onClick={() => moverOrden(d.uid, 1)} disabled={idx === miembros.length - 1}
                            style={{ padding: '1px 4px', fontSize: '10px', border: '1px solid #ddd', borderRadius: '3px', background: 'white', cursor: idx === miembros.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === miembros.length - 1 ? 0.3 : 1 }}>▼</button>
                          <button onClick={() => moverDesde?.uid === d.uid ? setMoverDesde(null) : setMoverDesde({ uid: d.uid, grp, nombre })}
                            style={{ padding: '1px 4px', fontSize: '10px', border: `1px solid ${esMover ? '#f57f17' : '#1565c0'}`, borderRadius: '3px', background: esMover ? '#fff8e1' : 'white', cursor: 'pointer', color: esMover ? '#f57f17' : '#1565c0' }}>↔</button>
                          <button onClick={() => eliminarDelGrupo(d.uid)}
                            style={{ padding: '1px 4px', fontSize: '10px', border: '1px solid #e53935', borderRadius: '3px', background: 'white', cursor: 'pointer', color: '#e53935' }}>✕</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        {/* Mapa */}
        <div style={{ flex: 1 }}>
          <MapContainer center={[ATO_LAT, ATO_LNG]} zoom={hayFiltroActivo ? 12 : 11}
            style={{ width: '100%', height: '100%' }} key={filtroVuelo + filtroES + filtroProv + filtroHATO}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
              keepBuffer={4}
            />
            <Marker position={[ATO_LAT, ATO_LNG]} icon={iconoATO}>
              <Popup><strong>✈️ Aeropuerto Jorge Chávez</strong></Popup>
            </Marker>

            {datosFiltrados.map(d => {
              const lat = parseFloat(d.col21_lat)
              const lng = parseFloat(d.col22_lng)
              if (!lat || !lng) return null
              const color = getGrupoColor(d.col23_grupo, gruposFiltrados)
              const nombre = d.col14_nombres?.split('-').slice(1).join('-') || d.col14_nombres
              return (
                <Marker key={d.uid} position={[lat, lng]} icon={crearIconoNumero(d.col24_orden, color, hayFiltroActivo ? 24 : 16)}>
                  <Popup>
                    <div style={{ fontSize: '12px', minWidth: '180px' }}>
                      <strong>{nombre}</strong><br />
                      <span style={{ color: d.col4_es === 'E' ? '#2e7d32' : '#1565c0', fontWeight: '600' }}>
                        {d.col4_es === 'E' ? '▶ Entrada' : '◀ Salida'}
                      </span> · {d.col9_vuelo}<br />
                      H.ATO: <strong>{d.col10_hato}</strong><br />
                      Grupo: <strong>{d.col23_grupo}</strong> · Orden: <strong>{d.col24_orden}</strong><br />
                      Prov: <strong>{d.col8_prov}</strong><br />
                      Corredor: <strong>{d.col25_corredor}</strong>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

            {Object.entries(grupoMap).map(([grp, miembros]) => {
              const color = getGrupoColor(grp, gruposFiltrados)
              const esS = miembros[0]?.col4_es === 'S'
              // Para S: ATO → orden 1 (más cercano) → orden 2 → orden N (más lejano)
              // Para E: orden 1 (más lejano) → orden 2 → orden N → ATO
              const puntosOrdenados = miembros
                .filter(d => d.col21_lat && d.col22_lng)
                .sort((a, b) => parseInt(a.col24_orden) - parseInt(b.col24_orden))
                .map(d => [parseFloat(d.col21_lat), parseFloat(d.col22_lng)])
              const pts = esS
                ? [[ATO_LAT, ATO_LNG], ...puntosOrdenados]
                : [...puntosOrdenados, [ATO_LAT, ATO_LNG]]
              return <Polyline key={grp} positions={pts} color={color}
                weight={hayFiltroActivo ? 2.5 : 1.5} opacity={hayFiltroActivo ? 0.7 : 0.3}
                dashArray={hayFiltroActivo ? undefined : '4 4'} />
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  )
}

export default MapaPage
