// ================================================================
//  JetSmart — Motor ETA v4 (migrado de VBA)
//  src/lib/motorETA.js
// ================================================================

import { supabase } from './supabase'

const AERO_LAT = -12.0305437703201
const AERO_LON = -77.1154495061003
const TOMTOM_KEY = 'yFNyJSy0Zx0pTNL68jtxBN7ugOfWpRz0'

// ── Helpers de tiempo ─────────────────────────────────────────────────────────
const horaAMin = (h) => {
  if (!h || !String(h).includes(':')) return 0
  const [hh, mm] = String(h).split(':').map(Number)
  return hh * 60 + mm
}

const minAHora = (mins) => {
  let m = ((mins % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

const sumarMin = (hora, mins) => minAHora(horaAMin(hora) + Math.round(mins))
const restarMin = (hora, mins) => minAHora(horaAMin(hora) - Math.round(mins))

// ── Franja horaria ────────────────────────────────────────────────────────────
export const getFranja = (hora) => {
  const h = parseInt((hora || '00:00').split(':')[0])
  if (h >= 0  && h < 6)  return 'Valle'
  if (h >= 6  && h < 9)  return 'Punta AM'
  if (h >= 9  && h < 13) return 'Intermedio bajo'
  if (h >= 13 && h < 16) return 'Intermedio alto'
  return 'Punta PM'
}

// ── Grupo día ─────────────────────────────────────────────────────────────────
export const getGrupoDia = (fechaStr) => {
  // fechaStr formato DD/MM/YYYY
  try {
    const [d, m, y] = fechaStr.split('/').map(Number)
    const fecha = new Date(y, m - 1, d)
    const wd = fecha.getDay() // 0=Dom, 1=Lun...6=Sab
    if (wd === 1) return 'LUN'
    if (wd >= 2 && wd <= 4) return 'MAR-JUE'
    if (wd === 5) return 'VIE'
    if (wd === 6) return 'SAB'
    return 'DOM'
  } catch { return 'MAR-JUE' }
}

// ── Día nombre ────────────────────────────────────────────────────────────────
export const getDiaNombre = (fechaStr) => {
  try {
    const [d, m, y] = fechaStr.split('/').map(Number)
    const fecha = new Date(y, m - 1, d)
    return ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'][fecha.getDay()]
  } catch { return 'Lunes' }
}

// ── Haversine ─────────────────────────────────────────────────────────────────
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// ── Es aeropuerto ─────────────────────────────────────────────────────────────
const esAeropuerto = (dni) => {
  const n = (dni || '').toUpperCase().trim()
  return ['AEROPUERTO','JETSMART NUEVO AERO','LATAM CORPAC',
          'NUEVO AEROPUERTO','NUEVO AEROPUERTO - ORIGEN AERO LATAM'].includes(n)
}

// ── Calcular mediana IQR desde string "v1;v2;v3" ──────────────────────────────
const calcMediana = (str) => {
  if (!str) return 0
  if (!str.includes(';')) return parseFloat(str) || 0
  const vals = str.split(';').map(v => parseFloat(v)).filter(v => !isNaN(v)).sort((a,b)=>a-b)
  if (vals.length === 0) return 0
  if (vals.length === 1) return vals[0]
  // IQR para quitar outliers
  const q1 = vals[Math.floor(vals.length * 0.25)]
  const q3 = vals[Math.floor(vals.length * 0.75)]
  const iqr = q3 - q1
  const filtrados = vals.filter(v => v >= q1 - 1.5*iqr && v <= q3 + 1.5*iqr)
  const mid = Math.floor(filtrados.length / 2)
  return filtrados.length % 2 === 0
    ? (filtrados[mid-1] + filtrados[mid]) / 2
    : filtrados[mid]
}

// ── Velocidad calibrada (tabla estática — fallback) ───────────────────────────
const getVelEstatica = (franja, tipoTramo, distKm) => {
  if (distKm < 5) {
    const t = { 'DNI_ATO': {'Valle':7.4,'Punta AM':6.2,'Intermedio bajo':6.2,'Intermedio alto':6.1,'Punta PM':5.9},
                'ATO_DNI': {'Valle':7.4,'Punta AM':6.2,'Intermedio bajo':6.2,'Intermedio alto':6.1,'Punta PM':5.9},
                'DNI_DNI': {'Valle':7.4,'Punta AM':6.2,'Intermedio bajo':6.2,'Intermedio alto':6.1,'Punta PM':5.9} }
    return (t[tipoTramo] || t['DNI_ATO'])[franja] || 6.4
  } else if (distKm < 10) {
    const t = { 'DNI_ATO': {'Valle':11.1,'Punta AM':9.3,'Intermedio bajo':10,'Intermedio alto':10,'Punta PM':9.3},
                'ATO_DNI': {'Valle':11.1,'Punta AM':9.3,'Intermedio bajo':10,'Intermedio alto':10,'Punta PM':9.3},
                'DNI_DNI': {'Valle':11.1,'Punta AM':9.3,'Intermedio bajo':10,'Intermedio alto':10,'Punta PM':9.3} }
    return (t[tipoTramo] || t['DNI_ATO'])[franja] || 9.9
  } else if (distKm < 15) {
    const t = { 'DNI_ATO': {'Valle':15.2,'Punta AM':12.5,'Intermedio bajo':14.2,'Intermedio alto':12.7,'Punta PM':12.6},
                'ATO_DNI': {'Valle':15.2,'Punta AM':12.5,'Intermedio bajo':14.2,'Intermedio alto':12.7,'Punta PM':12.6},
                'DNI_DNI': {'Valle':15.2,'Punta AM':12.5,'Intermedio bajo':14.2,'Intermedio alto':12.7,'Punta PM':12.6} }
    return (t[tipoTramo] || t['DNI_ATO'])[franja] || 13.4
  } else if (distKm < 20) {
    const t = { 'DNI_ATO': {'Valle':19.1,'Punta AM':15.8,'Intermedio bajo':17.9,'Intermedio alto':16.7,'Punta PM':16.4},
                'ATO_DNI': {'Valle':19.1,'Punta AM':15.8,'Intermedio bajo':17.9,'Intermedio alto':16.7,'Punta PM':16.4},
                'DNI_DNI': {'Valle':19.1,'Punta AM':15.8,'Intermedio bajo':17.9,'Intermedio alto':16.7,'Punta PM':16.4} }
    return (t[tipoTramo] || t['DNI_ATO'])[franja] || 17.2
  } else {
    const t = { 'DNI_ATO': {'Valle':22.8,'Punta AM':19.2,'Intermedio bajo':21.3,'Intermedio alto':20.1,'Punta PM':19.8},
                'ATO_DNI': {'Valle':22.8,'Punta AM':19.2,'Intermedio bajo':21.3,'Intermedio alto':20.1,'Punta PM':19.8},
                'DNI_DNI': {'Valle':22.8,'Punta AM':19.2,'Intermedio bajo':21.3,'Intermedio alto':20.1,'Punta PM':19.8} }
    return (t[tipoTramo] || t['DNI_ATO'])[franja] || 20.6
  }
}

// ── N25 Tramo (fallback GPS + velocidad) ──────────────────────────────────────
const n25Tramo = (lat1, lon1, lat2, lon2, franja, tipoTramo) => {
  const dist = haversine(lat1, lon1, lat2, lon2)
  if (dist < 0.3) return 5
  const vel = getVelEstatica(franja, tipoTramo, dist)
  const tDesplaz = (dist / vel) * 60
  if (tipoTramo === 'DNI_ATO') return tDesplaz + 4
  if (tipoTramo === 'ATO_DNI') return tDesplaz + 10
  return tDesplaz + 4
}

// ── TomTom API ────────────────────────────────────────────────────────────────
const franjaHora = { 
  'Valle': '03:00:00', 'Punta AM': '07:30:00',
  'Intermedio bajo': '10:00:00', 'Intermedio alto': '13:00:00', 'Punta PM': '18:00:00'
}
const grupoDiaSemana = { 'LUN':1,'MAR-JUE':2,'VIE':4,'SAB':5,'DOM':0 }

const consultarTomTom = async (lat1, lon1, lat2, lon2, franja, grupoDia) => {
  try {
    const hora = franjaHora[franja] || '12:00:00'
    const diaTarget = grupoDiaSemana[grupoDia] ?? 2
    const hoy = new Date()
    let diff = diaTarget - hoy.getDay()
    if (diff <= 0) diff += 7
    const fecha = new Date(hoy)
    fecha.setDate(hoy.getDate() + diff)
    const departAt = `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}-${String(fecha.getDate()).padStart(2,'0')}T${hora}`
    
    const coords = `${lat1.toFixed(7)},${lon1.toFixed(7)}:${lat2.toFixed(7)},${lon2.toFixed(7)}`
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${coords}/json?key=${TOMTOM_KEY}&departAt=${departAt}&traffic=true&travelMode=car`
    
    const resp = await fetch(url)
    if (!resp.ok) return 0
    const data = await resp.json()
    const secs = data?.routes?.[0]?.summary?.travelTimeInSeconds
    if (!secs) return 0
    return Math.round(secs / 60 * 10) / 10
  } catch { return 0 }
}

// ── Guardar en caché TomTom ───────────────────────────────────────────────────
const guardarTomTom = async (dniDe, dniA, franja, minutos) => {
  await supabase.from('eta_tomtom').upsert({
    dni_de: dniDe, dni_a: dniA, franja,
    minutos, fecha_consulta: new Date().toISOString().slice(0,10)
  }, { onConflict: 'dni_de,dni_a,franja' })
}

// ── Motor principal ───────────────────────────────────────────────────────────
export const calcularETA = async (filas, onProgress) => {
  if (!filas || filas.length === 0) return filas

  onProgress?.('Cargando tablas ETA desde Supabase...')

  // Cargar tablas ETA desde Supabase
  const [{ data: n0aData }, { data: n0bData }, { data: ttData }] = await Promise.all([
    supabase.from('eta_n0a').select('dni_de,dni_a,dia,franja,es,minutos,n_reg'),
    supabase.from('eta_n0b').select('dni_de,dni_a,grupo_dia,franja,es,minutos'),
    supabase.from('eta_tomtom').select('dni_de,dni_a,franja,minutos'),
  ])

  // Cargar coordenadas de tripulantes desde Supabase
  const dnisList = [...new Set(filas.map(f => f.col1_dni).filter(Boolean))]
  const { data: tripData } = await supabase
    .from('tripulantes')
    .select('dni, lat, lng')
    .in('dni', dnisList)

  const coordsMap = {}
  ;(tripData || []).forEach(t => {
    if (t.lat && t.lng) coordsMap[t.dni] = { lat: parseFloat(t.lat), lng: parseFloat(t.lng) }
  })
  coordsMap['AEROPUERTO'] = { lat: AERO_LAT, lng: AERO_LON }

  // Construir diccionarios en memoria (igual que CargarN0A, CargarN0B, CargarTomTom en VBA)
  const dicN0A = {}
  ;(n0aData || []).forEach(r => {
    const k = `${(r.dni_de||'').toUpperCase()}|${(r.dni_a||'').toUpperCase()}|${r.dia}|${r.franja}|${r.es}`
    const med = calcMediana(r.minutos)
    const nReg = r.n_reg || 1
    // Si único registro < 10 min → no confiable, skip
    if (nReg === 1 && med < 10) return
    dicN0A[k] = med
  })

  const dicN0B = {}
  ;(n0bData || []).forEach(r => {
    const k = `${(r.dni_de||'').toUpperCase()}|${(r.dni_a||'').toUpperCase()}|${r.grupo_dia}|${r.franja}|${r.es}`
    dicN0B[k] = calcMediana(r.minutos)
  })

  const dicTomTom = {}
  ;(ttData || []).forEach(r => {
    const k = `${(r.dni_de||'').toUpperCase()}|${(r.dni_a||'').toUpperCase()}|${r.franja}`
    dicTomTom[k] = r.minutos
  })

  // ── Función buscarTramo (replica BuscarTramo VBA) ─────────────────────────
  const buscarTramo = async (dniDe, dniA, franja, diaNombre, grupoDia, es, hSalida) => {
    const franjaUsar = hSalida ? getFranja(hSalida) : franja
    const deDe = (dniDe || '').toUpperCase().trim()
    const deA  = (dniA  || '').toUpperCase().trim()

    // N0A — historial exacto
    const kN0A = `${deDe}|${deA}|${diaNombre}|${franjaUsar}|${es}`
    if (dicN0A[kN0A] !== undefined) return { min: dicN0A[kN0A], nivel: 'N0A' }

    // N0B — historial agrupado
    const kN0B = `${deDe}|${deA}|${grupoDia}|${franjaUsar}|${es}`
    if (dicN0B[kN0B] !== undefined) return { min: dicN0B[kN0B], nivel: 'N0B' }

    // TomTom caché
    const kTT = `${deDe}|${deA}|${franjaUsar}`
    if (dicTomTom[kTT] !== undefined) return { min: dicTomTom[kTT], nivel: 'TomTom' }

    // TomTom API (solo si tenemos coordenadas)
    const c1 = coordsMap[esAeropuerto(dniDe) ? 'AEROPUERTO' : dniDe]
    const c2 = coordsMap[esAeropuerto(dniA)  ? 'AEROPUERTO' : dniA]

    if (c1 && c2) {
      const tTT = await consultarTomTom(c1.lat, c1.lng, c2.lat, c2.lng, franjaUsar, grupoDia)
      if (tTT > 0) {
        dicTomTom[kTT] = tTT
        await guardarTomTom(deDe, deA, franjaUsar, tTT)
        return { min: tTT, nivel: 'TomTom' }
      }
    }

    // N25 — fallback GPS
    if (c1 && c2) {
      const tipoTramo = esAeropuerto(dniDe) ? 'ATO_DNI' : esAeropuerto(dniA) ? 'DNI_ATO' : 'DNI_DNI'
      const tN25 = n25Tramo(c1.lat, c1.lng, c2.lat, c2.lng, franjaUsar, tipoTramo)
      return { min: tN25 > 0 ? tN25 : 15, nivel: 'N25' }
    }

    return { min: 15, nivel: 'N25' }
  }

  // ── Agrupar filas por SERV ────────────────────────────────────────────────
  const servicios = {}
  filas.forEach(f => {
    const serv = f.col5_serv
    if (!serv) return
    if (!servicios[serv]) servicios[serv] = []
    servicios[serv].push(f)
  })

  const resultado = filas.map(f => ({ ...f }))
  const uidMap = {}
  resultado.forEach((f, i) => { uidMap[f.uid] = i })

  let cntTotal = 0, cntN0A = 0, cntN0B = 0, cntTomTom = 0, cntN25 = 0
  const serviciosKeys = Object.keys(servicios)

  for (let si = 0; si < serviciosKeys.length; si++) {
    const serv = serviciosKeys[si]
    const miembros = servicios[serv].sort((a,b) => parseInt(a.col24_orden) - parseInt(b.col24_orden))
    const primera = miembros[0]
    if (!primera) continue

    const es       = primera.col4_es
    const fecha    = primera.col3_fecha
    const hato     = primera.col10_hato
    const diaNombre= getDiaNombre(fecha)
    const grupoDia = getGrupoDia(fecha)
    const franjaBase = getFranja(hato)

    // Obtener DNIs en orden de parada
    const dnis = miembros.map(m => {
      const nombre = m.col14_nombres || ''
      const guion = nombre.indexOf('-')
      const posible = guion > 0 ? nombre.slice(0, guion).trim() : ''
      return (posible && posible.length >= 6 && posible.length <= 8 && /^\d+$/.test(posible))
        ? posible : m.col1_dni
    })

    onProgress?.(`Calculando ETA... ${si+1}/${serviciosKeys.length} servicios`)

    let etaTotal = 0
    let tAcum = 0
    let hSalActual = primera.col6_hreal || '00:00'
    let nivelServ = 'N25'

    if (es === 'E') {
      // E: DNI[0]→DNI[1]→...→AEROPUERTO
      for (let i = 0; i < dnis.length - 1; i++) {
        hSalActual = sumarMin(primera.col6_hreal || '00:00', tAcum)
        const { min, nivel } = await buscarTramo(dnis[i], dnis[i+1], franjaBase, diaNombre, grupoDia, es, hSalActual)
        etaTotal += min; tAcum += min; nivelServ = nivel
      }
      // Último DNI → AEROPUERTO
      hSalActual = sumarMin(primera.col6_hreal || '00:00', tAcum)
      const { min: minFinal, nivel: nFinal } = await buscarTramo(dnis[dnis.length-1], 'AEROPUERTO', franjaBase, diaNombre, grupoDia, es, hSalActual)
      etaTotal += minFinal; nivelServ = nFinal

      // H.REAL = H.ATO - ETA total
      const hReal = restarMin(hato, etaTotal)

      // H.REC. para cada miembro (hora de recojo en orden)
      let hRecAcum = hReal
      miembros.forEach((m, idx) => {
        const i = uidMap[m.uid]
        if (i === undefined) return
        resultado[i].col6_hreal = hReal
        resultado[i].col11_hrec = hRecAcum
        resultado[i]._etaNivel = nivelServ

        if (idx < dnis.length - 1) {
          // Calcular delta al siguiente (ya calculado arriba, aproximar)
          const delta = etaTotal / dnis.length
          hRecAcum = sumarMin(hRecAcum, delta)
        }
      })

    } else {
      // S: AEROPUERTO→DNI[0]→DNI[1]→...
      const hRealBase = hato
      let hRecPrim = ''
      let hRecAnterior = hRealBase
      tAcum = 0

      // Primer tramo: ATO → DNI[0]
      hSalActual = hRealBase
      const { min: minATO, nivel: nATO } = await buscarTramo('AEROPUERTO', dnis[0], franjaBase, diaNombre, grupoDia, es, hSalActual)
      hRecPrim = sumarMin(hRealBase, minATO)
      tAcum = minATO; nivelServ = nATO

      miembros.forEach((m, idx) => {
        const i = uidMap[m.uid]
        if (i === undefined) return
        resultado[i].col6_hreal = hRealBase
        resultado[i]._etaNivel = nivelServ
      })

      // Tramos intermedios: DNI[i] → DNI[i+1]
      let hRecActual = hRecPrim
      for (let idx = 0; idx < miembros.length; idx++) {
        const i = uidMap[miembros[idx].uid]
        if (i === undefined) continue
        resultado[i].col11_hrec = hRecActual

        if (idx < dnis.length - 1) {
          hSalActual = sumarMin(hRealBase, tAcum)
          const { min: minSig } = await buscarTramo(dnis[idx], dnis[idx+1], franjaBase, diaNombre, grupoDia, es, hSalActual)
          hRecActual = sumarMin(hRecActual, minSig)
          tAcum += minSig
        }
      }
    }

    cntTotal++
    if (nivelServ === 'N0A') cntN0A++
    else if (nivelServ === 'N0B') cntN0B++
    else if (nivelServ === 'TomTom') cntTomTom++
    else cntN25++
  }

  return {
    filas: resultado,
    resumen: {
      total: cntTotal,
      histExacto: cntN0A,
      histAgrupado: cntN0B,
      tomtom: cntTomTom,
      soloGPS: cntN25,
    }
  }
}
