// ================================================================
//  JetSmart — Motor ETA v4 (reescrito desde cero siguiendo macro VBA)
//  src/lib/motorETA.js
// ================================================================

import { supabase } from './supabase'

const AERO_LAT = -12.0219
const AERO_LON = -77.1143
const TOMTOM_KEY = 'yFNyJSy0Zx0pTNL68jtxBN7ugOfWpRz0'

// ── Helpers de tiempo ─────────────────────────────────────────────────────────
const horaAMin = (h) => {
  if (!h || !String(h).includes(':')) return 0
  const [hh, mm] = String(h).split(':').map(Number)
  return hh * 60 + mm
}
const minAHora = (mins) => {
  let m = ((Math.round(mins) % 1440) + 1440) % 1440
  return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`
}
const sumarMin  = (h, m) => minAHora(horaAMin(h) + m)
const restarMin = (h, m) => minAHora(horaAMin(h) - m)

// ── Franja desde hora ─────────────────────────────────────────────────────────
export const getFranja = (hora) => {
  const h = parseInt((hora||'00:00').split(':')[0])
  if (h < 6)  return 'Valle'
  if (h < 9)  return 'Punta AM'
  if (h < 13) return 'Intermedio bajo'
  if (h < 16) return 'Intermedio alto'
  return 'Punta PM'
}

// ── Día nombre desde fecha DD/MM/YYYY ─────────────────────────────────────────
export const getDiaNombre = (fechaStr) => {
  try {
    const [d,m,y] = (fechaStr||'').split('/').map(Number)
    const dt = new Date(y, m-1, d)
    return ['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo'][(dt.getDay()+6)%7]
  } catch { return 'Lunes' }
}

// ── Grupo día ─────────────────────────────────────────────────────────────────
export const getGrupoDia = (fechaStr) => {
  try {
    const [d,m,y] = (fechaStr||'').split('/').map(Number)
    const dt = new Date(y, m-1, d)
    const wd = (dt.getDay()+6)%7
    if (wd===0) return 'LUN'
    if (wd<=3)  return 'MAR-JUE'
    if (wd===4) return 'VIE'
    if (wd===5) return 'SAB'
    return 'DOM'
  } catch { return 'MAR-JUE' }
}

// ── Haversine ─────────────────────────────────────────────────────────────────
const haversine = (lat1,lon1,lat2,lon2) => {
  const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
}

// ── Es aeropuerto ─────────────────────────────────────────────────────────────
const esAeropuerto = (dni) => {
  const n=(dni||'').toUpperCase().trim()
  return ['AEROPUERTO','JETSMART NUEVO AERO','LATAM CORPAC','NUEVO AEROPUERTO'].includes(n)
}

// ── Calcular mediana IQR ──────────────────────────────────────────────────────
const calcMediana = (str) => {
  if (!str) return 0
  if (!String(str).includes(';')) return parseFloat(str)||0
  const vals = String(str).split(';').map(v=>parseFloat(v)).filter(v=>!isNaN(v)).sort((a,b)=>a-b)
  if (vals.length===0) return 0
  if (vals.length===1) return vals[0]
  const q1=vals[Math.floor(vals.length*0.25)]
  const q3=vals[Math.floor(vals.length*0.75)]
  const iqr=q3-q1
  const f=vals.filter(v=>v>=q1-1.5*iqr&&v<=q3+1.5*iqr)
  const mid=Math.floor(f.length/2)
  return f.length%2===0?(f[mid-1]+f[mid])/2:f[mid]
}

// ── N25 fallback GPS ──────────────────────────────────────────────────────────
const getVel = (franja, distKm) => {
  const tablas = [
    [5,  {Valle:7.4, 'Punta AM':6.2, 'Intermedio bajo':6.2, 'Intermedio alto':6.1, 'Punta PM':5.9}],
    [10, {Valle:11.1,'Punta AM':9.3, 'Intermedio bajo':10,  'Intermedio alto':10,  'Punta PM':9.3}],
    [15, {Valle:15.2,'Punta AM':12.5,'Intermedio bajo':14.2,'Intermedio alto':12.7,'Punta PM':12.6}],
    [20, {Valle:19.1,'Punta AM':15.8,'Intermedio bajo':17.9,'Intermedio alto':16.7,'Punta PM':16.4}],
    [999,{Valle:22.8,'Punta AM':19.2,'Intermedio bajo':21.3,'Intermedio alto':20.1,'Punta PM':19.8}],
  ]
  for (const [lim, t] of tablas) { if (distKm < lim) return t[franja]||12 }
  return 12
}

const n25Tramo = (lat1,lon1,lat2,lon2,franja,tipo) => {
  const dist = haversine(lat1,lon1,lat2,lon2)
  if (dist < 0.3) return 5
  const vel = getVel(franja, dist)
  const t = (dist/vel)*60
  if (tipo==='DNI_ATO') return t+4
  if (tipo==='ATO_DNI') return t+10
  return t+4
}

// ── TomTom API ────────────────────────────────────────────────────────────────
const franjaHora = {'Valle':'03:00:00','Punta AM':'07:30:00','Intermedio bajo':'10:00:00','Intermedio alto':'13:00:00','Punta PM':'18:00:00'}
const grupoDiaN  = {'LUN':2,'MAR-JUE':4,'VIE':6,'SAB':7,'DOM':1}

const consultarTomTom = async (lat1,lon1,lat2,lon2,franja,grupoDia) => {
  try {
    const hora = franjaHora[franja]||'12:00:00'
    const diasTarget = grupoDiaN[grupoDia]??4
    const hoy = new Date()
    let diff = diasTarget - hoy.getDay()
    if (diff<=0) diff+=7
    const fecha = new Date(hoy); fecha.setDate(hoy.getDate()+diff)
    const departAt = `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}-${String(fecha.getDate()).padStart(2,'0')}T${hora}`
    const coords = `${lat1.toFixed(7)},${lon1.toFixed(7)}:${lat2.toFixed(7)},${lon2.toFixed(7)}`
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${coords}/json?key=${TOMTOM_KEY}&departAt=${departAt}&traffic=true&travelMode=car`
    const resp = await fetch(url)
    if (!resp.ok) return 0
    const data = await resp.json()
    const secs = data?.routes?.[0]?.summary?.travelTimeInSeconds
    return secs ? Math.round(secs/60*10)/10 : 0
  } catch { return 0 }
}

