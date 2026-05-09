import { useState, useEffect } from 'react'
import * as XLSXStyle from 'xlsx-js-style'

const NIVEL_COLOR = {
  'N0A':    { bg: '#e8f5e9', color: '#2e7d32', label: 'Hist. exacto' },
  'N0B':    { bg: '#f1f8e9', color: '#558b2f', label: 'Hist. agrupado' },
  'TomTom': { bg: '#fff3e0', color: '#e65100', label: 'TomTom' },
  'N25':    { bg: '#fce4ec', color: '#c62828', label: 'Solo GPS' },
}

const getNivelLabel = (n) => NIVEL_COLOR[n]?.label || n || '—'
const getNivelBg    = (n) => NIVEL_COLOR[n]?.bg    || '#fff'
const getNivelColor = (n) => NIVEL_COLOR[n]?.color || '#333'

const horaAMin = (h) => {
  if (!h || !String(h).includes(':')) return 0
  const [hh, mm] = String(h).split(':').map(Number)
  return hh * 60 + mm
}

function Traslados() {
  const [filas, setFilas] = useState([])
  const [filtroES, setFiltroES] = useState('TODOS')
  const [filtroVuelo, setFiltroVuelo] = useState('TODOS')
  const [filtroNivel, setFiltroNivel] = useState('TODOS')

  const buildResumen = (datos) => {
    const servicios = {}
    datos.forEach(d => {
      const s = d.col5_serv
      if (!s) return
      if (!servicios[s]) servicios[s] = []
      servicios[s].push(d)
    })

    const rows = Object.entries(servicios).map(([serv, miembros]) => {
      miembros.sort((a, b) => parseInt(a.col24_orden) - parseInt(b.col24_orden))
      const primera = miembros[0]
      const es      = primera.col4_es
      const vuelo   = primera.col9_vuelo
      const hato    = primera.col10_hato
      const pax     = primera.col7_pax
      const hInicio = primera.col6_hreal
      const hUltima = es === 'E' ? hato : (miembros[miembros.length - 1]?.col11_hrec || hato)
      const nivel   = primera._etaNivel || 'N25'
      const prov    = primera.col8_prov
      const calcEta = (h1, h2) => {
  let diff = horaAMin(h2) - horaAMin(h1)
  if (diff < 0) diff += 1440
  return diff
}
const etaMin = es === 'E'
  ? calcEta(hInicio, hato)
  : calcEta(hato, hUltima)
      const recorrido = miembros.map(m => m.col17_dist).filter(Boolean).join(' - ')
      const tripulantes = miembros.map(m => {
        const nombre = m.col14_nombres || ''
        const guion = nombre.indexOf('-')
        return guion >= 0 ? nombre.slice(guion + 1).trim() : nombre
      }).join(' / ')
      let alerta = `OK - ${etaMin} min`
      if (etaMin > 90) alerta = `⚠️ ${etaMin} min`
      else if (nivel === 'N25') alerta = `GPS - ${etaMin} min`
      return { serv: Number(serv), vuelo, es, hato, pax, etaMin, hInicio, hUltima, nivel, recorrido, prov, tripulantes, alerta }
    })

    rows.sort((a, b) => a.serv - b.serv)
    setFilas(rows)
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cargaData')
      if (raw) buildResumen(JSON.parse(raw))
    } catch {}
    const handleStorage = (e) => {
      if (e.key === 'cargaData') {
        try { buildResumen(JSON.parse(e.newValue || '[]')) } catch {}
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const vuelosUnicos = [...new Set(filas.map(f => f.vuelo).filter(Boolean))].sort()
  const datosFiltrados = filas.filter(f => {
    if (filtroES !== 'TODOS' && f.es !== filtroES) return false
    if (filtroVuelo !== 'TODOS' && f.vuelo !== filtroVuelo) return false
    if (filtroNivel !== 'TODOS' && f.nivel !== filtroNivel) return false
    return true
  })

  const totalE = filas.filter(f => f.es === 'E').length
  const totalS = filas.filter(f => f.es === 'S').length
  const cntN0A = filas.filter(f => f.nivel === 'N0A').length
  const cntN0B = filas.filter(f => f.nivel === 'N0B').length
  const cntTT  = filas.filter(f => f.nivel === 'TomTom').length
  const cntN25 = filas.filter(f => f.nivel === 'N25').length
  const precisionPct = filas.length > 0 ? Math.round(((cntN0A + cntN0B) / filas.length) * 100) : 0

  const exportarExcel = () => {
    const headers = ['SERV','VUELO','E/S','H.ATO','PAX','ETA (min)','H.INICIO','H.ULTIMA','NIVEL','RECORRIDO','PROVEEDOR','TRIPULANTES','ALERTA']
    const rows = datosFiltrados.map(f => [f.serv, f.vuelo, f.es, f.hato, f.pax, f.etaMin, f.hInicio, f.hUltima, getNivelLabel(f.nivel), f.recorrido, f.prov, f.tripulantes, f.alerta])
    const ws = XLSXStyle.utils.aoa_to_sheet([headers, ...rows])
    headers.forEach((h, i) => {
      const cell = XLSXStyle.utils.encode_cell({ r: 0, c: i })
      if (ws[cell]) ws[cell].s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1A2235' } }, alignment: { horizontal: 'center' } }
    })
    const nivelRGB = { N0A: 'C8E6C9', N0B: 'DCEDC8', TomTom: 'FFE0B2', N25: 'FFCDD2' }
    datosFiltrados.forEach((f, rowIdx) => {
      const rgb = nivelRGB[f.nivel] || 'FFFFFF'
      headers.forEach((h, colIdx) => {
        const cell = XLSXStyle.utils.encode_cell({ r: rowIdx + 1, c: colIdx })
        if (ws[cell]) ws[cell].s = { fill: { fgColor: { rgb } } }
      })
    })
    ws['!cols'] = [{wch:6},{wch:8},{wch:5},{wch:7},{wch:5},{wch:9},{wch:8},{wch:8},{wch:14},{wch:45},{wch:14},{wch:50},{wch:14}]
    const wb = XLSXStyle.utils.book_new()
    XLSXStyle.utils.book_append_sheet(wb, ws, 'ETA_RESUMEN')
    XLSXStyle.writeFile(wb, `ETA_RESUMEN_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  const selectStyle = { padding: '4px 10px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '12px', background: 'white', color: '#333', cursor: 'pointer' }
  const thStyle = { padding: '8px 10px', color: '#555', textAlign: 'left', fontSize: '11px', whiteSpace: 'nowrap', borderBottom: '2px solid #e0e0e0', background: 'white', position: 'sticky', top: 0, zIndex: 1, fontWeight: '600' }
  const tdStyle = { padding: '6px 10px', fontSize: '11px', borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap' }

  return (
    <div style={{ background: 'white', minHeight: '100vh' }}>
      <div style={{ padding: '12px 24px', borderBottom: '1px solid #e0e0e0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ color: '#1a2235', margin: 0, fontSize: '18px' }}>🚐 Traslados — ETA Resumen</h2>
            <p style={{ color: '#888', margin: '2px 0 0', fontSize: '12px' }}>
              {filas.length > 0 ? `${filas.length} servicios calculados` : 'Ve a Carga → Ejecutar Agrupamiento → Calcular ETA'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: '#555', fontWeight: 600 }}>E/S:</span>
            <select style={selectStyle} value={filtroES} onChange={e => setFiltroES(e.target.value)}>
              <option value="TODOS">Todos</option>
              <option value="E">Entrada</option>
              <option value="S">Salida</option>
            </select>
            <span style={{ fontSize: '11px', color: '#555', fontWeight: 600 }}>Vuelo:</span>
            <select style={selectStyle} value={filtroVuelo} onChange={e => setFiltroVuelo(e.target.value)}>
              <option value="TODOS">Todos</option>
              {vuelosUnicos.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <span style={{ fontSize: '11px', color: '#555', fontWeight: 600 }}>Nivel:</span>
            <select style={selectStyle} value={filtroNivel} onChange={e => setFiltroNivel(e.target.value)}>
              <option value="TODOS">Todos</option>
              <option value="N0A">Hist. exacto</option>
              <option value="N0B">Hist. agrupado</option>
              <option value="TomTom">TomTom</option>
              <option value="N25">Solo GPS</option>
            </select>
            {filas.length > 0 && (
              <button onClick={exportarExcel} style={{ padding: '7px 16px', background: 'white', border: '1px solid #2e7d32', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', color: '#2e7d32' }}>
                📥 Exportar Excel
              </button>
            )}
          </div>
        </div>
      </div>

      {filas.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e0e0e0', flexWrap: 'wrap' }}>
          {[
            { label: 'Total SERV', valor: filas.length, color: '#333' },
            { label: 'Entradas (E)', valor: totalE, color: '#2e7d32' },
            { label: 'Salidas (S)', valor: totalS, color: '#1565c0' },
            { label: 'Filtrados', valor: datosFiltrados.length, color: '#f57f17' },
          ].map(s => (
            <div key={s.label} style={{ padding: '10px 24px', textAlign: 'center', borderRight: '1px solid #e0e0e0' }}>
              <div style={{ fontSize: '20px', color: s.color, fontWeight: 'bold' }}>{s.valor}</div>
              <div style={{ color: '#888', fontSize: '11px' }}>{s.label}</div>
            </div>
          ))}
          <div style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 16, flex: 1, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>Precisión:</div>
            {[
              { nivel: 'N0A', cnt: cntN0A, label: 'Hist. exacto' },
              { nivel: 'N0B', cnt: cntN0B, label: 'Hist. agrupado' },
              { nivel: 'TomTom', cnt: cntTT, label: 'TomTom' },
              { nivel: 'N25', cnt: cntN25, label: 'Solo GPS' },
            ].map(({ nivel, cnt, label }) => (
              <div key={nivel} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: getNivelColor(nivel) }} />
                <span style={{ fontSize: 11, color: '#555' }}>{label}: <strong style={{ color: getNivelColor(nivel) }}>{cnt}</strong></span>
              </div>
            ))}
            <div style={{ background: precisionPct >= 70 ? '#e8f5e9' : '#fff3e0', color: precisionPct >= 70 ? '#2e7d32' : '#e65100', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
              {precisionPct}% histórico
            </div>
          </div>
        </div>
      )}

      {filas.length > 0 ? (
        <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 160px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['SERV','VUELO','E/S','H.ATO','PAX','ETA (min)','H.INICIO','H.ÚLTIMA','NIVEL','RECORRIDO','PROVEEDOR','TRIPULANTES','ALERTA'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datosFiltrados.map((f) => (
                <tr key={f.serv} style={{ background: getNivelBg(f.nivel) }}>
                  <td style={{ ...tdStyle, fontWeight: 700, color: '#1a2235' }}>{f.serv}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{f.vuelo}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 'bold', background: f.es === 'E' ? '#e8f5e9' : '#e3f2fd', color: f.es === 'E' ? '#2e7d32' : '#1565c0' }}>{f.es}</span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{f.hato}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{f.pax}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: f.etaMin > 90 ? '#c62828' : '#333' }}>{f.etaMin}</td>
                  <td style={{ ...tdStyle, color: '#2e7d32', fontWeight: 600 }}>{f.hInicio}</td>
                  <td style={{ ...tdStyle, color: '#1565c0', fontWeight: 600 }}>{f.hUltima}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: getNivelBg(f.nivel), color: getNivelColor(f.nivel), border: `1px solid ${getNivelColor(f.nivel)}` }}>
                      {getNivelLabel(f.nivel)}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', color: '#555' }}>{f.recorrido}</td>
                  <td style={{ ...tdStyle, color: '#555' }}>{f.prov}</td>
                  <td style={{ ...tdStyle, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', color: '#333' }}>{f.tripulantes}</td>
                  <td style={{ ...tdStyle, color: f.alerta.startsWith('⚠️') ? '#c62828' : f.alerta.startsWith('GPS') ? '#e65100' : '#2e7d32', fontWeight: 600 }}>{f.alerta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '80px 24px' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🚐</div>
          <p style={{ color: '#888', fontSize: 16, marginBottom: 8 }}>No hay datos de ETA calculados</p>
          <p style={{ color: '#bbb', fontSize: 13 }}>Ve a Carga → Ejecuta Agrupamiento → Calcular ETA</p>
        </div>
      )}
    </div>
  )
}

export default Traslados