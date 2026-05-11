import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

const MAX_TIEMPO = 90

function getFranja(hora) {
  if (!hora || !hora.includes(':')) return 'Valle'
  const h = parseInt(hora.split(':')[0])
  if (h < 6)  return 'Valle'
  if (h < 9)  return 'Punta AM'
  if (h < 13) return 'Intermedio bajo'
  if (h < 16) return 'Intermedio alto'
  return 'Punta PM'
}

function getDiaNombre(fechaStr) {
  try {
    const [d,m,y] = fechaStr.split('/').map(Number)
    const dt = new Date(y, m-1, d)
    return ['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo'][(dt.getDay()+6)%7]
  } catch { return 'Lunes' }
}

function getGrupoDia(fechaStr) {
  try {
    const [d,m,y] = fechaStr.split('/').map(Number)
    const dt = new Date(y, m-1, d)
    const wd = (dt.getDay()+6)%7
    if (wd===0) return 'LUN'
    if (wd<=3)  return 'MAR-JUE'
    if (wd===4) return 'VIE'
    if (wd===5) return 'SAB'
    return 'DOM'
  } catch { return 'MAR-JUE' }
}

function serialToHora(v) {
  if (!v) return ''
  if (typeof v === 'string' && v.includes(':')) return v.slice(0,5)
  const n = parseFloat(v)
  if (n <= 0) return ''
  const fraccion = n % 1
  const totalMin = Math.round(fraccion * 1440)
  return `${String(Math.floor(totalMin/60)).padStart(2,'0')}:${String(totalMin%60).padStart(2,'0')}`
}

function serialToMins(v) {
  const n = parseFloat(String(v||''))
  return n > 0 ? n * 1440 : 0
}

