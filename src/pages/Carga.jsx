import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import * as XLSXStyle from 'xlsx-js-style'
import { supabase } from '../lib/supabase'
import { asignarGrupos } from '../lib/agrupamiento'
import ResumenAgrupamiento, { calcularResumen } from '../components/ResumenAgrupamiento'

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
  'LA MOLINA SANTA PATRICIA': 'ESTE 1',
  'ATE LOS SAUCES': 'ESTE 4', 'ATE SAN GREGORIO': 'ESTE 5', 'ATE MUNICIPAL': 'ESTE 4',
  'SANTA ANITA PRODUCTORES': 'ESTE 4',
  'SJM CIUDAD DE DIOS': 'PANAMERICANA SUR', 'SJM ALEMANA': 'PANAMERICANA SUR',
  'SJM PAMPLONA ALTA': 'PANAMERICANA SUR 1', 'SJM UMAMARCA': 'PANAMERICANA SUR',
  'EL AGUSTINO ATARJEA': 'ESTE 4', 'SJL LAS FLORES': 'ESTE 2', 'SJL ZARATE': 'ESTE 2',
  'SJL CANTO GRANDE': 'ESTE 2', 'VENTANILLA MI PERU': 'VENTANILLA',
  'VENTANILLA CENTRO': 'VENTANILLA', 'CIENEGUILLA': 'ESTE 3',
  'SURCO SURCO VIEJO': 'COSTA VERDE 1',
}

const COLUMNAS = [
  { key: 'act', label: 'Act.', default: true },
  { key: 'dni', label: 'DNI', default: true },
  { key: 'num', label: '#', default: false },
  { key: 'fecha', label: 'FECHA', default: true },
  { key: 'es', label: 'E/S', default: true },
  { key: 'serv', label: 'SERV', default: false },
  { key: 'hreal', label: 'H.REAL', default: true },
  { key: 'pax', label: 'PAX', default: true },
  { key: 'prov', label: 'PROV.', default: true },
  { key: 'vuelo', label: 'VUELO', default: true },
  { key: 'hato', label: 'H.ATO', default: true },
  { key: 'hrec', label: 'H.REC.', default: false },
  { key: 'trasld', label: 'TRASLD', default: false },
  { key: 'cat', label: 'CAT.', default: true },
  { key: 'nombres', label: 'NOMBRES', default: true },
  { key: 'area', label: 'ÁREA', default: false },
  { key: 'dir', label: 'DIRECCION', default: false },
  { key: 'dist', label: 'DISTRITO', default: true },
  { key: 'tel', label: 'TELÉFONO', default: false },
  { key: 'estado', label: 'ESTADO', default: false },
  { key: 'com', label: 'COM.', default: false },
  { key: 'lat', label: 'LAT.', default: false },
  { key: 'lng', label: 'LONG.', default: false },
  { key: 'grupo', label: 'GRUPO', default: true },
  { key: 'orden', label: 'ORDEN', default: true },
  { key: 'corredor', label: 'CORREDOR', default: true },
  { key: 'bd', label: 'BD', default: true },
]

// Columnas que tienen filtro dropdown
const COLS_CON_FILTRO = ['es', 'vuelo', 'hato', 'prov', 'grupo', 'corredor', 'cat', 'dist']

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

const sortearDatos = (arr) => [...arr].sort((a, b) => {
  const hatoA = horaAMin(a._hatoSort || a.col10_hato)
  const hatoB = horaAMin(b._hatoSort || b.col10_hato)
  if (hatoA !== hatoB) return hatoA - hatoB
  if (a.col4_es !== b.col4_es) return a.col4_es === 'E' ? -1 : 1
  const numA = parseInt((a.col23_grupo || '').replace(/[ES]/g, '') || '9999')
  const numB = parseInt((b.col23_grupo || '').replace(/[ES]/g, '') || '9999')
  if (numA !== numB) return numA - numB
  return (parseInt(a.col24_orden) || 0) - (parseInt(b.col24_orden) || 0)
})

