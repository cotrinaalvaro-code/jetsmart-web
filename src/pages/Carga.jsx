import { useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { asignarGrupos } from '../lib/agrupamiento'

const ZONA_CORREDOR = {
  'SMP INGENIERIA': 'NORESTE 2', 'SMP PACIFICO': 'NORTE 5', 'SMP SAN DIEGO': 'NORTE 3',
  'LOS OLIVOS PALMERAS': 'NORTE 3', 'LOS OLIVOS PRO': 'NORTE 3',
  'INDEPENDENCIA ERMITAÑO': 'NORESTE 3', 'INDEPENDENCIA TAHUANTINSUYO': 'NORESTE 3',
  'COMAS COLLIQUE': 'NORTE 2', 'COMAS SANTA LUZMILA': 'NORTE 2',
  'CARABAYLLO EL PROGRESO': 'NORTE 4', 'CARABAYLLO SANTA MARIA': 'NORTE 4',
  'PUENTE PIEDRA INDUSTRIAL': 'NORTE 1', 'PUENTE PIEDRA ZAPALLAL': 'NORTE 1',
  'RIMAC': 'NORESTE 1', 'LIMA CENTRO': 'CENTRO', 'LIMA INDUSTRIAL': 'CENTRO 1',
  'LIMA PALOMINO - CIPRESES': 'CENTRO 2', 'LIMA SANTA BEATRIZ': 'CENTRO 3',
  'MAGDALENA PUERICULTORIO': 'SAN MIGUEL 1', 'MAGDALENA SUCRE': 'SAN MIGUEL 1',
  'MARANGA SAN MIGUEL': 'SAN MIGUEL', 'JESUS MARIA CAMPO DE MARTE': 'SAN MIGUEL 2',
  'JESUS MARIA GREGORIO ESCOBEDO': 'SAN MIGUEL 2', 'PUEBLO LIBRE': 'AV. ARICA',
  'SAN ISIDRO BEGONIAS': 'SAN MIGUEL 2', 'SAN ISIDRO ORRANTIA COUNTRY': 'SAN MIGUEL 2',
  'SAN ISIDRO PARQUE EL OLIVAR': 'SAN MIGUEL 2', 'SAN ISIDRO PARQUE LA PERA': 'SAN MIGUEL 2',
  'SAN ISIDRO REP DE PANAMA': 'SAN MIGUEL 2', 'LA VICTORIA BALCONCILLO': 'AV. ARICA 1',
  'LA VICTORIA PLAZA MANCO CAPAC': 'AV. ARICA 1', 'LA VICTORIA SANTA CATALINA': 'AV. ARICA 1',
  'LINCE PROLONGACION IQUITOS': 'AV. ARICA 1', 'LINCE RISSO': 'AV. ARICA 1',
  'SAN MIGUEL PANDO': 'SAN MIGUEL', 'SAN MIGUEL PARQUE DE LAS LEYENDAS': 'SAN MIGUEL',
  'CALLAO GAMBETA': 'NORTE 5', 'CALLAO MINKA': 'CALLAO 3',
  'BELLAVISTA CIUDAD DEL PESCADOR': 'CALLAO 2', 'BELLAVISTA ESTADIO MIGUEL GRAU': 'CALLAO 2',
  'LA PERLA': 'CALLAO 2', 'LA PUNTA': 'CALLAO 1', 'CARMEN DE LA LEGUA': 'AV. ARICA 2',
  'CALLAO SANTA ROSA': 'CALLAO NORTE', 'SURCO ALBORADA': 'VIA EVITAMIENTO 2',
  'SURCO ALAMOS': 'VIA EVITAMIENTO 2', 'SURCO CHACARILLA': 'VIA EVITAMIENTO',
  'SURCO ENCALADA': 'ESTE', 'SURCO LA CASTELLANA': 'COSTA VERDE',
  'SURCO BUGANVILLA': 'VIA EVITAMIENTO', 'SURCO LOMA AMARILLA': 'VIA EVITAMIENTO',
  'SURCO SAGITARIO': 'COSTA VERDE', 'SURCO SAN ROQUE': 'COSTA VERDE',
  'SAN BORJA PENTAGONITO': 'VIA EVITAMIENTO 1', 'SAN BORJA TORRES DE LIMATAMBO': 'VIA EVITAMIENTO 1',
  'SURQUILLO BARRIO MEDICO': 'COSTA VERDE 3', 'SURQUILLO LA CALERA': 'COSTA VERDE 3',
  'CHORRILLOS CEDROS': 'COSTA VERDE 1', 'CHORRILLOS PANTANOS': 'COSTA VERDE 1',
  'CHORRILLOS PLAZA LIMA SUR': 'COSTA VERDE 1', 'MIRAFLORES BERLIN': 'COSTA VERDE 2',
  'MIRAFLORES HUACA': 'COSTA VERDE 2', 'MIRAFLORES LA AURORA': 'COSTA VERDE 2',
  'MIRAFLORES LA MAR': 'COSTA VERDE 2', 'MIRAFLORES LARCO': 'COSTA VERDE 2',
  'BARRANCO': 'COSTA VERDE 1', 'LA MOLINA CAMACHO': 'ESTE 1', 'LA MOLINA VIÑAS': 'ESTE',
  'LA MOLINA SOL DE LA MOLINA': 'ESTE 1', 'LA MOLINA LA CAPILLA': 'ESTE 1',
  'LA MOLINA RINCONADA': 'ESTE 1', 'LA MOLINA LA PLANICIE': 'ESTE 1',
  'ATE LOS SAUCES': 'ESTE 3', 'ATE SAN GREGORIO': 'ESTE 3', 'ATE MUNICIPAL': 'ESTE 3',
  'SJM CIUDAD DE DIOS': 'PANAMERICANA SUR', 'SJM ALEMANA': 'PANAMERICANA SUR',
  'SJM PAMPLONA ALTA': 'PANAMERICANA SUR 1', 'SJM UMAMARCA': 'PANAMERICANA SUR',
  'EL AGUSTINO ATARJEA': 'ESTE 4', 'SJL LAS FLORES': 'ESTE 2', 'SJL ZARATE': 'ESTE 2',
  'SJL CANTO GRANDE': 'ESTE 2', 'VENTANILLA MI PERU': 'VENTANILLA',
  'VENTANILLA CENTRO': 'VENTANILLA', 'CIENEGUILLA': 'ESTE 1',
  'SURCO SURCO VIEJO': 'COSTA VERDE 1',
}

const horaAMin = (h) => {
  if (!h || !String(h).includes(':')) return 0
  const [hh, mm] = String(h).split(':').map(Number)
  return hh * 60 + mm
}

const restarMins = (hora, mins) => {
  let total = horaAMin(hora) - mins
  if (total < 0) total += 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

const calcularHATO = (rept, vuelo) => {
  if (!rept) return rept
  const reptHH = Math.floor(horaAMin(rept) / 60)
  let resta = 30
  if (vuelo && vuelo.toUpperCase() === 'JZ7800') resta = 40
  else if (reptHH < 6) resta = 20
  return restarMins(rept, resta)
}

const formatFecha = (date) => {
  const d = new Date(date)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

function Carga() {
  const [datos, setDatos] = useState([])
  const [archivo, setArchivo] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [agrupando, setAgrupando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const procesarTentativo = async (workbook) => {
    const grupos = {}
    const gruposOrden = {}
    let grpCounter = 0
    const filasDatos = []

    workbook.SheetNames.forEach(nombreHoja => {
      const hoja = workbook.Sheets[nombreHoja]
      const filas = XLSX.utils.sheet_to_json(hoja, { header: 1 })
      let hdrRow = -1, colID = -1, colREPT = -1, colCKOUT = -1
      for (let r = 0; r < Math.min(filas.length, 6); r++) {
        const idx = filas[r].indexOf('ID')
        if (idx >= 0) {
          hdrRow = r; colID = idx
          filas[r].forEach((v, i) => {
            if (v === 'REPT') colREPT = i
            if (v === 'CKOUT') colCKOUT = i
          })
          break
        }
      }
      if (hdrRow < 0 || colID < 0 || colREPT < 0) return
      const dataStart = hdrRow + 2
      for (let r = dataStart; r < filas.length; r++) {
        const fila = filas[r]
        const rept = String(fila[colREPT] || '').trim()
        const ckout = String(fila[colCKOUT] || '').trim()
        if (!rept || !rept.includes(':')) continue
        const key = `${rept}|${ckout}`
        if (!grupos[key]) {
          grpCounter++
          grupos[key] = { rept, ckout, reptMin: horaAMin(rept), fltE: '', fltS: '' }
          gruposOrden[key] = grpCounter
        }
        const raw0 = String(fila[0] || '').trim()
        const raw1 = String(fila[1] || '').trim().replace('.0', '')
        let fltVal = ''
        if (raw0.toUpperCase() === 'JZ' && !isNaN(raw1) && raw1) fltVal = `JZ${raw1}`
        else if (raw0.toUpperCase().startsWith('JZ') && raw0.length > 2) fltVal = raw0.toUpperCase()
        if (fltVal) {
          let dep = '', arr = ''
          for (let c = 0; c < Math.min(colID, 8); c++) {
            const cv = String(fila[c] || '').trim()
            const parts = cv.split(' ').filter(p =>
              p.length === 3 && p === p.toUpperCase() && isNaN(p) && !['JZ','REG','DEP','ARR'].includes(p))
            parts.forEach(p => { if (!dep) dep = p; else if (!arr) arr = p })
          }
          if (dep === 'LIM' && !grupos[key].fltE) grupos[key].fltE = fltVal
          if (arr === 'LIM') grupos[key].fltS = fltVal
        }
        const id = String(fila[colID] || '').replace('.0', '').trim()
        if (id && !isNaN(id) && Number(id) > 1000) {
          filasDatos.push({ id, rept, ckout, key, grpIdx: gruposOrden[key] })
        }
      }
    })

    const dnisUnicos = [...new Set(filasDatos.map(f => f.id))]
    setMensaje(`Encontrados ${dnisUnicos.length} tripulantes. Cruzando con BD...`)
    const { data: bdDatos } = await supabase
      .from('tripulantes')
      .select('dni, nombre, apellido, cargo, direccion, distrito, lat, lng, telefono')
      .in('dni', dnisUnicos)
    const bdMap = {}
    ;(bdDatos || []).forEach(t => { bdMap[t.dni] = t })

    const fechaSig = new Date()
    fechaSig.setDate(fechaSig.getDate() + 1)
    const filasProcesadas = []
    const dnisVistos = new Set()

    filasDatos.forEach(({ id, rept, ckout, key, grpIdx }) => {
      if (dnisVistos.has(`${id}|${key}`)) return
      dnisVistos.add(`${id}|${key}`)
      const grupo = grupos[key]
      if (!grupo || (!grupo.fltE && !grupo.fltS)) return
      const bd = bdMap[id] || {}
      const nombreCompleto = bd.nombre ? `${bd.nombre} ${bd.apellido}`.trim() : ''
      const dniNombre = `${id}-${nombreCompleto}`
      const cargo = bd.cargo || ''
      const direccion = bd.direccion || ''
      const distrito = bd.distrito || ''
      const corredor = ZONA_CORREDOR[distrito] || 'SIN CORREDOR'
      const telefono = bd.telefono || ''
      const lat = bd.lat || ''
      const lng = bd.lng || ''
      const enBD = !!bdMap[id]

      if (grupo.fltE) {
        const hato = calcularHATO(rept, grupo.fltE)
        filasProcesadas.push({
          uid: `${id}_E_${key}`, activo: true, enBD, grpIdx, sortKey: grpIdx,
          col1_dni: id, col2_num: '', col3_fecha: formatFecha(fechaSig),
          col4_es: 'E', col5_serv: '', col6_hreal: rept,
          col7_pax: 1, col8_prov: 'Directo Auto', col9_vuelo: grupo.fltE,
          col10_hato: hato, col11_hrec: '', col12_traslado: '',
          col13_cat: cargo, col14_nombres: dniNombre,
          col15_area: 'JETSMART BASE', col16_dir: direccion,
          col17_dist: distrito, col18_tel: telefono,
          col19_estado: 'Activo', col20_com: '',
          col21_lat: lat, col22_lng: lng,
          col23_grupo: '', col24_orden: '', col25_corredor: corredor,
        })
      }

      if (grupo.fltS) {
        let fechaS = new Date(fechaSig)
        if (horaAMin(ckout) <= 110) fechaS.setDate(fechaS.getDate() + 1)
        filasProcesadas.push({
          uid: `${id}_S_${key}`, activo: true, enBD, grpIdx, sortKey: grpIdx + 10000,
          col1_dni: id, col2_num: '', col3_fecha: formatFecha(fechaS),
          col4_es: 'S', col5_serv: '', col6_hreal: ckout,
          col7_pax: 1, col8_prov: 'Directo Auto', col9_vuelo: grupo.fltS,
          col10_hato: ckout, col11_hrec: '', col12_traslado: '',
          col13_cat: cargo, col14_nombres: dniNombre,
          col15_area: 'JETSMART BASE', col16_dir: direccion,
          col17_dist: distrito, col18_tel: telefono,
          col19_estado: 'Activo', col20_com: '',
          col21_lat: lat, col22_lng: lng,
          col23_grupo: '', col24_orden: '', col25_corredor: corredor,
        })
      }
    })

    filasProcesadas.sort((a, b) => {
      const ha = horaAMin(a.col10_hato), hb = horaAMin(b.col10_hato)
      if (ha !== hb) return ha - hb
      return a.sortKey - b.sortKey
    })
    return filasProcesadas
  }

  const handleArchivo = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setArchivo(file.name)
    setCargando(true)
    setMensaje('Leyendo archivo...')
    setDatos([])
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const workbook = XLSX.read(evt.target.result, { type: 'binary' })
        const resultado = await procesarTentativo(workbook)
        setDatos(resultado)
        const sinBD = resultado.filter(r => !r.enBD).length
        setMensaje(sinBD > 0
          ? `✅ ${resultado.length} filas generadas. ⚠️ ${sinBD} DNIs no encontrados en BD.`
          : `✅ ${resultado.length} filas generadas correctamente.`)
      } catch (err) {
        setMensaje('Error: ' + err.message)
      }
      setCargando(false)
    }
    reader.readAsBinaryString(file)
  }

  const handleAgrupar = async () => {
    setAgrupando(true)
    setMensaje('Ejecutando agrupamiento...')
    try {
      const { data: cfgData } = await supabase.from('configuracion').select('*')
      const cfg = {}
      if (cfgData) cfgData.forEach(r => { cfg[r.id] = r.valor })
      const activos = datos.filter(d => d.activo)
      const resultado = asignarGrupos(activos, cfg)
      setDatos(datos.map(d => {
        const r = resultado.find(r => r.uid === d.uid)
        return r ? { ...d, ...r } : d
      }))
      const gruposE = new Set(resultado.filter(r => r.col4_es === 'E' && r.col23_grupo).map(r => r.col23_grupo))
      const gruposS = new Set(resultado.filter(r => r.col4_es === 'S' && r.col23_grupo).map(r => r.col23_grupo))
      setMensaje(`✅ Agrupamiento completado — ${gruposE.size} grupos E, ${gruposS.size} grupos S`)
    } catch (err) {
      setMensaje('Error en agrupamiento: ' + err.message)
    }
    setAgrupando(false)
  }

  const toggleActivo = (uid) => setDatos(datos.map(d => d.uid === uid ? { ...d, activo: !d.activo } : d))
  const editarCorredor = (uid, valor) => setDatos(datos.map(d => d.uid === uid ? { ...d, col25_corredor: valor } : d))

  const totalFilas = datos.length
  const entradas = datos.filter(d => d.col4_es === 'E').length
  const salidas = datos.filter(d => d.col4_es === 'S').length
  const sinBD = datos.filter(d => !d.enBD).length

  const thStyle = {
    padding: '10px 10px', color: '#667788', textAlign: 'left',
    fontSize: '11px', whiteSpace: 'nowrap', borderBottom: '2px solid #e0e8f0',
    background: '#f4f6f9'
  }
  const tdStyle = { padding: '7px 10px', fontSize: '12px', whiteSpace: 'nowrap' }

  return (
    <div style={{ padding: '32px', background: '#f4f6f9', minHeight: '100vh' }}>
      <h2 style={{ color: '#1a2235', marginBottom: '8px' }}>📂 Importar MOV TENTATIVO</h2>
      <p style={{ color: '#667788', marginBottom: '32px' }}>
        Genera el DataCargaM automáticamente cruzando con la BD de tripulantes
      </p>

      <div style={{
        background: 'white', border: '2px dashed #c0ccd8', borderRadius: '12px',
        padding: '40px', textAlign: 'center', marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <p style={{ color: '#667788', marginBottom: '8px' }}>
          {archivo ? `✅ ${archivo}` : 'Selecciona el archivo MOV TENTATIVO (.xlsx)'}
        </p>
        {mensaje && (
          <p style={{
            color: mensaje.includes('Error') ? '#ff4444' : '#00aa66',
            marginBottom: '16px', fontWeight: 'bold', fontSize: '14px'
          }}>{mensaje}</p>
        )}
        <label style={{
          padding: '12px 24px', background: '#00b4d8', color: 'white',
          borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'inline-block'
        }}>
          {cargando ? 'Procesando...' : 'Seleccionar archivo Excel'}
          <input type="file" accept=".xlsx,.xlsm,.xls" onChange={handleArchivo} style={{ display: 'none' }} />
        </label>
      </div>

      {datos.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total filas', valor: totalFilas, color: '#1a2235' },
              { label: 'Entradas (E)', valor: entradas, color: '#00cc88' },
              { label: 'Salidas (S)', valor: salidas, color: '#4466ff' },
              { label: 'Sin BD ⚠️', valor: sinBD, color: sinBD > 0 ? '#ff4444' : '#00cc88' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'white', borderRadius: '10px', padding: '16px 24px',
                flex: 1, border: '1px solid #e0e8f0', textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}>
                <div style={{ fontSize: '28px', color: stat.color, fontWeight: 'bold' }}>{stat.valor}</div>
                <div style={{ color: '#667788', fontSize: '13px', marginTop: '4px' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '24px', textAlign: 'right' }}>
            <button
              onClick={handleAgrupar}
              disabled={agrupando}
              style={{
                padding: '12px 32px',
                background: agrupando ? '#aab' : '#00cc88',
                color: 'white', border: 'none', borderRadius: '8px',
                fontWeight: 'bold', fontSize: '16px',
                cursor: agrupando ? 'not-allowed' : 'pointer'
              }}
            >
              {agrupando ? 'Agrupando...' : '⚡ Ejecutar Agrupamiento'}
            </button>
          </div>

          <div style={{
            background: 'white', borderRadius: '12px',
            border: '1px solid #e0e8f0', overflow: 'auto',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1800px' }}>
              <thead>
                <tr>
                  {['Act.','DNI','#','FECHA','E/S','SERV','H.REAL','PAX','PROV.','VUELO','H.ATO','H.REC.','TRASLD','CAT.','NOMBRES','ÁREA','DIRECCION','DISTRITO','TELÉFONO','ESTADO','COM.','LAT.','LONG.','GRUPO','ORDEN','CORREDOR','BD'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.map(d => (
                  <tr key={d.uid} style={{
                    borderTop: '1px solid #f0f4f8',
                    opacity: d.activo ? 1 : 0.4,
                    background: !d.enBD ? '#fff5f5' : d.col4_es === 'E' ? '#f8fff9' : '#f8f8ff'
                  }}>
                    <td style={tdStyle}>
                      <input type="checkbox" checked={d.activo}
                        onChange={() => toggleActivo(d.uid)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{...tdStyle, color: '#667788'}}>{d.col1_dni}</td>
                    <td style={{...tdStyle, color: '#aab'}}>{d.col2_num}</td>
                    <td style={{...tdStyle, color: '#667788'}}>{d.col3_fecha}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold',
                        background: d.col4_es === 'E' ? '#e8faf4' : '#eef0ff',
                        color: d.col4_es === 'E' ? '#00cc88' : '#4466ff'
                      }}>{d.col4_es}</span>
                    </td>
                    <td style={{...tdStyle, color: '#aab'}}>{d.col5_serv}</td>
                    <td style={{...tdStyle, color: '#667788'}}>{d.col6_hreal}</td>
                    <td style={{...tdStyle, color: '#1a2235', fontWeight: '600', textAlign: 'center'}}>{d.col7_pax}</td>
                    <td style={{...tdStyle, color: '#667788'}}>{d.col8_prov}</td>
                    <td style={{...tdStyle, color: '#1a2235', fontWeight: '600'}}>{d.col9_vuelo}</td>
                    <td style={{...tdStyle, color: '#1a2235', fontWeight: '600'}}>{d.col10_hato}</td>
                    <td style={{...tdStyle, color: '#aab'}}>{d.col11_hrec}</td>
                    <td style={{...tdStyle, color: '#aab'}}>{d.col12_traslado}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '2px 6px', borderRadius: '20px',
                        background: '#e8f7fb', color: '#00b4d8', fontSize: '11px'
                      }}>{d.col13_cat}</span>
                    </td>
                    <td style={{...tdStyle, color: '#1a2235', fontWeight: '500'}}>{d.col14_nombres}</td>
                    <td style={{...tdStyle, color: '#667788'}}>{d.col15_area}</td>
                    <td style={{...tdStyle, color: '#667788', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis'}}>{d.col16_dir}</td>
                    <td style={{...tdStyle, color: '#667788'}}>{d.col17_dist}</td>
                    <td style={{...tdStyle, color: '#667788'}}>{d.col18_tel}</td>
                    <td style={{...tdStyle, color: '#00aa66'}}>{d.col19_estado}</td>
                    <td style={{...tdStyle, color: '#aab'}}>{d.col20_com}</td>
                    <td style={{...tdStyle, color: '#aab', fontSize: '10px'}}>{d.col21_lat}</td>
                    <td style={{...tdStyle, color: '#aab', fontSize: '10px'}}>{d.col22_lng}</td>
                    <td style={{...tdStyle, color: '#1a2235', fontWeight: '700',
                      background: d.col23_grupo ? (d.col4_es === 'E' ? '#e8faf4' : '#eef0ff') : 'transparent'
                    }}>{d.col23_grupo}</td>
                    <td style={{...tdStyle, color: '#1a2235', fontWeight: '700', textAlign: 'center'}}>{d.col24_orden}</td>
                    <td style={tdStyle}>
                      <input value={d.col25_corredor}
                        onChange={e => editarCorredor(d.uid, e.target.value)}
                        style={{
                          background: '#f4f6f9', border: '1px solid #e0e8f0',
                          borderRadius: '6px', color: '#1a2235',
                          padding: '3px 6px', fontSize: '11px', width: '110px'
                        }} />
                    </td>
                    <td style={{...tdStyle, textAlign: 'center'}}>
                      {d.enBD
                        ? <span style={{ color: '#00cc88', fontWeight: 'bold' }}>✓</span>
                        : <span style={{ color: '#ff4444', fontWeight: 'bold' }}>✗</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default Carga