function extraerDNIs(obs) {
  if (!obs) return []
  let txt = String(obs)
  txt = txt.replace(/-space-/g,' ').replace(/\r?\n/g,' ').replace(/\//g,' ')
  const cortes = ['-->','idorder','monto']
  for (const c of cortes) {
    const idx = txt.toLowerCase().indexOf(c)
    if (idx > 0) txt = txt.slice(0, idx)
  }
  const dnis = []
  let pos = 0
  while (pos < txt.length && dnis.length < 4) {
    const ch = txt[pos]
    if (ch >= '0' && ch <= '9') {
      let numStr = '', p2 = pos
      while (p2 < txt.length && txt[p2] >= '0' && txt[p2] <= '9') { numStr += txt[p2]; p2++ }
      if (numStr.length >= 6 && numStr.length <= 8) {
        let p3 = p2
        while (p3 < txt.length && txt[p3] === ' ') p3++
        if (p3 < txt.length && (txt[p3] === '-' || txt[p3] === '–' || txt.charCodeAt(p3) === 8211)) {
          p3++
          while (p3 < txt.length && txt[p3] === ' ') p3++
          if (p3 < txt.length && /[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/.test(txt[p3])) dnis.push(numStr)
        }
      }
      pos = p2
    } else { pos++ }
  }
  return dnis
}

function extraerVuelo(ato) {
  if (!ato) return ''
  const parts = String(ato).trim().split(' ')
  return parts[parts.length-1].trim()
}

function entradaSalida(zona) {
  const z = (zona||'').toUpperCase().trim()
  return ['JETSMART NUEVO AERO','LATAM CORPAC','NUEVO AEROPUERTO',
          'NUEVO AEROPUERTO - ORIGEN AERO LATAM','NUEVO AEROPUERTO - ORIGEN AEROLINEAS'].includes(z) ? 'S' : 'E'
}

function HistoricoETA() {
  const fileInputRef = useRef(null)
  const [stats, setStats] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [progreso, setProgreso] = useState('')

  const fetchStats = async () => {
    const [{ count: cntHist }, { count: cntN0A }, { count: cntN0B }, { count: cntTT }] = await Promise.all([
      supabase.from('historico').select('*', { count: 'exact', head: true }),
      supabase.from('eta_n0a').select('*', { count: 'exact', head: true }),
      supabase.from('eta_n0b').select('*', { count: 'exact', head: true }),
      supabase.from('eta_tomtom').select('*', { count: 'exact', head: true }),
    ])
    const { data: fechas } = await supabase.from('historico')
      .select('fecha').order('fecha', { ascending: true }).limit(1)
    const { data: fechasMax } = await supabase.from('historico')
      .select('fecha').order('fecha', { ascending: false }).limit(1)
    setStats({
      historico: cntHist || 0,
      n0a: cntN0A || 0,
      n0b: cntN0B || 0,
      tomtom: cntTT || 0,
      fechaMin: fechas?.[0]?.fecha || '—',
      fechaMax: fechasMax?.[0]?.fecha || '—',
    })
  }

  useEffect(() => { fetchStats() }, [])

  const procesarArchivo = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (fileInputRef.current) fileInputRef.current.value = ''
    setCargando(true)
    setMensaje('')
    setProgreso('Leyendo archivo...')

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary', cellDates: false })

        // Buscar hoja correcta
        let wsNombre = wb.SheetNames[0]
        for (const n of wb.SheetNames) {
          if (['hist','servic','repor'].some(k => n.toLowerCase().includes(k))) { wsNombre = n; break }
        }
        const ws = wb.Sheets[wsNombre]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        // Buscar header
        let hdrRow = -1
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          if (rows[i].includes('FechaServicio') || rows[i].includes('Reserva')) { hdrRow = i; break }
        }
        if (hdrRow < 0) { setMensaje('❌ No se encontró el header del archivo'); setCargando(false); return }

        const headers = rows[hdrRow].map(h => String(h).trim())
        const col = (name) => headers.indexOf(name)

        const iFecha = col('FechaServicio'), iCond = col('IdConductor')
        const iZona = col('ZonaOrigenDescripcion'), iHora = col('ServicioHora')
        const iAto = col('ATO_VUELO'), iReserva = col('Reserva')
        const iTipo = col('TipoServicio'), iObs = col('Observacion')

        // Cargar reservas existentes
        setProgreso('Verificando duplicados...')
        const { data: existData } = await supabase.from('historico').select('id_servicio')
        const existentes = new Set((existData||[]).map(r => r.id_servicio))

        // Cargar tripulantes
        setProgreso('Cargando tripulantes...')
        const { data: tripData } = await supabase.from('tripulantes').select('dni,nombre,lat,lng,zona_distrito,cargo')
        const tripMap = {}
        ;(tripData||[]).forEach(t => { tripMap[t.dni] = t })

        const filasHistorico = []
        const dicN0A = {}, dicN0B = {}
        let cntNuevos = 0, cntDupl = 0, cntSinDNI = 0

        const acum = (dic, k, val) => {
          if (val < 3 || val > MAX_TIEMPO) return
          if (!dic[k]) dic[k] = []
          dic[k].push(Math.round(val * 10) / 10)
        }

        for (let fi = hdrRow + 1; fi < rows.length; fi++) {
          const r = rows[fi]
          if (!r[iReserva] && !r[iFecha]) continue
          const conductor = String(r[iCond]||'').trim()
          if (['5','6','0005','0006'].includes(conductor)) continue
          const reserva = String(r[iReserva]||'').trim()
          if (!reserva) continue
          if (existentes.has(reserva)) { cntDupl++; continue }
          existentes.add(reserva)

          const fecha = String(r[iFecha]||'').trim()
          const hora  = String(r[iHora]||'').trim()
          const zona  = String(r[iZona]||'').trim()
          const ato   = String(r[iAto]||'').trim()
          const tipo  = String(r[iTipo]||'').trim()
          const obs   = String(r[iObs]||'').trim()
          if (!fecha || !hora) continue

          const es     = entradaSalida(zona)
          const vuelo  = extraerVuelo(ato)
          const franja = getFranja(hora)
          const diaNom = getDiaNombre(fecha)
          const grupoD = getGrupoDia(fecha)
          const dnis   = extraerDNIs(obs)
          if (dnis.length === 0) cntSinDNI++

          // Paradas y tiempos
          const paradas = []
          for (let ip = 1; ip <= 6; ip++) {
            const iZD = col(`ZonaDestinoDescripcion_${ip}`)
            const iFI = col(`FechaInicio_${ip}`)
            const iFT = col(`FechaTermino_${ip}`)
            const iFL = col(`FechaLlegada_${ip}`)
            paradas.push({
              zona_dest: iZD >= 0 ? String(r[iZD]||'').trim() : '',
              mFI: iFI >= 0 && r[iFI] ? serialToMins(r[iFI]) : 0,
              mFT: iFT >= 0 && r[iFT] ? serialToMins(r[iFT]) : 0,
              mFL: iFL >= 0 && r[iFL] ? serialToMins(r[iFL]) : 0,
            })
          }

          const tMin = [0,0,0,0,0,0]
          const nParadas = paradas.filter(p => p.zona_dest && p.mFL > 0).length
          if (nParadas >= 1) {
            if (es === 'E') {
              for (let ip = 0; ip < nParadas - 1; ip++) {
                if (paradas[ip].mFI > 0 && paradas[ip+1].mFL > 0) {
                  const t = paradas[ip+1].mFL - paradas[ip].mFI
                  if (t > 0 && t < MAX_TIEMPO) tMin[ip] = Math.round((t+3)*10)/10
                }
              }
              const last = nParadas - 1
              if (paradas[last].mFI > 0 && paradas[last].mFT > 0) {
                const t = paradas[last].mFT - paradas[last].mFI
                if (t > 0 && t < MAX_TIEMPO) tMin[last] = Math.round(t*10)/10
              }
            } else {
              for (let ip = 0; ip < nParadas; ip++) {
                if (paradas[ip].mFI > 0 && paradas[ip].mFT > 0) {
                  const t = paradas[ip].mFT - paradas[ip].mFI
                  if (t > 0 && t < MAX_TIEMPO) tMin[ip] = Math.round(t*10)/10
                }
              }
            }
          }

          filasHistorico.push({
            id_servicio: reserva, fecha, hora_inicio: hora,
            hora_fin: '', tiempo_total_min: 0, cant_usuarios: dnis.length,
            entrada_salida: es,
            dni_1: dnis[0]||null, nombre_1: dnis[0] ? (tripMap[dnis[0]]?.nombre||null) : null,
            cargo_1: dnis[0] ? (tripMap[dnis[0]]?.cargo||null) : null,
            zona_1: paradas[0]?.zona_dest||null,
            lat_1: dnis[0] && tripMap[dnis[0]]?.lat ? parseFloat(tripMap[dnis[0]].lat) : null,
            lon_1: dnis[0] && tripMap[dnis[0]]?.lng ? parseFloat(tripMap[dnis[0]].lng) : null,
            dni_2: dnis[1]||null, nombre_2: dnis[1] ? (tripMap[dnis[1]]?.nombre||null) : null,
            cargo_2: dnis[1] ? (tripMap[dnis[1]]?.cargo||null) : null,
            zona_2: paradas[1]?.zona_dest||null,
            lat_2: dnis[1] && tripMap[dnis[1]]?.lat ? parseFloat(tripMap[dnis[1]].lat) : null,
            lon_2: dnis[1] && tripMap[dnis[1]]?.lng ? parseFloat(tripMap[dnis[1]].lng) : null,
            dni_3: dnis[2]||null, nombre_3: dnis[2] ? (tripMap[dnis[2]]?.nombre||null) : null,
            cargo_3: dnis[2] ? (tripMap[dnis[2]]?.cargo||null) : null,
            zona_3: paradas[2]?.zona_dest||null,
            lat_3: dnis[2] && tripMap[dnis[2]]?.lat ? parseFloat(tripMap[dnis[2]].lat) : null,
            lon_3: dnis[2] && tripMap[dnis[2]]?.lng ? parseFloat(tripMap[dnis[2]].lng) : null,
            dni_4: dnis[3]||null, nombre_4: dnis[3] ? (tripMap[dnis[3]]?.nombre||null) : null,
            cargo_4: dnis[3] ? (tripMap[dnis[3]]?.cargo||null) : null,
            zona_4: paradas[3]?.zona_dest||null,
            lat_4: dnis[3] && tripMap[dnis[3]]?.lat ? parseFloat(tripMap[dnis[3]].lat) : null,
            lon_4: dnis[3] && tripMap[dnis[3]]?.lng ? parseFloat(tripMap[dnis[3]].lng) : null,
            zona_origen: zona, tipo_servicio: tipo, vuelo, franja_horaria: franja,
            parada_1: paradas[0]?.zona_dest||null, t_min_parada_1: tMin[0]||null,
            parada_2: paradas[1]?.zona_dest||null, t_min_parada_2: tMin[1]||null,
            parada_3: paradas[2]?.zona_dest||null, t_min_parada_3: tMin[2]||null,
            parada_4: paradas[3]?.zona_dest||null, t_min_parada_4: tMin[3]||null,
            parada_5: paradas[4]?.zona_dest||null, t_min_parada_5: tMin[4]||null,
            parada_6: paradas[5]?.zona_dest||null, t_min_parada_6: tMin[5]||null,
            observacion: obs.slice(0,500),
          })
          cntNuevos++

          // Acumular pares ETA
          if (dnis.length >= 1) {
            if (es === 'E') {
              if (dnis.length === 1 && tMin[0] > 0) {
                acum(dicN0A, `${dnis[0]}|AEROPUERTO|${diaNom}|${franja}|E`, tMin[0])
                acum(dicN0B, `${dnis[0]}|AEROPUERTO|${grupoD}|${franja}|E`, tMin[0])
              } else {
                for (let i = 0; i < dnis.length-1; i++) {
                  if (tMin[i] > 0) {
                    acum(dicN0A, `${dnis[i]}|${dnis[i+1]}|${diaNom}|${franja}|E`, tMin[i])
                    acum(dicN0B, `${dnis[i]}|${dnis[i+1]}|${grupoD}|${franja}|E`, tMin[i])
                  }
                }
                const last = dnis.length-1
                if (tMin[last] > 0) {
                  acum(dicN0A, `${dnis[last]}|AEROPUERTO|${diaNom}|${franja}|E`, tMin[last])
                  acum(dicN0B, `${dnis[last]}|AEROPUERTO|${grupoD}|${franja}|E`, tMin[last])
                }
              }
            } else {
              if (tMin[0] > 0) {
                acum(dicN0A, `AEROPUERTO|${dnis[0]}|${diaNom}|${franja}|S`, tMin[0])
                acum(dicN0B, `AEROPUERTO|${dnis[0]}|${grupoD}|${franja}|S`, tMin[0])
              }
              for (let i = 1; i < dnis.length; i++) {
                if (tMin[i] > 0) {
                  acum(dicN0A, `${dnis[i-1]}|${dnis[i]}|${diaNom}|${franja}|S`, tMin[i])
                  acum(dicN0B, `${dnis[i-1]}|${dnis[i]}|${grupoD}|${franja}|S`, tMin[i])
                }
              }
            }
          }

          if (fi % 100 === 0) setProgreso(`Procesando fila ${fi}/${rows.length}...`)
        }

        if (cntNuevos === 0) {
          setMensaje(`⚠️ No hay registros nuevos. ${cntDupl} duplicados encontrados.`)
          setCargando(false); return
        }

        // Guardar histórico
        setProgreso(`Guardando ${cntNuevos} servicios...`)
        const BATCH = 500
        for (let i = 0; i < filasHistorico.length; i += BATCH) {
          const lote = filasHistorico.slice(i, i+BATCH)
          await supabase.from('historico').upsert(lote, { onConflict: 'id_servicio' })
          setProgreso(`Guardando historico... ${Math.min(i+BATCH, filasHistorico.length)}/${filasHistorico.length}`)
        }

        // Actualizar N0A
        if (Object.keys(dicN0A).length > 0) {
          setProgreso('Actualizando ETA N0A...')
          const { data: n0aExist } = await supabase.from('eta_n0a').select('dni_de,dni_a,dia,franja,es,minutos,n_reg')
          const n0aMap = {}
          ;(n0aExist||[]).forEach(r => {
            const k = `${r.dni_de}|${r.dni_a}|${r.dia}|${r.franja}|${r.es}`
            n0aMap[k] = (r.minutos||'').split(';').map(v => parseFloat(v)).filter(v => !isNaN(v))
          })
          Object.entries(dicN0A).forEach(([k,vals]) => {
            if (!n0aMap[k]) n0aMap[k] = []
            n0aMap[k] = [...n0aMap[k], ...vals]
          })
          const filasN0A = Object.entries(n0aMap).map(([k,vals]) => {
            const p = k.split('|')
            return { dni_de:p[0], dni_a:p[1], dia:p[2], franja:p[3], es:p[4], minutos:vals.join(';'), n_reg:vals.length }
          })
          for (let i = 0; i < filasN0A.length; i += BATCH) {
            await supabase.from('eta_n0a').upsert(filasN0A.slice(i,i+BATCH), { onConflict:'dni_de,dni_a,dia,franja,es' })
            setProgreso(`Actualizando N0A... ${Math.min(i+BATCH,filasN0A.length)}/${filasN0A.length}`)
          }
        }

        // Actualizar N0B
        if (Object.keys(dicN0B).length > 0) {
          setProgreso('Actualizando ETA N0B...')
          const { data: n0bExist } = await supabase.from('eta_n0b').select('dni_de,dni_a,grupo_dia,franja,es,minutos')
          const n0bMap = {}
          ;(n0bExist||[]).forEach(r => {
            const k = `${r.dni_de}|${r.dni_a}|${r.grupo_dia}|${r.franja}|${r.es}`
            n0bMap[k] = (r.minutos||'').split(';').map(v => parseFloat(v)).filter(v => !isNaN(v))
          })
          Object.entries(dicN0B).forEach(([k,vals]) => {
            if (!n0bMap[k]) n0bMap[k] = []
            n0bMap[k] = [...n0bMap[k], ...vals]
          })
          const filasN0B = Object.entries(n0bMap).map(([k,vals]) => {
            const p = k.split('|')
            return { dni_de:p[0], dni_a:p[1], grupo_dia:p[2], franja:p[3], es:p[4], minutos:vals.join(';'), n_reg:vals.length }
          })
          for (let i = 0; i < filasN0B.length; i += BATCH) {
            await supabase.from('eta_n0b').upsert(filasN0B.slice(i,i+BATCH), { onConflict:'dni_de,dni_a,grupo_dia,franja,es' })
            setProgreso(`Actualizando N0B... ${Math.min(i+BATCH,filasN0B.length)}/${filasN0B.length}`)
          }
        }

        setMensaje(`✅ ${cntNuevos} servicios nuevos | ${cntDupl} duplicados omitidos | ${cntSinDNI} sin DNI`)
        setProgreso('')
        fetchStats()
      } catch (err) {
        setMensaje('❌ Error: ' + err.message)
        setProgreso('')
      }
      setCargando(false)
    }
    reader.readAsBinaryString(file)
  }

  return (
    <div style={{ background: 'white', minHeight: '100vh' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ color: '#1a2235', margin: 0, fontSize: '18px' }}>📋 Histórico ETA</h2>
          <p style={{ color: '#888', margin: '2px 0 0', fontSize: '12px' }}>Carga el reporte de GeoVictoria para actualizar el historial y las tablas ETA</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {progreso && <span style={{ color: '#1565c0', fontSize: '12px', fontWeight: 600 }}>{progreso}</span>}
          {mensaje && <span style={{ color: mensaje.includes('❌') ? '#c62828' : mensaje.includes('⚠️') ? '#e65100' : '#2e7d32', fontSize: '12px', fontWeight: 600, maxWidth: 400 }}>{mensaje}</span>}
          <label style={{ padding: '8px 20px', background: cargando ? '#aaa' : '#00b4d8', color: 'white', borderRadius: '6px', cursor: cargando ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '13px' }}>
            {cargando ? '⏳ Procesando...' : '📤 Cargar Histórico GeoVictoria'}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={procesarArchivo} disabled={cargando} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {[
            { label: 'Servicios en Histórico', valor: stats.historico.toLocaleString(), color: '#1565c0', icon: '📦' },
            { label: 'Pares ETA N0A', valor: stats.n0a.toLocaleString(), color: '#2e7d32', icon: '🎯' },
            { label: 'Pares ETA N0B', valor: stats.n0b.toLocaleString(), color: '#558b2f', icon: '📊' },
            { label: 'Caché TomTom', valor: stats.tomtom.toLocaleString(), color: '#e65100', icon: '🗺️' },
          ].map(s => (
            <div key={s.label} style={{ border: '1px solid #e0e0e0', borderRadius: 10, padding: '20px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.valor}</div>
              <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}

          <div style={{ gridColumn: '1/-1', border: '1px solid #e0e0e0', borderRadius: 10, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 32 }}>
            <div>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>FECHA MÁS ANTIGUA</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>{stats.fechaMin}</div>
            </div>
            <div style={{ width: 1, height: 40, background: '#e0e0e0' }} />
            <div>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>FECHA MÁS RECIENTE</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>{stats.fechaMax}</div>
            </div>
            <div style={{ marginLeft: 'auto', background: '#e8f5e9', color: '#2e7d32', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
              ✅ Base histórica activa
            </div>
          </div>
        </div>
      )}

      {/* Instrucciones */}
      <div style={{ padding: '0 24px 24px' }}>
        <div style={{ border: '1px solid #e3f2fd', borderRadius: 10, padding: '20px 24px', background: '#f8fbff' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#1565c0' }}>📌 Instrucciones de carga</h3>
          <ol style={{ margin: 0, paddingLeft: 20, color: '#555', fontSize: 13, lineHeight: 2 }}>
            <li>Descarga el reporte de <strong>GeoVictoria</strong> en formato Excel (.xlsx)</li>
            <li>Asegúrate que el reporte incluya las columnas: <code>FechaServicio, Reserva, Observacion, ZonaDestinoDescripcion_1..6, FechaInicio/Termino_1..6</code></li>
            <li>Haz clic en <strong>"Cargar Histórico GeoVictoria"</strong> y selecciona el archivo</li>
            <li>El sistema procesará automáticamente y actualizará las tablas ETA</li>
            <li>Los registros duplicados (misma Reserva) se omiten automáticamente</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default HistoricoETA