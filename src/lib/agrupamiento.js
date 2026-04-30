// ================================================================
//  JetSmart — Algoritmo de Agrupamiento v15c
//  Migrado de VBA AsignarGrupos a JavaScript
// ================================================================

const CORREDORES_LINEALES = new Set([
  'NORTE 5', 'NORTE 3', 'NORTE 2', 'CALLAO 3', 'SAN MIGUEL 1',
  'SAN MIGUEL', 'PANAMERICANA SUR', 'ESTE 1', 'ESTE 2', 'ESTE 3',
  'ESTE 4', 'ESTE 5', 'AV. ARICA 2', 'CALLAO GAMBETA',
])

const COMPAT_MATRIX = [
  ['COSTA VERDE 1', 'SAN MIGUEL'], ['SAN MIGUEL', 'CALLAO 3'],
  ['COSTA VERDE 1', 'CALLAO'], ['CALLAO 2', 'CALLAO 3'],
  ['COSTA VERDE 1', 'CALLAO 2'], ['COSTA VERDE 2', 'CALLAO'],
  ['COSTA VERDE 2', 'SAN MIGUEL'], ['COSTA VERDE', 'COSTA VERDE 2'],
  ['COSTA VERDE', 'SAN MIGUEL 2'], ['COSTA VERDE', 'CALLAO 3'],
  ['COSTA VERDE', 'COSTA VERDE 1'], ['COSTA VERDE', 'CALLAO 2'],
  ['COSTA VERDE', 'SAN MIGUEL'], ['COSTA VERDE 1', 'CALLAO 3'],
  ['COSTA VERDE 1', 'COSTA VERDE 2'], ['COSTA VERDE 2', 'CALLAO 2'],
  ['COSTA VERDE 2', 'SAN MIGUEL 1'], ['VIA EVITAMIENTO', 'COSTA VERDE 2'],
  ['COSTA VERDE 2', 'SAN MIGUEL 2'], ['COSTA VERDE 2', 'CALLAO 3'],
  ['COSTA VERDE 3', 'SAN MIGUEL'], ['COSTA VERDE 3', 'CALLAO'],
  ['COSTA VERDE 3', 'COSTA VERDE 2'], ['COSTA VERDE 3', 'CALLAO 2'],
  ['VIA EVITAMIENTO 2', 'ESTE'], ['VIA EVITAMIENTO', 'ESTE'],
  ['AV. ARICA 1', 'AV. ARICA'], ['AV. ARICA 1', 'SAN MIGUEL 2'],
  ['AV. ARICA 1', 'CALLAO'], ['AV. ARICA 1', 'CALLAO 3'],
  ['AV. ARICA', 'SAN MIGUEL'], ['AV. ARICA', 'CALLAO 3'],
  ['AV. ARICA', 'SAN MIGUEL 2'], ['AV. ARICA', 'SAN MIGUEL 1'],
  ['AV. ARICA', 'CENTRO 2'], ['AV. ARICA 1', 'SAN MIGUEL'],
  ['AV. ARICA 1', 'SAN MIGUEL 1'], ['AV. ARICA 1', 'CENTRO'],
  ['CENTRO', 'NORESTE 1'], ['NORTE 2', 'CALLAO NORTE'],
  ['NORTE 1', 'NORTE 3'], ['NORTE 4', 'NORTE 3'],
  ['NORTE 2', 'NORTE 3'], ['NORTE 2', 'NORTE 5'],
  ['NORTE 2', 'NORESTE 2'], ['ESTE 2', 'NORESTE 1'],
  ['CENTRO 3', 'SAN MIGUEL 2'], ['NORESTE 1', 'NORESTE 2'],
  ['SAN MIGUEL', 'CALLAO 2'], ['SAN MIGUEL 1', 'CALLAO 2'],
  ['VENTANILLA', 'NORTE 5'], ['VENTANILLA', 'CALLAO NORTE'],
  ['SAN MIGUEL 2', 'CENTRO 2'], ['NORTE 3', 'NORESTE 2'],
  ['NORTE 3', 'CALLAO NORTE'], ['NORESTE 3', 'NORESTE 2'],
  ['NORESTE 3', 'NORTE 5'], ['NORTE 3', 'NORTE 5'],
  ['NORTE 1', 'NORTE 5'], ['NORTE 1', 'CALLAO NORTE'],
  ['NORTE 5', 'CALLAO NORTE'], ['ESTE 5', 'ESTE 1'],
  ['ESTE 1', 'ESTE 4'], ['ESTE 2', 'NORESTE 2'],
  ['SAN MIGUEL 2', 'SAN MIGUEL 1'], ['SAN MIGUEL 2', 'SAN MIGUEL'],
  ['SAN MIGUEL 1', 'SAN MIGUEL'], ['VIA EVITAMIENTO', 'AV. ARICA 2'],
  ['VIA EVITAMIENTO', 'VIA EVITAMIENTO 1'], ['VIA EVITAMIENTO', 'AV. ARICA'],
  ['VIA EVITAMIENTO 1', 'SAN MIGUEL 2'], ['VIA EVITAMIENTO', 'COSTA VERDE 2'],
  ['VIA EVITAMIENTO 1', 'COSTA VERDE 2'], ['VIA EVITAMIENTO 1', 'AV. ARICA 1'],
  ['VIA EVITAMIENTO 1', 'AV. ARICA'], ['VIA EVITAMIENTO 1', 'CALLAO 3'],
  ['VIA EVITAMIENTO 1', 'SAN MIGUEL 1'], ['VIA EVITAMIENTO 2', 'ESTE 1'],
  ['VIA EVITAMIENTO', 'COSTA VERDE'], ['VIA EVITAMIENTO 1', 'SAN MIGUEL'],
  ['VIA EVITAMIENTO 1', 'VIA EVITAMIENTO 2'], ['PANAMERICANA SUR', 'VIA EVITAMIENTO'],
  ['PANAMERICANA SUR', 'VIA EVITAMIENTO 1'], ['VIA EVITAMIENTO', 'SAN MIGUEL 1'],
  ['VIA EVITAMIENTO', 'SAN MIGUEL'], ['PANAMERICANA SUR', 'COSTA VERDE 1'],
  ['PANAMERICANA SUR 1', 'COSTA VERDE 2'], ['PANAMERICANA SUR', 'SAN MIGUEL'],
  ['PANAMERICANA SUR', 'CALLAO 3'], ['SAN MIGUEL 1', 'CALLAO 3'],
  ['SAN MIGUEL 2', 'CALLAO 3'], ['SAN MIGUEL 2', 'CALLAO 2'],
  ['SAN MIGUEL', 'SAN MIGUEL 1'], ['COSTA VERDE', 'SAN MIGUEL 1'],
  ['SAN MIGUEL', 'CALLAO'],
]

