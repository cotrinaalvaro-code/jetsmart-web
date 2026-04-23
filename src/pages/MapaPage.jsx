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

const COLORES_CORREDOR = {
  'NORTE 1': '#e53935', 'NORTE 2': '#e53935', 'NORTE 3': '#e53935',
  'NORTE 4': '#e53935', 'NORTE 5': '#e53935',
  'NORESTE 1': '#ff7043', 'NORESTE 2': '#ff7043', 'NORESTE 3': '#ff7043',
  'SAN MIGUEL': '#8e24aa', 'SAN MIGUEL 1': '#8e24aa', 'SAN MIGUEL 2': '#8e24aa',
  'CALLAO 1': '#1e88e5', 'CALLAO 2': '#1e88e5', 'CALLAO 3': '#1e88e5',
  'CALLAO NORTE': '#1e88e5', 'CALLAO GAMBETA': '#1e88e5',
  'AV. ARICA': '#00897b', 'AV. ARICA 1': '#00897b', 'AV. ARICA 2': '#00897b',
  'CENTRO': '#6d4c41', 'CENTRO 1': '#6d4c41', 'CENTRO 2': '#6d4c41',
  'COSTA VERDE': '#43a047', 'COSTA VERDE 1': '#43a047', 'COSTA VERDE 2': '#43a047', 'COSTA VERDE 3': '#43a047',
  'VIA EVITAMIENTO': '#f9a825', 'VIA EVITAMIENTO 1': '#f9a825', 'VIA EVITAMIENTO 2': '#f9a825',
  'ESTE': '#00acc1', 'ESTE 1': '#00acc1', 'ESTE 2': '#00acc1', 'ESTE 3': '#00acc1', 'ESTE 4': '#00acc1',
  'PANAMERICANA SUR': '#5e35b1', 'PANAMERICANA SUR 1': '#5e35b1',
  'VENTANILLA': '#546e7a', 'SIN CORREDOR': '#bdbdbd',
}

const getColor = (corredor) => COLORES_CORREDOR[(corredor || '').toUpperCase()] || '#bdbdbd'

const crearIconoNumero = (numero, color, es) => L.divIcon({
  className: '',
  html: `<div style="
    width: 28px; height: 28px; border-radius: 50%;
    background: ${color}; border: 3px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 800; font-size: 13px;
    font-family: sans-serif;
  ">${numero}</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

const crearIconoPunto = (color) => L.divIcon({
  className: '',
  html: `<div style="
    width: 12px; height: 12px; border-radius: 50%;
    background: ${color}; border: 2px solid white;
    box-shadow: 0 1px 4px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
})