function ColHeader({ label, colKey, datos, filtros, setFiltros }) {
  const [open, setOpen] = useState(false)

  const tieneFiltro = COLS_CON_FILTRO.includes(colKey)
  const filtroActivo = filtros[colKey] && filtros[colKey] !== ''

  // Valores únicos para el dropdown
  const colMap = {
    es: 'col4_es', vuelo: 'col9_vuelo', hato: 'col10_hato',
    prov: 'col8_prov', grupo: 'col23_grupo', corredor: 'col25_corredor',
    cat: 'col13_cat', dist: 'col17_dist'
  }
  const campo = colMap[colKey]
  const valoresUnicos = campo
    ? [...new Set(datos.map(d => d[campo]).filter(Boolean))].sort()
    : []

  const handleSelect = (val) => {
    setFiltros(prev => ({ ...prev, [colKey]: val }))
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '4px', width: '100%' }}>
      <span>{label}</span>
      {tieneFiltro && (
        <>
          <span
            onClick={e => { e.stopPropagation(); setOpen(!open) }}
            style={{
              cursor: 'pointer', fontSize: '9px',
              color: filtroActivo ? '#1565c0' : '#aaa',
              fontWeight: filtroActivo ? '800' : '400'
            }}
          >▼</span>
          {filtroActivo && (
            <span
              onClick={e => { e.stopPropagation(); setFiltros(prev => ({ ...prev, [colKey]: '' })) }}
              style={{ cursor: 'pointer', color: '#e53935', fontSize: '9px', fontWeight: '800' }}
            >✕</span>
          )}
          {open && (
            <div style={{
              position: 'absolute', top: '20px', left: 0, background: 'white',
              border: '1px solid #e0e0e0', borderRadius: '6px', zIndex: 999,
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)', minWidth: '150px',
              maxHeight: '220px', overflowY: 'auto'
            }}
              onClick={e => e.stopPropagation()}
            >
              <div
                onClick={() => handleSelect('')}
                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '11px', color: '#555', borderBottom: '1px solid #f0f0f0', background: !filtros[colKey] ? '#e3f2fd' : 'white' }}
              >
                (Todos)
              </div>
              {valoresUnicos.map(v => (
                <div key={v}
                  onClick={() => handleSelect(v)}
                  style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '11px', color: '#333', borderBottom: '1px solid #f5f5f5', background: filtros[colKey] === v ? '#e3f2fd' : 'white' }}
                >
                  {v}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Carga() {
  const fileInputRef = useRef(null)
  const [datos, setDatos] = useState(() => {
    try {
      const raw = localStorage.getItem('cargaData')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })
  const [archivo, setArchivo] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [agrupando, setAgrupando] = useState(false)
  const [resumenData, setResumenData] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [showCols, setShowCols] = useState(false)
  const [filtros, setFiltros] = useState({})
  const [colsVisibles, setColsVisibles] = useState(() => {
    try {
      const raw = localStorage.getItem('colsVisibles')
      if (raw) return JSON.parse(raw)
    } catch {}
    const v = {}
    COLUMNAS.forEach(c => { v[c.key] = c.default })
    return v
  })

  useEffect(() => {
    localStorage.setItem('cargaData', JSON.stringify(datos))
  }, [datos])

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'mapaData') {
        try {
          const nuevoDatos = JSON.parse(e.newValue)
          if (nuevoDatos) setDatos(sortearDatos(nuevoDatos))
        } catch {}
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const toggleCol = (key) => setColsVisibles(prev => {
    const nuevo = { ...prev, [key]: !prev[key] }
    localStorage.setItem('colsVisibles', JSON.stringify(nuevo))
    return nuevo
  })

  const limpiarDatos = () => {
    if (confirm('¿Limpiar todos los datos cargados?')) {
      setDatos([])
      setArchivo(null)
      setMensaje('')
      setFiltros({})
      setResumenData(null)
      localStorage.removeItem('cargaData')
      localStorage.removeItem('mapaData')
    }
  }

  // Aplicar filtros
  const datosMostrados = datos.filter(d => {
    if (filtros.es && d.col4_es !== filtros.es) return false
    if (filtros.vuelo && d.col9_vuelo !== filtros.vuelo) return false
    if (filtros.hato && d.col10_hato !== filtros.hato) return false
    if (filtros.prov && d.col8_prov !== filtros.prov) return false
    if (filtros.grupo && d.col23_grupo !== filtros.grupo) return false
    if (filtros.corredor && d.col25_corredor !== filtros.corredor) return false
    if (filtros.cat && d.col13_cat !== filtros.cat) return false
    if (filtros.dist && d.col17_dist !== filtros.dist) return false
    return true
  })

  const filtrosActivos = Object.values(filtros).some(v => v && v !== '')

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

    const { data: corrData } = await supabase.from('dni_correcciones').select('*')
    const dniExcluir = new Set()
    const dniCorreccion = {}
    if (corrData) {
      corrData.forEach(r => {
        if (r.excluir) dniExcluir.add(String(r.dni_tentativo).trim())
        else if (r.dni_correcto && r.dni_correcto !== r.dni_tentativo) {
          dniCorreccion[String(r.dni_tentativo).trim()] = String(r.dni_correcto).trim()
        }
      })
    }

    const filasFiltradas = filasDatos
      .filter(f => !dniExcluir.has(f.id))
      .map(f => ({ ...f, id: dniCorreccion[f.id] || f.id }))

    const dnisUnicos = [...new Set(filasFiltradas.map(f => f.id))]
    setMensaje(`Encontrados ${dnisUnicos.length} tripulantes. Cruzando con BD...`)

    const { data: bdDatos } = await supabase
      .from('tripulantes')
      .select('dni, nombre, apellido, cargo, direccion, distrito, zona_distrito, lat, lng, telefono')
      .in('dni', dnisUnicos)

    const bdMap = {}
    ;(bdDatos || []).forEach(t => { bdMap[t.dni] = t })

    const fechaSig = new Date()
    fechaSig.setDate(fechaSig.getDate() + 1)
    const filasProcesadas = []
    const dnisVistos = new Set()

    filasFiltradas.forEach(({ id, rept, ckout, key, grpIdx }) => {
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
      const zonaDistrito = bd.zona_distrito || distrito
      const corredor = ZONA_CORREDOR[zonaDistrito] || ZONA_CORREDOR[distrito] || 'SIN CORREDOR'
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
          col17_dist: zonaDistrito, col18_tel: telefono,
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
          col17_dist: zonaDistrito, col18_tel: telefono,
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
    if (fileInputRef.current) fileInputRef.current.value = ''
    setArchivo(file.name)
    setCargando(true)
    setMensaje('Leyendo archivo...')
    setDatos([])
    setFiltros({})
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const workbook = XLSX.read(evt.target.result, { type: 'binary' })
        const resultado = await procesarTentativo(workbook)
        setDatos(resultado)
        const sinBD = resultado.filter(r => !r.enBD).length
        setMensaje(sinBD > 0
          ? `✅ ${resultado.length} filas. ⚠️ ${sinBD} sin BD.`
          : `✅ ${resultado.length} filas generadas correctamente.`)
      } catch (err) {
        setMensaje('Error: ' + err.message)
      }
      setCargando(false)
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
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

      const hatoAnclaMap = {}
      resultado.forEach(r => {
        if (r.col4_es === 'E' && parseInt(r.col24_orden) === 1) {
          hatoAnclaMap[r.col23_grupo] = r.col10_hato
        }
      })
      const hatoEporDNI = {}
      resultado.forEach(r => {
        if (r.col4_es === 'E') {
          hatoEporDNI[r.col1_dni] = hatoAnclaMap[r.col23_grupo] || r.col10_hato
        }
      })
      resultado.forEach(r => {
        r._hatoSort = r.col4_es === 'E'
          ? (hatoAnclaMap[r.col23_grupo] || r.col10_hato)
          : (hatoEporDNI[r.col1_dni] || r.col10_hato)
      })

      setDatos(sortearDatos(resultado))
      const datosOrdenados = sortearDatos(resultado)
      setDatos(datosOrdenados)
      const gruposE = new Set(resultado.filter(r => r.col4_es === 'E' && r.col23_grupo).map(r => r.col23_grupo))
      const gruposS = new Set(resultado.filter(r => r.col4_es === 'S' && r.col23_grupo).map(r => r.col23_grupo))
      setMensaje(`✅ ${gruposE.size} grupos E, ${gruposS.size} grupos S`)
      setResumenData(calcularResumen(resultado.map(r => ({
        es:       r.col4_es,
        vuelo:    r.col9_vuelo,
        pax:      r.col7_pax,
        prov:     r.col8_prov,
        orden:    r.col24_orden,
        serv:     r.col5_serv,
        corredor: r.col25_corredor,
      }))))
    } catch (err) {
      setMensaje('Error: ' + err.message)
    }
    setAgrupando(false)
  }

  const exportarExcel = () => {
    const activos = datos.filter(d => d.activo)
    const headers = ['DNI','#','FECHA','E/S','SERV','H.REAL','PAX','PROV.','VUELO','H.ATO','H.REC.','TRASLD','CAT.','NOMBRES','ÁREA','DIRECCION','DISTRITO','TELÉFONO','ESTADO','COM.','LAT.','LONG.','GRUPO','ORDEN','CORREDOR']
    const filas = activos.map((d, i) => [
      d.col1_dni, i + 1, d.col3_fecha, d.col4_es, d.col5_serv,
      d.col6_hreal, d.col7_pax, d.col8_prov, d.col9_vuelo, d.col10_hato,
      d.col11_hrec, d.col12_traslado, d.col13_cat, d.col14_nombres,
      d.col15_area, d.col16_dir, d.col17_dist, d.col18_tel,
      d.col19_estado, d.col20_com, d.col21_lat, d.col22_lng,
      d.col23_grupo, d.col24_orden, d.col25_corredor
    ])
    const ws = XLSXStyle.utils.aoa_to_sheet([headers, ...filas])
    headers.forEach((h, i) => {
      const cell = XLSXStyle.utils.encode_cell({ r: 0, c: i })
      if (ws[cell]) ws[cell].s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1A2235' } }, alignment: { horizontal: 'center' } }
    })
    activos.forEach((d, rowIdx) => {
      const fillColor = d.col4_es === 'E' ? 'E8F5E9' : 'E3F2FD'
      headers.forEach((h, colIdx) => {
        const cell = XLSXStyle.utils.encode_cell({ r: rowIdx + 1, c: colIdx })
        if (ws[cell]) ws[cell].s = { fill: { fgColor: { rgb: fillColor } } }
      })
    })
    const wb = XLSXStyle.utils.book_new()
    XLSXStyle.utils.book_append_sheet(wb, ws, 'DataCargaM')
    XLSXStyle.writeFile(wb, `DataCargaM_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  const toggleActivo = (uid) => setDatos(datos.map(d => d.uid === uid ? { ...d, activo: !d.activo } : d))
  const editarCorredor = (uid, valor) => setDatos(datos.map(d => d.uid === uid ? { ...d, col25_corredor: valor } : d))

  const totalFilas = datos.length
  const entradas = datos.filter(d => d.col4_es === 'E').length
  const salidas = datos.filter(d => d.col4_es === 'S').length
  const sinBD = datos.filter(d => !d.enBD).length
  const sinCorredor = datos.filter(d => d.col25_corredor === 'SIN CORREDOR').length
  const tieneGrupos = datos.some(d => d.col23_grupo)

  const thStyle = {
    padding: '9px 8px', color: '#555', textAlign: 'left',
    fontSize: '11px', whiteSpace: 'nowrap', borderBottom: '2px solid #e0e0e0',
    background: 'white', position: 'sticky', top: 0, zIndex: 1, fontWeight: '600',
    cursor: 'pointer', userSelect: 'none'
  }
  const tdStyle = { padding: '6px 8px', fontSize: '11px', whiteSpace: 'nowrap', borderBottom: '1px solid #f0f0f0' }
  const col = (key) => colsVisibles[key]

  return (
    <div style={{ background: 'white', minHeight: '100vh' }} onClick={() => setShowCols(false)}>
      {/* Header */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid #e0e0e0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ color: '#1a2235', margin: 0, fontSize: '18px' }}>📂 Importar MOV TENTATIVO</h2>
            <p style={{ color: '#888', margin: '2px 0 0', fontSize: '12px' }}>Genera el DataCargaM cruzando con la BD de tripulantes</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {mensaje && <span style={{ color: mensaje.includes('Error') ? '#e53935' : '#2e7d32', fontWeight: 'bold', fontSize: '12px', maxWidth: '280px' }}>{mensaje}</span>}
            <label style={{ padding: '7px 16px', background: '#00b4d8', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display: 'inline-block', fontSize: '13px' }}>
              {cargando ? 'Procesando...' : '📁 Cargar Tentativo'}
              <input ref={fileInputRef} type="file" accept=".xlsx,.xlsm,.xls" onChange={handleArchivo} style={{ display: 'none' }} />
            </label>
            {datos.length > 0 && (
              <>
                <button onClick={handleAgrupar} disabled={agrupando} style={{ padding: '7px 16px', background: agrupando ? '#aaa' : '#00cc88', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: agrupando ? 'not-allowed' : 'pointer' }}>
                  {agrupando ? 'Agrupando...' : '⚡ Ejecutar Agrupamiento'}
                </button>
                {tieneGrupos && (
                  <button onClick={() => { localStorage.setItem('mapaData', JSON.stringify(datos)); window.open('/mapa', '_blank') }} style={{ padding: '7px 16px', background: 'white', border: '1px solid #1565c0', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', color: '#1565c0' }}>
                    🗺️ Ver Mapa
                  </button>
                )}
                {tieneGrupos && (
                  <button onClick={exportarExcel} style={{ padding: '7px 16px', background: 'white', border: '1px solid #2e7d32', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', color: '#2e7d32' }}>
                    📥 Exportar Excel
                  </button>
                )}
                {filtrosActivos && (
                  <button onClick={() => setFiltros({})} style={{ padding: '7px 16px', background: 'white', border: '1px solid #f57f17', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', color: '#f57f17' }}>
                    ↺ Limpiar filtros
                  </button>
                )}
                <button onClick={limpiarDatos} style={{ padding: '7px 16px', background: 'white', border: '1px solid #e53935', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', color: '#e53935' }}>
                  🗑️ Limpiar
                </button>
                <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowCols(!showCols)} style={{ padding: '7px 16px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', color: '#555' }}>
                    ⚙️ Columnas
                  </button>
                  {showCols && (
                    <div style={{ position: 'absolute', right: 0, top: '36px', background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: '12px', width: '200px', maxHeight: '400px', overflowY: 'auto' }}>
                      <div style={{ fontWeight: '700', color: '#333', fontSize: '12px', marginBottom: '10px' }}>Mostrar columnas</div>
                      {COLUMNAS.map(c => (
                        <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer', fontSize: '12px', color: '#444' }}>
                          <input type="checkbox" checked={colsVisibles[c.key]} onChange={() => toggleCol(c.key)} />
                          {c.label}
                        </label>
                      ))}
                      <div style={{ borderTop: '1px solid #eee', marginTop: '10px', paddingTop: '8px', display: 'flex', gap: '8px' }}>
                        <button onClick={() => { const v = {}; COLUMNAS.forEach(c => { v[c.key] = true }); localStorage.setItem('colsVisibles', JSON.stringify(v)); setColsVisibles(v) }} style={{ fontSize: '11px', padding: '3px 8px', cursor: 'pointer', border: '1px solid #ddd', borderRadius: '4px', background: 'white' }}>Todas</button>
                        <button onClick={() => { const v = {}; COLUMNAS.forEach(c => { v[c.key] = c.default }); localStorage.setItem('colsVisibles', JSON.stringify(v)); setColsVisibles(v) }} style={{ fontSize: '11px', padding: '3px 8px', cursor: 'pointer', border: '1px solid #ddd', borderRadius: '4px', background: 'white' }}>Default</button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {datos.length > 0 && (
        <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
          {[
            { label: 'Total', valor: totalFilas, color: '#333' },
            { label: 'Entradas (E)', valor: entradas, color: '#2e7d32' },
            { label: 'Salidas (S)', valor: salidas, color: '#1565c0' },
            { label: 'Sin BD', valor: sinBD, color: sinBD > 0 ? '#c62828' : '#2e7d32' },
            { label: 'Sin Corredor', valor: sinCorredor, color: sinCorredor > 0 ? '#e65100' : '#2e7d32' },
            { label: 'Filtrados', valor: datosMostrados.length, color: filtrosActivos ? '#f57f17' : '#333' },
          ].map(stat => (
            <div key={stat.label} style={{ padding: '10px 24px', textAlign: 'center', borderRight: '1px solid #e0e0e0', background: 'white' }}>
              <div style={{ fontSize: '20px', color: stat.color, fontWeight: 'bold' }}>{stat.valor}</div>
              <div style={{ color: '#888', fontSize: '11px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Resumen Agrupamiento */}
      {resumenData && (
        <div style={{ padding: '10px 24px', background: '#f8faff', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ResumenAgrupamiento resumen={resumenData} />
        </div>
      )}

      {/* Tabla */}
      {datos.length > 0 ? (
        <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 150px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {col('act') && <th style={thStyle}>Act.</th>}
                {col('dni') && <th style={thStyle}><ColHeader label="DNI" colKey="dni" datos={datos} filtros={filtros} setFiltros={setFiltros} /></th>}
                {col('num') && <th style={thStyle}>#</th>}
                {col('fecha') && <th style={thStyle}>FECHA</th>}
                {col('es') && <th style={thStyle}><ColHeader label="E/S" colKey="es" datos={datos} filtros={filtros} setFiltros={setFiltros} /></th>}
                {col('serv') && <th style={thStyle}>SERV</th>}
                {col('hreal') && <th style={thStyle}>H.REAL</th>}
                {col('pax') && <th style={thStyle}>PAX</th>}
                {col('prov') && <th style={thStyle}><ColHeader label="PROV." colKey="prov" datos={datos} filtros={filtros} setFiltros={setFiltros} /></th>}
                {col('vuelo') && <th style={thStyle}><ColHeader label="VUELO" colKey="vuelo" datos={datos} filtros={filtros} setFiltros={setFiltros} /></th>}
                {col('hato') && <th style={thStyle}><ColHeader label="H.ATO" colKey="hato" datos={datos} filtros={filtros} setFiltros={setFiltros} /></th>}
                {col('hrec') && <th style={thStyle}>H.REC.</th>}
                {col('trasld') && <th style={thStyle}>TRASLD</th>}
                {col('cat') && <th style={thStyle}><ColHeader label="CAT." colKey="cat" datos={datos} filtros={filtros} setFiltros={setFiltros} /></th>}
                {col('nombres') && <th style={thStyle}>NOMBRES</th>}
                {col('area') && <th style={thStyle}>ÁREA</th>}
                {col('dir') && <th style={thStyle}>DIRECCION</th>}
                {col('dist') && <th style={{...thStyle, textAlign: 'center'}}><ColHeader label="DISTRITO" colKey="dist" datos={datos} filtros={filtros} setFiltros={setFiltros} /></th>}
                {col('tel') && <th style={thStyle}>TELÉFONO</th>}
                {col('estado') && <th style={thStyle}>ESTADO</th>}
                {col('com') && <th style={thStyle}>COM.</th>}
                {col('lat') && <th style={thStyle}>LAT.</th>}
                {col('lng') && <th style={thStyle}>LONG.</th>}
                {col('grupo') && <th style={thStyle}><ColHeader label="GRUPO" colKey="grupo" datos={datos} filtros={filtros} setFiltros={setFiltros} /></th>}
                {col('orden') && <th style={thStyle}>ORDEN</th>}
                {col('corredor') && <th style={thStyle}><ColHeader label="CORREDOR" colKey="corredor" datos={datos} filtros={filtros} setFiltros={setFiltros} /></th>}
                {col('bd') && <th style={thStyle}>BD</th>}
              </tr>
            </thead>
            <tbody>
              {datosMostrados.map((d, idx) => (
                <tr key={d.uid} style={{ opacity: d.activo ? 1 : 0.4, background: !d.enBD ? '#fff5f5' : d.col25_corredor === 'SIN CORREDOR' ? '#fffde7' : idx % 2 === 0 ? 'white' : '#fafafa' }}>
                  {col('act') && <td style={tdStyle}><input type="checkbox" checked={d.activo} onChange={() => toggleActivo(d.uid)} /></td>}
                  {col('dni') && <td style={{...tdStyle, color: '#555'}}>{d.col1_dni}</td>}
                  {col('num') && <td style={{...tdStyle, color: '#aaa'}}>{d.col2_num}</td>}
                  {col('fecha') && <td style={{...tdStyle, color: '#555'}}>{d.col3_fecha}</td>}
                  {col('es') && <td style={tdStyle}><span style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', background: d.col4_es === 'E' ? '#e8f5e9' : '#e3f2fd', color: d.col4_es === 'E' ? '#2e7d32' : '#1565c0' }}>{d.col4_es}</span></td>}
                  {col('serv') && <td style={{...tdStyle, color: '#aaa'}}>{d.col5_serv}</td>}
                  {col('hreal') && <td style={{...tdStyle, color: '#555'}}>{d.col6_hreal}</td>}
                  {col('pax') && <td style={{...tdStyle, color: '#333', fontWeight: '600', textAlign: 'center'}}>{d.col7_pax}</td>}
                  {col('prov') && <td style={{...tdStyle, color: '#555'}}>{d.col8_prov}</td>}
                  {col('vuelo') && <td style={{...tdStyle, color: '#333', fontWeight: '600'}}>{d.col9_vuelo}</td>}
                  {col('hato') && <td style={{...tdStyle, color: '#333', fontWeight: '600'}}>{d.col10_hato}</td>}
                  {col('hrec') && <td style={{...tdStyle, color: '#aaa'}}>{d.col11_hrec}</td>}
                  {col('trasld') && <td style={{...tdStyle, color: '#aaa'}}>{d.col12_traslado}</td>}
                  {col('cat') && <td style={tdStyle}><span style={{ padding: '1px 6px', borderRadius: '4px', background: '#e3f2fd', color: '#1565c0', fontSize: '11px' }}>{d.col13_cat}</span></td>}
                  {col('nombres') && <td style={{...tdStyle, color: '#333', fontWeight: '500'}}>{d.col14_nombres}</td>}
                  {col('area') && <td style={{...tdStyle, color: '#888'}}>{d.col15_area}</td>}
                  {col('dir') && <td style={{...tdStyle, color: '#888', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis'}}>{d.col16_dir}</td>}
                  {col('dist') && <td style={{...tdStyle, color: '#888', textAlign: 'center'}}>{d.col17_dist}</td>}
                  {col('tel') && <td style={{...tdStyle, color: '#888'}}>{d.col18_tel}</td>}
                  {col('estado') && <td style={{...tdStyle, color: '#2e7d32'}}>{d.col19_estado}</td>}
                  {col('com') && <td style={{...tdStyle, color: '#aaa'}}>{d.col20_com}</td>}
                  {col('lat') && <td style={{...tdStyle, color: '#aaa', fontSize: '10px'}}>{d.col21_lat}</td>}
                  {col('lng') && <td style={{...tdStyle, color: '#aaa', fontSize: '10px'}}>{d.col22_lng}</td>}
                  {col('grupo') && <td style={{ ...tdStyle, fontWeight: '700', color: d.col23_grupo ? (d.col4_es === 'E' ? '#2e7d32' : '#1565c0') : '#aaa', background: d.col23_grupo ? (d.col4_es === 'E' ? '#e8f5e9' : '#e3f2fd') : 'transparent' }}>{d.col23_grupo}</td>}
                  {col('orden') && <td style={{...tdStyle, color: '#333', fontWeight: '700', textAlign: 'center'}}>{d.col24_orden}</td>}
                  {col('corredor') && <td style={tdStyle}><input value={d.col25_corredor} onChange={e => editarCorredor(d.uid, e.target.value)} style={{ background: d.col25_corredor === 'SIN CORREDOR' ? '#fff8e1' : '#f5f5f5', border: `1px solid ${d.col25_corredor === 'SIN CORREDOR' ? '#ffa000' : '#ddd'}`, borderRadius: '4px', color: '#333', padding: '2px 6px', fontSize: '11px', width: '120px' }} /></td>}
                  {col('bd') && <td style={{...tdStyle, textAlign: 'center'}}>{d.enBD ? <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>✓</span> : <span style={{ color: '#c62828', fontWeight: 'bold' }}>✗</span>}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '80px 24px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
          <p style={{ color: '#888', fontSize: '16px', marginBottom: '8px' }}>No hay datos cargados</p>
          <p style={{ color: '#bbb', fontSize: '13px' }}>Usa el botón "Cargar Tentativo" para importar el archivo MOV TENTATIVO</p>
        </div>
      )}
    </div>
  )
}

export default Carga