const guardarTomTom = async (dniDe,dniA,franja,minutos) => {
  await supabase.from('eta_tomtom').upsert(
    {dni_de:dniDe,dni_a:dniA,franja,minutos,fecha_consulta:new Date().toISOString().slice(0,10)},
    {onConflict:'dni_de,dni_a,franja'}
  )
}

// ── MOTOR PRINCIPAL ───────────────────────────────────────────────────────────
export const calcularETA = async (filas, onProgress) => {
  if (!filas||filas.length===0) return {filas,resumen:{}}

  onProgress?.('Cargando tablas ETA...')

  // Cargar todas las tablas en paralelo con paginación
  const pageSize = 10000
  
  const cargarTabla = async (tabla, select) => {
    let todos = []
    let desde = 0
    while (true) {
      const {data, error} = await supabase.from(tabla).select(select).range(desde, desde+pageSize-1)
      if (error||!data||data.length===0) break
      todos = todos.concat(data)
      console.log(`${tabla}: ${todos.length} filas cargadas`)
      if (data.length < pageSize) break
      desde += pageSize
    }
    return todos
  }

  const [n0aData, n0bData, ttData, tripData] = await Promise.all([
    cargarTabla('eta_n0a', 'dni_de,dni_a,dia,franja,es,minutos,n_reg'),
    cargarTabla('eta_n0b', 'dni_de,dni_a,grupo_dia,franja,es,minutos'),
    cargarTabla('eta_tomtom', 'dni_de,dni_a,franja,minutos'),
    supabase.from('tripulantes').select('dni,lat,lng').in('dni', [...new Set(filas.map(f=>f.col1_dni).filter(Boolean))]).then(r=>r.data||[]),
  ])

  onProgress?.(`Tablas cargadas: N0A=${n0aData.length} N0B=${n0bData.length} TomTom=${ttData.length}`)

  // Coordenadas
  const coordsMap = {'AEROPUERTO':{lat:AERO_LAT,lng:AERO_LON}}
  tripData.forEach(t => { if(t.lat&&t.lng) coordsMap[t.dni]={lat:parseFloat(t.lat),lng:parseFloat(t.lng)} })

  // Diccionarios en memoria — igual que CargarN0A en VBA
  const dicN0A = {}
  n0aData.forEach(r => {
    const k = `${(r.dni_de||'').toUpperCase()}|${(r.dni_a||'').toUpperCase()}|${r.dia}|${r.franja}|${(r.es||'').toUpperCase()}`
    const med = calcMediana(r.minutos)
    const nReg = r.n_reg||1
    // Si único registro < 10 min → poco confiable, bajar a N0B (igual que macro)
    if (nReg===1 && med<10) return
    dicN0A[k] = {med, nReg}
  })

  const dicN0B = {}
  n0bData.forEach(r => {
    const k = `${(r.dni_de||'').toUpperCase()}|${(r.dni_a||'').toUpperCase()}|${r.grupo_dia}|${r.franja}|${(r.es||'').toUpperCase()}`
    dicN0B[k] = calcMediana(r.minutos)
  })

  const dicTomTom = {}
  ttData.forEach(r => {
    const k = `${(r.dni_de||'').toUpperCase()}|${(r.dni_a||'').toUpperCase()}|${r.franja}`
    dicTomTom[k] = r.minutos
  })

  // ── BuscarTramo — replica exacta de la función VBA ────────────────────────
  const buscarTramo = async (dniDe, dniA, franja, diaNombre, grupoDia, es, hSalida) => {
    const franjaUsar = (hSalida && hSalida !== '00:00') ? getFranja(hSalida) : franja
    const deDe = (dniDe||'').toUpperCase().trim()
    const deA  = (dniA ||'').toUpperCase().trim()
    const esUp = (es||'').toUpperCase().trim()

    // N0A
    const kN0A = `${deDe}|${deA}|${diaNombre}|${franjaUsar}|${esUp}`
    if (dicN0A[kN0A]!==undefined) {
      const {med,nReg} = dicN0A[kN0A]
      if (!(nReg===1 && med<10)) return {min:med, nivel:'N0A'}
    }

    // N0B
    const kN0B = `${deDe}|${deA}|${grupoDia}|${franjaUsar}|${esUp}`
    if (dicN0B[kN0B]!==undefined) return {min:dicN0B[kN0B], nivel:'N0B'}

    // TomTom caché
    const kTT = `${deDe}|${deA}|${franjaUsar}`
    if (dicTomTom[kTT]!==undefined) return {min:dicTomTom[kTT], nivel:'TomTom'}

    // TomTom API
    const c1 = coordsMap[esAeropuerto(dniDe)?'AEROPUERTO':dniDe]
    const c2 = coordsMap[esAeropuerto(dniA) ?'AEROPUERTO':dniA]
    if (c1&&c2) {
      const tTT = await consultarTomTom(c1.lat,c1.lng,c2.lat,c2.lng,franjaUsar,grupoDia)
      if (tTT>0) {
        dicTomTom[kTT]=tTT
        await guardarTomTom(deDe,deA,franjaUsar,tTT)
        return {min:tTT, nivel:'TomTom'}
      }
      // N25
      const tipo = esAeropuerto(dniDe)?'ATO_DNI':esAeropuerto(dniA)?'DNI_ATO':'DNI_DNI'
      const tN25 = n25Tramo(c1.lat,c1.lng,c2.lat,c2.lng,franjaUsar,tipo)
      return {min:tN25>0?tN25:15, nivel:'N25'}
    }
    return {min:15, nivel:'N25'}
  }

  // ── Procesar fila por fila — igual que la macro VBA ───────────────────────
  // La macro itera fila por fila usando servActual para detectar cambio de servicio
  const resultado = filas.map(f=>({...f}))
  
  let servActual = -1
  let hRealServ = ''
  let esServ = ''
  let franjaServ = ''
  let diaServ = ''
  let grupoDiaServ = ''
  let dniAnterior = ''
  let hRecAnterior = ''
  let nivelServ = 'N25'
  
  let cntN0A=0, cntN0B=0, cntTomTom=0, cntN25=0, cntTotal=0

  for (let fi = 0; fi < filas.length; fi++) {
    const f = filas[fi]
    const serv = Number(f.col5_serv)
    if (!serv) continue

    // Extraer DNI de NOMBRES (igual que ExtraerDNIdeNombre en VBA)
    const extraerDNI = (nombres, dniFallback) => {
      const nom = (nombres||'').trim()
      const guion = nom.indexOf('-')
      if (guion>0) {
        const posible = nom.slice(0,guion).trim()
        if (posible.length>=6&&posible.length<=8&&/^\d+$/.test(posible)) return posible.toUpperCase()
      }
      return (dniFallback||'').toUpperCase()
    }

    const dniActual = extraerDNI(f.col14_nombres, f.col1_dni)

    if (serv !== servActual) {
      // Nuevo servicio — igual que bloque "If nServ <> servActual Then" en VBA
      servActual = serv
      esServ     = (f.col4_es||'').toUpperCase()
      const fecha = f.col3_fecha||''
      const hato  = f.col10_hato||''
      diaServ     = getDiaNombre(fecha)
      grupoDiaServ= getGrupoDia(fecha)
      franjaServ  = getFranja(hato)  // franja desde H.ATO — consistente con historial

      // Recopilar todos los DNIs del servicio
      const miembrosServ = filas.filter(x=>Number(x.col5_serv)===serv)
        .sort((a,b)=>parseInt(a.col24_orden)-parseInt(b.col24_orden))
      const dniServicio = miembrosServ.map(m=>extraerDNI(m.col14_nombres,m.col1_dni))

      // Calcular ETA total — igual que bloque "tt = 0" en VBA
      let tt = 0
      let tAcum = 0
      let nivelTmp = 'N25'

      onProgress?.(`Calculando ETA... servicio ${serv}`)

      if (esServ==='E') {
        // Tramos DNI[i]→DNI[i+1]
        for (let ii=0; ii<dniServicio.length-1; ii++) {
          const hSalT = sumarMin(hRealServ||'00:00', tAcum)
          const {min,nivel} = await buscarTramo(dniServicio[ii],dniServicio[ii+1],franjaServ,diaServ,grupoDiaServ,esServ,hSalT)
          tt+=min; tAcum+=min; nivelTmp=nivel
        }
        // Último DNI→AEROPUERTO
        if (dniServicio.length>0) {
          const hSalT = sumarMin(hRealServ||'00:00', tAcum)
          const {min,nivel} = await buscarTramo(dniServicio[dniServicio.length-1],'AEROPUERTO',franjaServ,diaServ,grupoDiaServ,esServ,hSalT)
          tt+=min; nivelTmp=nivel
        }
        // H.REAL = H.ATO - ETA total (igual que macro)
        hRealServ = restarMin(hato, Math.round(tt))
      } else {
        // S: AEROPUERTO→DNI[0]
        if (dniServicio.length>0) {
          const {min,nivel} = await buscarTramo('AEROPUERTO',dniServicio[0],franjaServ,diaServ,grupoDiaServ,esServ,hato)
          tt+=min; tAcum=min; nivelTmp=nivel
        }
        // DNI[i]→DNI[i+1]
        for (let ii=0; ii<dniServicio.length-1; ii++) {
          const hSalT = sumarMin(hato, tAcum)
          const {min,nivel} = await buscarTramo(dniServicio[ii],dniServicio[ii+1],franjaServ,diaServ,grupoDiaServ,esServ,hSalT)
          tt+=min; tAcum+=min; nivelTmp=nivel
        }
        hRealServ = hato
      }

      nivelServ = nivelTmp
      cntTotal++
      if (nivelServ==='N0A') cntN0A++
      else if (nivelServ==='N0B') cntN0B++
      else if (nivelServ==='TomTom') cntTomTom++
      else cntN25++

      // H.REC primera fila = H.REAL para E, o ATO+delta para S
      let hRecPrim = hRealServ
      if (esServ==='S' && dniServicio.length>0) {
        const {min:deltaAero} = await buscarTramo('AEROPUERTO',dniServicio[0],franjaServ,diaServ,grupoDiaServ,esServ,'')
        hRecPrim = sumarMin(hRealServ, Math.round(deltaAero))
      }

      // Escribir en resultado
      resultado[fi].col6_hreal  = hRealServ
      resultado[fi].col11_hrec  = hRecPrim
      resultado[fi]._etaNivel   = nivelServ

      dniAnterior  = dniActual
      hRecAnterior = hRecPrim

    } else {
      // Fila del mismo servicio — igual que bloque Else en VBA
      const {min:deltaMin} = await buscarTramo(dniAnterior,dniActual,franjaServ,diaServ,grupoDiaServ,esServ,'')
      const hRecActual = sumarMin(hRecAnterior, Math.round(deltaMin))
      
      resultado[fi].col6_hreal = hRealServ
      resultado[fi].col11_hrec = hRecActual
      resultado[fi]._etaNivel  = nivelServ

      dniAnterior  = dniActual
      hRecAnterior = hRecActual
    }
  }

  return {
    filas: resultado,
    resumen: { total:cntTotal, histExacto:cntN0A, histAgrupado:cntN0B, tomtom:cntTomTom, soloGPS:cntN25 }
  }
}