const iconoATO = L.divIcon({
  className: '',
  html: `<div style="font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5))">✈️</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

function MapaPage() {
  const [datos, setDatos] = useState([])
  const [grupoSel, setGrupoSel] = useState('TODOS')
  const [vistaGrupo, setVistaGrupo] = useState(null)
  const [editando, setEditando] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mapaData')
      if (raw) setDatos(JSON.parse(raw))
    } catch (e) {
      console.error('Error cargando datos del mapa', e)
    }
  }, [])

  const datosActivos = datos.filter(d => d.activo && d.col21_lat && d.col22_lng)

  // Lista de grupos únicos
  const gruposE = [...new Set(datosActivos.filter(d => d.col4_es === 'E' && d.col23_grupo).map(d => d.col23_grupo))].sort()
  const gruposS = [...new Set(datosActivos.filter(d => d.col4_es === 'S' && d.col23_grupo).map(d => d.col23_grupo))].sort()
  const todosGrupos = [...gruposE, ...gruposS]

  // Datos filtrados por grupo seleccionado
  const datosFiltrados = grupoSel === 'TODOS'
    ? datosActivos
    : datosActivos.filter(d => d.col23_grupo === grupoSel)

  // Agrupar por grupo para dibujar líneas
  const grupoMap = {}
  datosFiltrados.forEach(d => {
    if (!d.col23_grupo) return
    if (!grupoMap[d.col23_grupo]) grupoMap[d.col23_grupo] = []
    grupoMap[d.col23_grupo].push(d)
  })
  Object.values(grupoMap).forEach(miembros => {
    miembros.sort((a, b) => parseInt(a.col24_orden) - parseInt(b.col24_orden))
  })

  // Grupo seleccionado para edición
  const miembrosGrupo = vistaGrupo ? (grupoMap[vistaGrupo] || []) : []

  const moverOrden = (uid, direccion) => {
    const grupo = datos.find(d => d.uid === uid)?.col23_grupo
    if (!grupo) return
    const miembros = datos
      .filter(d => d.col23_grupo === grupo)
      .sort((a, b) => parseInt(a.col24_orden) - parseInt(b.col24_orden))
    const idx = miembros.findIndex(d => d.uid === uid)
    const nuevoIdx = idx + direccion
    if (nuevoIdx < 0 || nuevoIdx >= miembros.length) return

    const nuevosOrden = [...miembros]
    const temp = nuevosOrden[idx].col24_orden
    nuevosOrden[idx] = { ...nuevosOrden[idx], col24_orden: nuevosOrden[nuevoIdx].col24_orden }
    nuevosOrden[nuevoIdx] = { ...nuevosOrden[nuevoIdx], col24_orden: temp }

    setDatos(prev => prev.map(d => {
      const actualizado = nuevosOrden.find(n => n.uid === d.uid)
      return actualizado || d
    }))

    // Guardar en localStorage para que Carga.jsx lo refleje
    const nuevoDatos = datos.map(d => {
      const actualizado = nuevosOrden.find(n => n.uid === d.uid)
      return actualizado || d
    })
    localStorage.setItem('mapaData', JSON.stringify(nuevoDatos))
  }

  const center = datosFiltrados.length > 0
    ? [parseFloat(datosFiltrados[0].col21_lat), parseFloat(datosFiltrados[0].col22_lng)]
    : [ATO_LAT, ATO_LNG]

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'white', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        padding: '10px 20px', borderBottom: '1px solid #e0e0e0',
        display: 'flex', alignItems: 'center', gap: '16px', background: 'white'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', color: '#1a2235' }}>🗺️ Mapa de Traslados</h2>
          <p style={{ margin: 0, fontSize: '11px', color: '#888' }}>
            {datosActivos.length} tripulantes · {todosGrupos.length} grupos
          </p>
        </div>

        {/* Selector de grupo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#555', fontWeight: '600' }}>Grupo:</span>
          <select
            value={grupoSel}
            onChange={e => { setGrupoSel(e.target.value); setVistaGrupo(e.target.value === 'TODOS' ? null : e.target.value) }}
            style={{
              padding: '5px 10px', border: '1px solid #ddd', borderRadius: '6px',
              fontSize: '13px', color: '#333', background: 'white'
            }}
          >
            <option value="TODOS">— Todos los grupos —</option>
            <optgroup label="Entradas (E)">
              {gruposE.map(g => <option key={g} value={g}>{g}</option>)}
            </optgroup>
            <optgroup label="Salidas (S)">
              {gruposS.map(g => <option key={g} value={g}>{g}</option>)}
            </optgroup>
          </select>
        </div>

        {/* Leyenda colores */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
          {[
            ['Norte', '#e53935'], ['Noreste', '#ff7043'], ['San Miguel', '#8e24aa'],
            ['Callao', '#1e88e5'], ['Av. Arica', '#00897b'], ['Centro', '#6d4c41'],
            ['Costa Verde', '#43a047'], ['Via Evit.', '#f9a825'], ['Este', '#00acc1'],
            ['Pan. Sur', '#5e35b1'], ['Ventanilla', '#546e7a'],
          ].map(([label, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
              <span style={{ fontSize: '10px', color: '#555' }}>{label}</span>
            </div>
          ))}
        </div>

        <button onClick={() => window.close()} style={{
          padding: '6px 14px', background: 'white', border: '1px solid #e53935',
          borderRadius: '6px', color: '#e53935', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
        }}>
          ✕ Cerrar
        </button>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, display: 'flex' }}>

        {/* Panel lateral cuando hay grupo seleccionado */}
        {vistaGrupo && (
          <div style={{
            width: '280px', borderRight: '1px solid #e0e0e0', overflowY: 'auto',
            background: 'white', padding: '16px'
          }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: '#1a2235' }}>
              Grupo {vistaGrupo}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#888' }}>
              {miembrosGrupo.length} tripulante{miembrosGrupo.length !== 1 ? 's' : ''} · orden de recogida
            </p>

            {miembrosGrupo.map((d, idx) => {
              const color = getColor(d.col25_corredor)
              const nombre = d.col14_nombres?.split('-').slice(1).join('-') || d.col14_nombres
              return (
                <div key={d.uid} style={{
                  border: '1px solid #e0e0e0', borderRadius: '8px',
                  padding: '10px 12px', marginBottom: '8px', background: '#fafafa'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: color, color: 'white', fontWeight: '800',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', flexShrink: 0
                    }}>{d.col24_orden}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {nombre}
                      </div>
                      <div style={{ fontSize: '11px', color: '#888' }}>{d.col13_cat}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button onClick={() => moverOrden(d.uid, -1)} disabled={idx === 0}
                        style={{ padding: '2px 6px', fontSize: '11px', cursor: idx === 0 ? 'not-allowed' : 'pointer', border: '1px solid #ddd', borderRadius: '3px', background: 'white', opacity: idx === 0 ? 0.4 : 1 }}>▲</button>
                      <button onClick={() => moverOrden(d.uid, 1)} disabled={idx === miembrosGrupo.length - 1}
                        style={{ padding: '2px 6px', fontSize: '11px', cursor: idx === miembrosGrupo.length - 1 ? 'not-allowed' : 'pointer', border: '1px solid #ddd', borderRadius: '3px', background: 'white', opacity: idx === miembrosGrupo.length - 1 ? 0.4 : 1 }}>▼</button>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#888' }}>{d.col17_dist}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>H.ATO: <strong>{d.col10_hato}</strong></div>
                </div>
              )
            })}

            {/* Ruta */}
            <div style={{ marginTop: '16px', padding: '12px', background: '#f0f4f8', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '8px' }}>Ruta de recogida</div>
              {miembrosGrupo.map((d, idx) => (
                <div key={d.uid} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#888', minWidth: '16px' }}>{d.col24_orden}.</span>
                  <span style={{ fontSize: '11px', color: '#333' }}>{d.col17_dist}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', color: '#888', minWidth: '16px' }}>✈</span>
                <span style={{ fontSize: '11px', color: '#1565c0', fontWeight: '600' }}>Aeropuerto Jorge Chávez</span>
              </div>
            </div>
          </div>
        )}

        {/* Mapa */}
        <div style={{ flex: 1 }}>
          <MapContainer
            center={center}
            zoom={grupoSel === 'TODOS' ? 11 : 13}
            style={{ width: '100%', height: '100%' }}
            key={grupoSel}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />

            {/* Aeropuerto */}
            <Marker position={[ATO_LAT, ATO_LNG]} icon={iconoATO}>
              <Popup><strong>✈️ Aeropuerto Jorge Chávez</strong></Popup>
            </Marker>

            {/* Marcadores */}
            {datosFiltrados.map(d => {
              const lat = parseFloat(d.col21_lat)
              const lng = parseFloat(d.col22_lng)
              const color = getColor(d.col25_corredor)
              const nombre = d.col14_nombres?.split('-').slice(1).join('-') || d.col14_nombres
              const icono = vistaGrupo
                ? crearIconoNumero(d.col24_orden, color, d.col4_es)
                : crearIconoPunto(color)
              return (
                <Marker key={d.uid} position={[lat, lng]} icon={icono}>
                  <Popup>
                    <div style={{ fontSize: '12px', minWidth: '180px' }}>
                      <strong>{nombre}</strong><br />
                      <span style={{ color: d.col4_es === 'E' ? '#2e7d32' : '#1565c0', fontWeight: '600' }}>
                        {d.col4_es === 'E' ? '▶ Entrada' : '◀ Salida'}
                      </span> · {d.col9_vuelo}<br />
                      H.ATO: <strong>{d.col10_hato}</strong><br />
                      Grupo: <strong>{d.col23_grupo}</strong> · Orden: <strong>{d.col24_orden}</strong><br />
                      Corredor: <strong>{d.col25_corredor}</strong>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

            {/* Líneas por grupo */}
            {Object.entries(grupoMap).map(([grp, miembros]) => {
              const color = getColor(miembros[0]?.col25_corredor)
              if (vistaGrupo) {
                // Vista grupo: línea de ruta ordenada
                const pts = miembros.map(d => [parseFloat(d.col21_lat), parseFloat(d.col22_lng)])
                pts.push([ATO_LAT, ATO_LNG])
                return (
                  <Polyline key={grp} positions={pts} color={color} weight={3} opacity={0.8} />
                )
              } else {
                // Vista general: líneas punteadas al ATO
                return miembros.map(d => (
                  <Polyline
                    key={`${grp}-${d.uid}`}
                    positions={[[parseFloat(d.col21_lat), parseFloat(d.col22_lng)], [ATO_LAT, ATO_LNG]]}
                    color={color} weight={1.5} opacity={0.4} dashArray="4 4"
                  />
                ))
              }
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  )
}

export default MapaPage