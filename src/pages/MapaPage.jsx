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

const ZONAS = {
  'NORTE': ['NORTE 1','NORTE 2','NORTE 3','NORTE 4','NORTE 5','NORESTE 1','NORESTE 2','NORESTE 3','CALLAO 1','CALLAO 2','CALLAO 3','CALLAO NORTE','CALLAO GAMBETA','VENTANILLA'],
  'CENTRO NORTE': ['CENTRO','CENTRO 1','CENTRO 2','CENTRO 3','AV. ARICA','AV. ARICA 1','AV. ARICA 2','SAN MIGUEL','SAN MIGUEL 1','SAN MIGUEL 2'],
  'CENTRO SUR': ['VIA EVITAMIENTO','VIA EVITAMIENTO 1','VIA EVITAMIENTO 2'],
  'COSTA': ['COSTA VERDE','COSTA VERDE 1','COSTA VERDE 2','COSTA VERDE 3'],
  'SUR': ['PANAMERICANA SUR','PANAMERICANA SUR 1'],
  'ESTE': ['ESTE','ESTE 1','ESTE 2','ESTE 3','ESTE 4','ESTE 5'],
}

const ZONA_COLORES = {
  'NORTE': '#e53935', 'CENTRO NORTE': '#8e24aa', 'CENTRO SUR': '#f9a825',
  'COSTA': '#43a047', 'SUR': '#00897b', 'ESTE': '#00acc1',
}

const COLORES_CORREDOR = {
  'NORTE 1': '#e53935', 'NORTE 2': '#e53935', 'NORTE 3': '#e53935', 'NORTE 4': '#e53935', 'NORTE 5': '#e53935',
  'NORESTE 1': '#e53935', 'NORESTE 2': '#e53935', 'NORESTE 3': '#e53935',
  'CALLAO 1': '#e53935', 'CALLAO 2': '#e53935', 'CALLAO 3': '#e53935', 'CALLAO NORTE': '#e53935', 'CALLAO GAMBETA': '#e53935', 'VENTANILLA': '#e53935',
  'SAN MIGUEL': '#8e24aa', 'SAN MIGUEL 1': '#8e24aa', 'SAN MIGUEL 2': '#8e24aa',
  'AV. ARICA': '#8e24aa', 'AV. ARICA 1': '#8e24aa', 'AV. ARICA 2': '#8e24aa',
  'CENTRO': '#8e24aa', 'CENTRO 1': '#8e24aa', 'CENTRO 2': '#8e24aa', 'CENTRO 3': '#8e24aa',
  'VIA EVITAMIENTO': '#f9a825', 'VIA EVITAMIENTO 1': '#f9a825', 'VIA EVITAMIENTO 2': '#f9a825',
  'COSTA VERDE': '#43a047', 'COSTA VERDE 1': '#43a047', 'COSTA VERDE 2': '#43a047', 'COSTA VERDE 3': '#43a047',
  'PANAMERICANA SUR': '#00897b', 'PANAMERICANA SUR 1': '#00897b',
  'ESTE': '#00acc1', 'ESTE 1': '#00acc1', 'ESTE 2': '#00acc1', 'ESTE 3': '#00acc1', 'ESTE 4': '#00acc1', 'ESTE 5': '#00acc1',
  'SIN CORREDOR': '#bdbdbd',
}

const GRUPO_COLORES = [
  '#e53935','#8e24aa','#1e88e5','#43a047','#f9a825','#00acc1','#00897b','#6d4c41',
  '#e91e63','#7b1fa2','#1976d2','#388e3c','#f57f17','#0097a7','#00695c','#5d4037',
]

const getGrupoColor = (grp, gruposList) => {
  const idx = gruposList.indexOf(grp)
  return GRUPO_COLORES[idx % GRUPO_COLORES.length] || '#888'
}

const getZona = (corredor) => {
  const c = (corredor || '').toUpperCase()
  for (const [zona, corredores] of Object.entries(ZONAS)) {
    if (corredores.includes(c)) return zona
  }
  return null
}