const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const horaAMin = (h) => {
  if (!h || !String(h).includes(':')) return 0
  const [hh, mm] = String(h).split(':').map(Number)
  return hh * 60 + mm
}

const esCompatible = (corrA, corrB) => {
  const a = corrA.trim().toUpperCase()
  const b = corrB.trim().toUpperCase()
  return COMPAT_MATRIX.some(([ca, cb]) =>
    (ca.trim().toUpperCase() === a && cb.trim().toUpperCase() === b) ||
    (ca.trim().toUpperCase() === b && cb.trim().toUpperCase() === a)
  )
}

const esDePaso = (latAncla, lonAncla, latCand, lonCand, latATO, lonATO, anguloMax) => {
  const vATO_lat = latATO - latAncla, vATO_lon = lonATO - lonAncla
  const vCand_lat = latCand - latAncla, vCand_lon = lonCand - lonAncla
  const magATO = Math.sqrt(vATO_lat ** 2 + vATO_lon ** 2)
  const magCand = Math.sqrt(vCand_lat ** 2 + vCand_lon ** 2)
  if (magCand < 0.0001 || magATO < 0.0001) return true
  let cos = (vATO_lat * vCand_lat + vATO_lon * vCand_lon) / (magATO * magCand)
  cos = Math.max(-1, Math.min(1, cos))
  return Math.acos(cos) * (180 / Math.PI) <= anguloMax
}

