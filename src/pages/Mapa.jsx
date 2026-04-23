import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix leaflet icons
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
  'CENTRO': '#6d4c41', 'CENTRO 1': '#6d4c41', 'CENTRO 2': '#6d4c41', 'CENTRO 3': '#6d4c41',
  'COSTA VERDE': '#43a047', 'COSTA VERDE 1': '#43a047', 'COSTA VERDE 2': '#43a047', 'COSTA VERDE 3': '#43a047',
  'VIA EVITAMIENTO': '#f9a825', 'VIA EVITAMIENTO 1': '#f9a825', 'VIA EVITAMIENTO 2': '#f9a825',
  'ESTE': '#00acc1', 'ESTE 1': '#00acc1', 'ESTE 2': '#00acc1', 'ESTE 3': '#00acc1',
  'ESTE 4': '#00acc1', 'ESTE 5': '#00acc1',
  'PANAMERICANA SUR': '#5e35b1', 'PANAMERICANA SUR 1': '#5e35b1',
  'VENTANILLA': '#546e7a',
  'SIN CORREDOR': '#bdbdbd',
}

const getColor = (corredor) => COLORES_CORREDOR[corredor?.toUpperCase()] || '#bdbdbd'

const crearIcono = (color, es) => L.divIcon({
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
  html: `<div style="font-size:24px; filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5))">✈️</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

function FitBounds({ datos }) {
  const map = useMap()
  useEffect(() => {
    const pts = datos.filter(d => d.col21_lat && d.col22_lng)
      .map(d => [parseFloat(d.col21_lat), parseFloat(d.col22_lng)])
    if (pts.length > 0) {
      pts.push([ATO_LAT, ATO_LNG])
      map.fitBounds(pts, { padding: [40, 40] })
    }
  }, [datos])
  return null
}

function Mapa({ datos, onClose }) {
  const datosConCoords = datos.filter(d => d.col21_lat && d.col22_lng && d.activo)

  // Agrupar por grupo para dibujar líneas
  const grupoMap = {}
  datosConCoords.forEach(d => {
    if (!d.col23_grupo) return
    if (!grupoMap[d.col23_grupo]) grupoMap[d.col23_grupo] = []
    grupoMap[d.col23_grupo].push(d)
  })

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'white', zIndex: 1000, display: 'flex', flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 24px', borderBottom: '1px solid #e0e0e0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'white'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#1a2235' }}>🗺️ Mapa de Traslados</h2>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#888' }}>
            {datosConCoords.length} tripulantes · {Object.keys(grupoMap).length} grupos
          </p>
        </div>

        {/* Leyenda */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '600px' }}>
          {Object.entries(COLORES_CORREDOR).slice(0, 8).map(([corredor, color]) => (
            <div key={corredor} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
              <span style={{ fontSize: '10px', color: '#555' }}>{corredor}</span>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{
          padding: '7px 16px', background: 'white', border: '1px solid #e53935',
          borderRadius: '6px', color: '#e53935', cursor: 'pointer',
          fontWeight: '600', fontSize: '13px'
        }}>
          ✕ Cerrar mapa
        </button>
      </div>

      {/* Mapa */}
      <div style={{ flex: 1 }}>
        <MapContainer
          center={[ATO_LAT, ATO_LNG]}
          zoom={12}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />

          <FitBounds datos={datosConCoords} />

          {/* Aeropuerto */}
          <Marker position={[ATO_LAT, ATO_LNG]} icon={iconoATO}>
            <Popup>
              <strong>✈️ Aeropuerto Jorge Chávez</strong><br />
              Lima, Perú
            </Popup>
          </Marker>

          {/* Marcadores de tripulantes */}
          {datosConCoords.map(d => {
            const lat = parseFloat(d.col21_lat)
            const lng = parseFloat(d.col22_lng)
            const color = getColor(d.col25_corredor)
            return (
              <Marker
                key={d.uid}
                position={[lat, lng]}
                icon={crearIcono(color, d.col4_es)}
              >
                <Popup>
                  <div style={{ fontSize: '12px', minWidth: '180px' }}>
                    <strong>{d.col14_nombres?.split('-')[1] || d.col14_nombres}</strong><br />
                    <span style={{ color: d.col4_es === 'E' ? '#2e7d32' : '#1565c0', fontWeight: '600' }}>
                      {d.col4_es === 'E' ? '▶ Entrada' : '◀ Salida'}
                    </span> · {d.col9_vuelo}<br />
                    H.ATO: <strong>{d.col10_hato}</strong><br />
                    Grupo: <strong>{d.col23_grupo || '—'}</strong> · Orden: <strong>{d.col24_orden || '—'}</strong><br />
                    Corredor: <strong>{d.col25_corredor}</strong><br />
                    <span style={{ color: '#888', fontSize: '11px' }}>{d.col17_dist}</span>
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {/* Líneas de grupo al ATO */}
          {Object.entries(grupoMap).map(([grp, miembros]) => {
            const color = getColor(miembros[0]?.col25_corredor)
            return miembros.map(d => {
              const lat = parseFloat(d.col21_lat)
              const lng = parseFloat(d.col22_lng)
              return (
                <Polyline
                  key={`${grp}-${d.uid}`}
                  positions={[[lat, lng], [ATO_LAT, ATO_LNG]]}
                  color={color}
                  weight={1.5}
                  opacity={0.4}
                  dashArray="4 4"
                />
              )
            })
          })}
        </MapContainer>
      </div>
    </div>
  )
}

export default Mapa