const horaAMin = (h) => {
  if (!h || !String(h).includes(':')) return 0
  const [hh, mm] = String(h).split(':').map(Number)
  return hh * 60 + mm
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

  // Vuelos ordenados por H.ATO
  const vuelosConHato = {}
  datosActivos.forEach(d => {
    const v = (d.col9_vuelo || '').trim()
    if (!vuelosConHato[v]) vuelosConHato[v] = horaAMin(d.col10_hato)
    else vuelosConHato[v] = Math.min(vuelosConHato[v], horaAMin(d.col10_hato))
  })
  const vuelosUnicos = Object.entries(vuelosConHato).sort((a, b) => a[1] - b[1]).map(([v]) => v).filter(Boolean)

  // Filtros
  const datosFiltrados = datosActivos.filter(d => {
    if (filtroVuelo !== 'TODOS' && (d.col9_vuelo || '').trim() !== filtroVuelo) return false
    if (filtroES !== 'TODOS' && d.col4_es !== filtroES) return false
    if (filtroProv !== 'TODOS' && d.col8_prov !== filtroProv) return false
    return true
  })

  const datosParaProv = datosActivos.filter(d => {
    if (filtroVuelo !== 'TODOS' && (d.col9_vuelo || '').trim() !== filtroVuelo) return false
    if (filtroES !== 'TODOS' && d.col4_es !== filtroES) return false
    return true
  })
  const provsUnicas = [...new Set(datosParaProv.map(d => d.col8_prov))].filter(Boolean).sort()

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

  // Estadísticas por zona
  const totalGrupos = new Set(datosActivos.filter(d => d.col23_grupo).map(d => d.col23_grupo)).size
  const statsZona = {}
  Object.keys(ZONAS).forEach(z => { statsZona[z] = { grupos: new Set(), pax: 0 } })
  datosActivos.forEach(d => {
    const zona = getZona(d.col25_corredor)
    if (zona && d.col23_grupo) {
      statsZona[zona].grupos.add(d.col23_grupo)
      statsZona[zona].pax += parseInt(d.col7_pax) || 1
    }
  })

  const hayFiltroActivo = filtroVuelo !== 'TODOS' || filtroES !== 'TODOS' || filtroProv !== 'TODOS'

  // Mover tripulante a grupo existente
  const moverATripulante = (uid, grupoDestino) => {
    const d = datos.find(x => x.uid === uid)
    if (!d || d.col23_grupo === grupoDestino) { setMoverDesde(null); return }
    const grpOrigen = d.col23_grupo
    const es = d.col4_es
    const miembrosDestino = datos.filter(x => x.col23_grupo === grupoDestino && x.col4_es === es)
    const nuevoPaxDestino = miembrosDestino.length + 1
    let nuevosDatos = datos.map(x => {
      if (x.uid === uid) return { ...x, col23_grupo: grupoDestino, col24_orden: nuevoPaxDestino, col7_pax: nuevoPaxDestino, col8_prov: nuevoPaxDestino >= 3 ? 'Directo XL' : 'Directo Auto' }
      if (x.col23_grupo === grupoDestino && x.col4_es === es) return { ...x, col7_pax: nuevoPaxDestino, col8_prov: nuevoPaxDestino >= 3 ? 'Directo XL' : 'Directo Auto' }
      return x
    })
    const restantesOrigen = nuevosDatos.filter(x => x.col23_grupo === grpOrigen && x.col4_es === es)
      .sort((a, b) => parseInt(a.col24_orden) - parseInt(b.col24_orden))
    nuevosDatos = nuevosDatos.map(x => {
      const rIdx = restantesOrigen.findIndex(r => r.uid === x.uid)
      if (rIdx >= 0) return { ...x, col24_orden: rIdx + 1, col7_pax: restantesOrigen.length, col8_prov: restantesOrigen.length >= 3 ? 'Directo XL' : 'Directo Auto' }
      return x
    })
    sincronizar(nuevosDatos)
    setMoverDesde(null)
  }

  // Mover tripulante a NUEVO grupo
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
    const restantesOrigen = nuevosDatos.filter(x => x.col23_grupo === grpOrigen && x.col4_es === es)
      .sort((a, b) => parseInt(a.col24_orden) - parseInt(b.col24_orden))
    nuevosDatos = nuevosDatos.map(x => {
      const rIdx = restantesOrigen.findIndex(r => r.uid === x.uid)
      if (rIdx >= 0) return { ...x, col24_orden: rIdx + 1, col7_pax: restantesOrigen.length, col8_prov: restantesOrigen.length >= 3 ? 'Directo XL' : 'Directo Auto' }
      return x
    })
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
    const restantes = nuevosDatos.filter(x => x.col23_grupo === grp && x.col4_es === es)
      .sort((a, b) => parseInt(a.col24_orden) - parseInt(b.col24_orden))
    nuevosDatos = nuevosDatos.map(x => {
      const rIdx = restantes.findIndex(r => r.uid === x.uid)
      if (rIdx >= 0) return { ...x, col24_orden: rIdx + 1, col7_pax: restantes.length, col8_prov: restantes.length >= 3 ? 'Directo XL' : 'Directo Auto' }
      return x
    })
    sincronizar(nuevosDatos)
  }

  const resetFiltros = () => { setFiltroVuelo('TODOS'); setFiltroES('TODOS'); setFiltroProv('TODOS'); setMoverDesde(null) }

  const selectStyle = { padding: '4px 8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px', color: '#333', background: 'white', cursor: 'pointer' }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'white', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '7px 16px', borderBottom: '1px solid #e0e0e0', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

          <div style={{ minWidth: '110px' }}>
            <h2 style={{ margin: 0, fontSize: '13px', color: '#1a2235' }}>🗺️ Mapa de Traslados</h2>
            <p style={{ margin: 0, fontSize: '10px', color: '#888' }}>{datosActivos.length} trip. · {totalGrupos} grupos</p>
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#555', fontWeight: '600' }}>Vuelo:</span>
            <select style={selectStyle} value={filtroVuelo} onChange={e => { setFiltroVuelo(e.target.value); setMoverDesde(null) }}>
              <option value="TODOS">Todos</option>
              {vuelosUnicos.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <span style={{ fontSize: '11px', color: '#555', fontWeight: '600' }}>E/S:</span>
            <select style={selectStyle} value={filtroES} onChange={e => { setFiltroES(e.target.value); setMoverDesde(null) }}>
              <option value="TODOS">Todos</option>
              <option value="E">Entrada</option>
              <option value="S">Salida</option>
            </select>
            <span style={{ fontSize: '11px', color: '#555', fontWeight: '600' }}>Prov.:</span>
            <select style={selectStyle} value={filtroProv} onChange={e => { setFiltroProv(e.target.value); setMoverDesde(null) }}>
              <option value="TODOS">Todos</option>
              {provsUnicas.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {hayFiltroActivo && (
              <button onClick={resetFiltros} style={{ padding: '3px 8px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', color: '#555' }}>↺</button>
            )}
          </div>

          {/* Zonas compactas en fila */}
          <div style={{ display: 'flex', gap: '4px', flex: 1, justifyContent: 'center', alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto' }}>
            {Object.entries(statsZona).sort((a, b) => b[1].grupos.size - a[1].grupos.size).map(([zona, stat]) => {
              const pct = totalGrupos > 0 ? Math.round(stat.grupos.size / totalGrupos * 100) : 0
              const ocup = stat.grupos.size > 0 ? (stat.pax / stat.grupos.size).toFixed(1) : '0'
              return (
                <div key={zona} style={{
                  padding: '3px 8px', borderRadius: '5px', textAlign: 'center',
                  background: ZONA_COLORES[zona] + '15', border: `1px solid ${ZONA_COLORES[zona]}55`,
                  whiteSpace: 'nowrap'
                }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: ZONA_COLORES[zona] }}>{stat.grupos.size}</span>
                  <span style={{ fontSize: '9px', fontWeight: '700', color: '#555', marginLeft: '4px' }}>{zona}</span>
                  <span style={{ fontSize: '9px', color: '#999', marginLeft: '3px' }}>{pct}% 🚗{ocup}</span>
                </div>
              )
            })}
          </div>

          <button onClick={() => window.close()} style={{ padding: '5px 12px', background: 'white', border: '1px solid #e53935', borderRadius: '6px', color: '#e53935', cursor: 'pointer', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>✕ Cerrar</button>
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
              Selecciona un filtro para ver grupos en el panel
            </div>
          ) : (
            gruposFiltrados.map(grp => {
              const miembros = grupoMap[grp] || []
              const color = getGrupoColor(grp, gruposFiltrados)
              const esMoverDestino = moverDesde && moverDesde.grp !== grp
              return (
                <div key={grp} style={{ borderBottom: '2px solid #e0e0e0', background: esMoverDestino ? '#f0f7ff' : 'white' }}>
                  {/* Header grupo */}
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

                  {/* Tripulantes */}
                  {miembros.map((d, idx) => {
                    const nombre = d.col14_nombres?.split('-').slice(1).join('-') || d.col14_nombres
                    const esMover = moverDesde?.uid === d.uid
                    return (
                      <div key={d.uid} style={{
                        padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '6px',
                        background: esMover ? '#fff8e1' : 'white', borderBottom: '1px solid #f5f5f5'
                      }}>
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '50%', background: color,
                          color: 'white', fontWeight: '800', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '10px', flexShrink: 0
                        }}>{d.col24_orden}</div>
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
                            title="Mover a otro grupo"
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
            style={{ width: '100%', height: '100%' }} key={filtroVuelo + filtroES + filtroProv}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
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
              const pts = miembros.filter(d => d.col21_lat && d.col22_lng)
                .map(d => [parseFloat(d.col21_lat), parseFloat(d.col22_lng)])
              pts.push([ATO_LAT, ATO_LNG])
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