const tipoCompat = (i, j, trip, cfg) => {
  if (trip[j].es !== trip[i].es) return 0
  const diff = Math.abs(horaAMin(trip[i].hato) - horaAMin(trip[j].hato))
  const mismoVuelo = trip[i].vuelo === trip[j].vuelo
  // Si son vuelos distintos y agrupar_dist_vuelo es NO → no compatibles
  if (!mismoVuelo && !cfg.agruparDistVuelo) return 0
  const ventana = mismoVuelo ? cfg.ventanaMin : cfg.ventanaDistVuelo
  if (diff > ventana) return 0
  const cI = trip[i].corredor, cJ = trip[j].corredor
  if (cI === cJ) {
    if (CORREDORES_LINEALES.has(cI)) return 1
    return haversine(trip[i].lat, trip[i].lng, trip[j].lat, trip[j].lng) <= cfg.distMaxKm ? 1 : 0
  }
  return esCompatible(cI, cJ) ? 2 : 0
}

const distOKconGrupo = (j, miembros, trip, distMax) =>
  miembros.every(m => haversine(trip[j].lat, trip[j].lng, trip[m].lat, trip[m].lng) <= distMax)

export const asignarGrupos = (filas, cfgSupabase = {}) => {
  if (!filas || filas.length === 0) return []

  const cfg = {
    maxPaxAuto: parseInt(cfgSupabase.max_pax_auto) || 3,
    ventanaMin: 99999,
    ventanaDistVuelo: parseInt(cfgSupabase.ventana_dist_vuelo) || 5,
    distMaxKm: parseFloat(cfgSupabase.dist_max_km) || 14,
    distMaxP2Km: parseFloat(cfgSupabase.dist_max_p2_km) || 18,
    atoLat: parseFloat(cfgSupabase.ato_lat) || -12.0305437703201,
    atoLon: parseFloat(cfgSupabase.ato_lon) || -77.1154495061003,
    vanDisp: (cfgSupabase.van_disponible || 'NO').toUpperCase() === 'SI',
    maxPaxVan: parseInt(cfgSupabase.max_pax_van) || 4,
    maxPaxPunta: parseInt(cfgSupabase.max_pax_punta) || 2,
    diaValleTotal: (cfgSupabase.dia_valle_total || 'SI').toUpperCase() === 'SI',
    anguloMax: parseFloat(cfgSupabase.angulo_max) || 65,
    pManIniMin: horaAMin(cfgSupabase.punta_manana_ini || '06:00'),
    pManFinMin: horaAMin(cfgSupabase.punta_manana_fin || '09:00'),
    pNocIniMin: horaAMin(cfgSupabase.punta_noche_ini || '20:00'),
    pNocFinMin: horaAMin(cfgSupabase.punta_noche_fin || '21:00'),
  }

  const n = filas.length
  const trip = filas.map((f, idx) => ({
    idx,
    dni: f.col1_dni,
    es: (f.col4_es || '').toUpperCase(),
    vuelo: (f.col9_vuelo || '').toUpperCase().replace(/\s/g, ''),
    hato: f.col10_hato || '00:00',
    lat: parseFloat(f.col21_lat) || 0,
    lng: parseFloat(f.col22_lng) || 0,
    corredor: (f.col25_corredor || 'SIN CORREDOR').trim().toUpperCase(),
    distAto: 0,
  }))

  trip.forEach(t => {
    t.distAto = (t.lat && t.lng) ? haversine(t.lat, t.lng, cfg.atoLat, cfg.atoLon) : 0
  })

  const asignado = new Array(n).fill(false)
  const asignadoS = new Array(n).fill(false)
  const grupo = new Array(n).fill(0)
  const orden = new Array(n).fill(0)
  const gMiembros = {}, gPax = {}, sgMiembros = {}, sgPax = {}
  let gActual = 0, sgActual = 0

  const getMaxPax = (hatoMin) => {
    if (cfg.vanDisp) return cfg.maxPaxVan
    if (cfg.diaValleTotal) return cfg.maxPaxAuto
    const enPunta = (hatoMin >= cfg.pManIniMin && hatoMin <= cfg.pManFinMin) ||
      (hatoMin >= cfg.pNocIniMin && hatoMin <= cfg.pNocFinMin)
    return enPunta ? cfg.maxPaxPunta : cfg.maxPaxAuto
  }

  const asignarOrdenE = (g) => {
    const sorted = [...gMiembros[g]].sort((a, b) => trip[b].distAto - trip[a].distAto)
    sorted.forEach((idx, pos) => { orden[idx] = pos + 1 })
  }

  const asignarOrdenS = (g) => {
    const sorted = [...sgMiembros[g]].sort((a, b) => trip[a].distAto - trip[b].distAto)
    sorted.forEach((idx, pos) => { orden[idx] = pos + 1 })
  }

  // Vuelos E únicos ordenados por H.ATO
  const vuelosEMap = {}
  trip.forEach(t => {
    if (t.es === 'E' && !vuelosEMap[t.vuelo]) vuelosEMap[t.vuelo] = horaAMin(t.hato)
  })
  const vuelosE = Object.entries(vuelosEMap).sort((a, b) => a[1] - b[1])

  vuelosE.forEach(([vActual, hatoMin]) => {
    const maxPax = getMaxPax(hatoMin)

    // Ordenar E por distancia ATO descendente
    const idxsE = trip.filter(t => t.es === 'E' && t.vuelo === vActual)
      .sort((a, b) => b.distAto - a.distAto).map(t => t.idx)

    idxsE.forEach(i => {
      if (asignado[i]) return
      gActual++
      asignado[i] = true; grupo[i] = gActual
      gMiembros[gActual] = [i]; gPax[gActual] = 1
      let pax = 1

      // P1
      for (let j = 0; j < n; j++) {
        if (j === i || asignado[j] || pax >= maxPax) continue
        if (trip[j].es !== 'E' || trip[j].vuelo !== vActual) continue
        if (tipoCompat(i, j, trip, cfg) === 1) {
          pax++; asignado[j] = true; grupo[j] = gActual
          gMiembros[gActual].push(j); gPax[gActual]++
        }
      }

      // P2
      if (pax < maxPax) {
        for (let j = 0; j < n; j++) {
          if (j === i || asignado[j] || pax >= maxPax) continue
          if (trip[j].es !== 'E' || trip[j].vuelo !== vActual) continue
          if (tipoCompat(i, j, trip, cfg) === 2 &&
            distOKconGrupo(j, gMiembros[gActual], trip, cfg.distMaxP2Km)) {
            const ancla = trip[gMiembros[gActual][0]]
            const pasa = esDePaso(ancla.lat, ancla.lng, trip[j].lat, trip[j].lng, cfg.atoLat, cfg.atoLon, cfg.anguloMax)
            if (pasa) {
              pax++; asignado[j] = true; grupo[j] = gActual
              gMiembros[gActual].push(j); gPax[gActual]++
            }
          }
        }
      }

      // P3A
      if (pax === 2 && maxPax >= 3) {
        for (let j = 0; j < n; j++) {
          if (j === i || asignado[j] || pax >= maxPax) continue
          if (trip[j].es !== 'E' || trip[j].vuelo !== vActual) continue
          if (tipoCompat(gMiembros[gActual][0], j, trip, cfg) >= 1 &&
            tipoCompat(gMiembros[gActual][1], j, trip, cfg) >= 1) {
            pax++; asignado[j] = true; grupo[j] = gActual
            gMiembros[gActual].push(j); gPax[gActual]++
          }
        }
      }
    })

    // P3B E
    if (maxPax >= 3) {
      for (let i = 0; i < n; i++) {
        if (trip[i].es !== 'E' || trip[i].vuelo !== vActual || gPax[grupo[i]] !== 1) continue
        for (let g = 1; g <= gActual; g++) {
          if (gPax[g] !== 2) continue
          if (tipoCompat(gMiembros[g][0], i, trip, cfg) >= 1 &&
            tipoCompat(gMiembros[g][1], i, trip, cfg) >= 1) {
            gPax[grupo[i]] = 0; grupo[i] = g
            gPax[g] = 3; gMiembros[g].push(i)
            asignarOrdenE(g); break
          }
        }
      }
    }

    // Asignar orden E
    for (let g = 1; g <= gActual; g++) {
      if (gPax[g] > 0 && orden[gMiembros[g][0]] === 0) asignarOrdenE(g)
    }

    // Buscar vuelo S correspondiente
    let vActualS = ''
    for (let i = 0; i < n && !vActualS; i++) {
      if (trip[i].es !== 'E' || trip[i].vuelo !== vActual) continue
      for (let k = 0; k < n; k++) {
        if (trip[k].es === 'S' && !asignadoS[k] && trip[k].dni === trip[i].dni) {
          vActualS = trip[k].vuelo; break
        }
      }
    }
    if (!vActualS) return

    const idxsS = trip.filter(t => t.es === 'S' && t.vuelo === vActualS)
      .sort((a, b) => b.distAto - a.distAto).map(t => t.idx)

    idxsS.forEach(i => {
      if (asignadoS[i]) return
      sgActual++
      asignadoS[i] = true; grupo[i] = sgActual
      sgMiembros[sgActual] = [i]; sgPax[sgActual] = 1
      let pax = 1

      // P1 S
      for (let j = 0; j < n; j++) {
        if (j === i || asignadoS[j] || pax >= maxPax) continue
        if (trip[j].es !== 'S' || trip[j].vuelo !== vActualS) continue
        if (tipoCompat(i, j, trip, cfg) === 1) {
          pax++; asignadoS[j] = true; grupo[j] = sgActual
          sgMiembros[sgActual].push(j); sgPax[sgActual]++
        }
      }

      // P2 S
      if (pax < maxPax) {
        for (let j = 0; j < n; j++) {
          if (j === i || asignadoS[j] || pax >= maxPax) continue
          if (trip[j].es !== 'S' || trip[j].vuelo !== vActualS) continue
          if (tipoCompat(i, j, trip, cfg) === 2 &&
            distOKconGrupo(j, sgMiembros[sgActual], trip, cfg.distMaxP2Km)) {
            const ancla = trip[sgMiembros[sgActual][0]]
            const pasa = esDePaso(ancla.lat, ancla.lng, trip[j].lat, trip[j].lng, cfg.atoLat, cfg.atoLon, cfg.anguloMax)
            if (pasa) {
              pax++; asignadoS[j] = true; grupo[j] = sgActual
              sgMiembros[sgActual].push(j); sgPax[sgActual]++
            }
          }
        }
      }

      // P3A S
      if (pax === 2 && maxPax >= 3) {
        for (let j = 0; j < n; j++) {
          if (j === i || asignadoS[j] || pax >= maxPax) continue
          if (trip[j].es !== 'S' || trip[j].vuelo !== vActualS) continue
          if (tipoCompat(sgMiembros[sgActual][0], j, trip, cfg) >= 1 &&
            tipoCompat(sgMiembros[sgActual][1], j, trip, cfg) >= 1) {
            pax++; asignadoS[j] = true; grupo[j] = sgActual
            sgMiembros[sgActual].push(j); sgPax[sgActual]++
          }
        }
      }
    })

    // P3B S
    if (maxPax >= 3) {
      for (let i = 0; i < n; i++) {
        if (trip[i].es !== 'S' || trip[i].vuelo !== vActualS || sgPax[grupo[i]] !== 1) continue
        for (let g = 1; g <= sgActual; g++) {
          if (sgPax[g] !== 2) continue
          if (tipoCompat(sgMiembros[g][0], i, trip, cfg) >= 1 &&
            tipoCompat(sgMiembros[g][1], i, trip, cfg) >= 1) {
            sgPax[grupo[i]] = 0; grupo[i] = g
            sgPax[g] = 3; sgMiembros[g].push(i)
            asignarOrdenS(g); break
          }
        }
      }
    }

    // Asignar orden S
    for (let g = 1; g <= sgActual; g++) {
      if (sgPax[g] > 0 && orden[sgMiembros[g][0]] === 0) asignarOrdenS(g)
    }
  })

  // Aplicar resultados
  return filas.map((f, idx) => {
    const t = trip[idx]
    const grpNum = grupo[idx] || 0
    const pax = t.es === 'E' ? (gPax[grpNum] || 1) : (sgPax[grpNum] || 1)
    const prov = pax >= 4 ? 'Directo Van' : pax === 3 ? 'Directo XL' : 'Directo Auto'
    const grupoCode = grpNum > 0 ? `${t.es}${String(grpNum).padStart(3, '0')}` : ''
    return {
      ...f,
      col7_pax: pax,
      col8_prov: prov,
      col23_grupo: grupoCode,
      col24_orden: orden[idx] || 1,
      col25_corredor: t.corredor,
    }
  })
}