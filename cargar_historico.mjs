/**
 * cargar_historico.mjs
 * JetSmart — Procesa el archivo histórico de GeoVictoria
 * y actualiza Supabase (historico + eta_n0a + eta_n0b)
 *
 * USO:
 *   node cargar_historico.mjs <archivo.xlsx>
 *   Ejemplo: node cargar_historico.mjs historico_mayo.xlsx
 *
 * PREREQUISITOS:
 *   npm install xlsx @supabase/supabase-js
 */

import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://boosebgyavjeoioppriu.supabase.co'
const SUPABASE_KEY = 'sb_publishable_HiJaBpjGmKdyCCUCRt4jnA_7tvGbDXI'
const BATCH_SIZE   = 500
const MAX_TIEMPO   = 90  // minutos máximo por tramo

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
function log(msg) { console.log(`[${new Date().toLocaleTimeString('es-PE')}] ${msg}`) }

// ── Helpers ────────────────────────────────────────────────────────────────────
function str(v) { return (v == null || v === '') ? '' : String(v).trim() }
function num(v) { const n = parseFloat(String(v||'').replace(',','.')); return isNaN(n) ? 0 : n }

// Convertir serial Excel a fecha DD/MM/YYYY
function serialToFecha(v) {
  if (!v) return ''
  if (typeof v === 'string' && v.includes('/')) return v
  const n = num(v)
  if (n < 40000) return ''
  const d = new Date((n - 25569) * 86400 * 1000)
  return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`
}

// Convertir serial Excel a HH:MM
function serialToHora(v) {
  if (!v) return ''
  if (typeof v === 'string' && v.includes(':')) return v.slice(0,5)
  const n = num(v)
  if (n <= 0) return ''
  const fraccion = n % 1
  const totalMin = Math.round(fraccion * 1440)
  return `${String(Math.floor(totalMin/60)).padStart(2,'0')}:${String(totalMin%60).padStart(2,'0')}`
}

// Serial completo a minutos desde epoch (para diferencias)
function serialToMins(v) {
  const n = num(v)
  if (n <= 0) return 0
  return n * 1440
}

// Extraer DNIs del campo Observacion
function extraerDNIs(obs) {
  if (!obs) return []
  let txt = String(obs)
  txt = txt.replace(/-space-/g, ' ')
  txt = txt.replace(/\r?\n/g, ' ')
  txt = txt.replace(/\//g, ' ')
  // Cortar en --> IdOrder Monto
  const cortes = ['-->', 'idorder', 'monto']
  for (const c of cortes) {
    const idx = txt.toLowerCase().indexOf(c)
    if (idx > 0) txt = txt.slice(0, idx)
  }

  const dnis = []
  let pos = 0
  while (pos < txt.length && dnis.length < 4) {
    const ch = txt[pos]
    if (ch >= '0' && ch <= '9') {
      let numStr = ''
      let p2 = pos
      while (p2 < txt.length && txt[p2] >= '0' && txt[p2] <= '9') {
        numStr += txt[p2]; p2++
      }
      if (numStr.length >= 6 && numStr.length <= 8) {
        // Buscar guión seguido de letra
        let p3 = p2
        while (p3 < txt.length && txt[p3] === ' ') p3++
        if (p3 < txt.length && (txt[p3] === '-' || txt[p3] === '–' || txt.charCodeAt(p3) === 8211)) {
          p3++
          while (p3 < txt.length && txt[p3] === ' ') p3++
          if (p3 < txt.length) {
            const pc = txt[p3]
            if (/[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/.test(pc)) {
              dnis.push(numStr)
            }
          }
        }
      }
      pos = p2
    } else {
      pos++
    }
  }
  return dnis
}

// Extraer vuelo del campo ATO_VUELO
function extraerVuelo(ato) {
  if (!ato) return ''
  const parts = String(ato).trim().split(' ')
  return parts[parts.length - 1].trim()
}

// Entrada o Salida según ZonaOrigen
function entradaSalida(zona) {
  const z = (zona || '').toUpperCase().trim()
  const aeros = ['JETSMART NUEVO AERO','LATAM CORPAC','NUEVO AEROPUERTO',
                 'NUEVO AEROPUERTO - ORIGEN AERO LATAM','NUEVO AEROPUERTO - ORIGEN AEROLINEAS']
  return aeros.includes(z) ? 'S' : 'E'
}

// Franja horaria
function getFranja(hora) {
  if (!hora || !hora.includes(':')) return 'Valle'
  const h = parseInt(hora.split(':')[0])
  if (h < 6)  return 'Valle'
  if (h < 9)  return 'Punta AM'
  if (h < 13) return 'Intermedio bajo'
  if (h < 16) return 'Intermedio alto'
  return 'Punta PM'
}

// Día nombre desde DD/MM/YYYY
function getDiaNombre(fechaStr) {
  try {
    const [d,m,y] = fechaStr.split('/').map(Number)
    const dt = new Date(y, m-1, d)
    return ['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo'][(dt.getDay()+6)%7]
  } catch { return 'Lunes' }
}

// Grupo día
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

async function upsertLotes(tabla, filas, conflictKey) {
  let ins = 0, err = 0
  for (let i = 0; i < filas.length; i += BATCH_SIZE) {
    const lote = filas.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from(tabla)
      .upsert(lote, { onConflict: conflictKey, ignoreDuplicates: false })
    if (error) { console.error(`\n  ❌ Error:`, error.message); err += lote.length }
    else ins += lote.length
    process.stdout.write(`\r  → ${Math.min(i+BATCH_SIZE, filas.length)}/${filas.length}...`)
  }
  console.log()
  return { ins, err }
}

// ── Leer archivo ──────────────────────────────────────────────────────────────
const archivo = process.argv[2]
if (!archivo) {
  console.error('❌ Debes especificar el archivo: node cargar_historico.mjs archivo.xlsx')
  process.exit(1)
}

const rutaArchivo = archivo.includes('\\') || archivo.includes('/') 
  ? archivo 
  : join(__dirname, archivo)

log(`Leyendo ${rutaArchivo}...`)
const wb = XLSX.read(readFileSync(rutaArchivo), { type: 'buffer', cellDates: false })
log(`Hojas: ${wb.SheetNames.join(', ')}`)

// Buscar hoja con datos históricos
let wsNombre = wb.SheetNames[0]
for (const nombre of wb.SheetNames) {
  const n = nombre.toLowerCase()
  if (n.includes('hist') || n.includes('servic') || n.includes('repor')) {
    wsNombre = nombre; break
  }
}
log(`Usando hoja: ${wsNombre}`)

const ws = wb.Sheets[wsNombre]
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

// Buscar fila de headers
let hdrRow = -1
for (let i = 0; i < Math.min(10, rows.length); i++) {
  if (rows[i].includes('FechaServicio') || rows[i].includes('Reserva')) {
    hdrRow = i; break
  }
}
if (hdrRow < 0) { console.error('❌ No se encontró el header'); process.exit(1) }

const headers = rows[hdrRow].map(h => str(h))
log(`Header en fila ${hdrRow+1}: ${headers.slice(0,9).join(', ')}`)

// Índices de columnas
const col = (name) => headers.indexOf(name)
const iFecha   = col('FechaServicio')
const iCond    = col('IdConductor')
const iZona    = col('ZonaOrigenDescripcion')
const iHora    = col('ServicioHora')
const iAto     = col('ATO_VUELO')
const iReserva = col('Reserva')
const iTipo    = col('TipoServicio')
const iObs     = col('Observacion')

log(`Columnas: Reserva=${iReserva+1} Obs=${iObs+1} Zona=${iZona+1} Cond=${iCond+1}`)

// ── Cargar Reservas existentes en Supabase ─────────────────────────────────────
log('\nCargando reservas existentes en Supabase...')
const { data: existData } = await supabase.from('historico').select('id_servicio')
const existentes = new Set((existData||[]).map(r => r.id_servicio))
log(`  ${existentes.size} reservas ya en Supabase`)

// ── Cargar tripulantes para cruzar DNIs ────────────────────────────────────────
log('Cargando tripulantes...')
const { data: tripData } = await supabase.from('tripulantes').select('dni, nombre, lat, lng, zona_distrito, cargo')
const tripMap = {}
;(tripData||[]).forEach(t => { tripMap[t.dni] = t })
log(`  ${Object.keys(tripMap).length} tripulantes cargados`)

// ── Procesar filas ────────────────────────────────────────────────────────────
log('\nProcesando histórico...')

const filasHistorico = []
const dicN0A = {}
const dicN0B = {}

let cntNuevos = 0, cntDupl = 0, cntSinDNI = 0, cntTiempoI = 0

for (let fi = hdrRow + 1; fi < rows.length; fi++) {
  const r = rows[fi]
  if (!r[iReserva] && !r[iFecha]) continue

  // Excluir conductores 5 y 6
  const conductor = str(r[iCond])
  if (['5','6','0005','0006'].includes(conductor)) continue

  const reserva = str(r[iReserva])
  if (!reserva) continue

  // Saltar duplicados
  if (existentes.has(reserva)) { cntDupl++; continue }
  existentes.add(reserva)

  const fecha   = str(r[iFecha])
  const hora    = str(r[iHora])
  const zona    = str(r[iZona])
  const ato     = str(r[iAto])
  const tipo    = str(r[iTipo])
  const obs     = str(r[iObs])

  if (!fecha || !hora) continue

  const es     = entradaSalida(zona)
  const vuelo  = extraerVuelo(ato)
  const franja = getFranja(hora)
  const diaNom = getDiaNombre(fecha)
  const grupoD = getGrupoDia(fecha)

  // Extraer DNIs
  const dnis = extraerDNIs(obs)
  if (dnis.length === 0) cntSinDNI++

  // Calcular tiempos por parada
  const paradas = []
  for (let ip = 1; ip <= 6; ip++) {
    const iZD  = col(`ZonaDestinoDescripcion_${ip}`)
    const iFI  = col(`FechaInicio_${ip}`)
    const iFT  = col(`FechaTermino_${ip}`)
    const iFL  = col(`FechaLlegada_${ip}`)

    const zona_dest = iZD >= 0 ? str(r[iZD]) : ''
    const mFI  = iFI >= 0 && r[iFI]  ? serialToMins(r[iFI])  : 0
    const mFT  = iFT >= 0 && r[iFT]  ? serialToMins(r[iFT])  : 0
    const mFL  = iFL >= 0 && r[iFL]  ? serialToMins(r[iFL])  : 0

    paradas.push({ zona_dest, mFI, mFT, mFL })
  }

  // Calcular t_min por tramo (igual que macro)
  const tMin = [0, 0, 0, 0, 0, 0]
  const nParadas = paradas.filter(p => p.zona_dest && p.mFL > 0).length

  if (nParadas >= 1) {
    if (es === 'E') {
      for (let ip = 0; ip < nParadas - 1; ip++) {
        if (paradas[ip].mFI > 0 && paradas[ip+1].mFL > 0) {
          const t = paradas[ip+1].mFL - paradas[ip].mFI
          if (t > 0 && t < MAX_TIEMPO) tMin[ip] = Math.round((t + 3) * 10) / 10
        }
      }
      const last = nParadas - 1
      if (paradas[last].mFI > 0 && paradas[last].mFT > 0) {
        const t = paradas[last].mFT - paradas[last].mFI
        if (t > 0 && t < MAX_TIEMPO) tMin[last] = Math.round(t * 10) / 10
      }
    } else {
      for (let ip = 0; ip < nParadas; ip++) {
        if (paradas[ip].mFI > 0 && paradas[ip].mFT > 0) {
          const t = paradas[ip].mFT - paradas[ip].mFI
          if (t > 0 && t < MAX_TIEMPO) tMin[ip] = Math.round(t * 10) / 10
        }
      }
    }
  }

  // Construir fila para historico
  const fila = {
    id_servicio:    reserva,
    fecha,
    hora_inicio:    hora,
    hora_fin:       '',
    tiempo_total_min: 0,
    cant_usuarios:  dnis.length,
    entrada_salida: es,
    dni_1:   dnis[0] || null,
    nombre_1: dnis[0] ? (tripMap[dnis[0]]?.nombre || null) : null,
    cargo_1:  dnis[0] ? (tripMap[dnis[0]]?.cargo || null) : null,
    zona_1:   paradas[0]?.zona_dest || null,
    lat_1:    dnis[0] ? (tripMap[dnis[0]]?.lat ? parseFloat(tripMap[dnis[0]].lat) : null) : null,
    lon_1:    dnis[0] ? (tripMap[dnis[0]]?.lng ? parseFloat(tripMap[dnis[0]].lng) : null) : null,
    dni_2:   dnis[1] || null,
    nombre_2: dnis[1] ? (tripMap[dnis[1]]?.nombre || null) : null,
    cargo_2:  dnis[1] ? (tripMap[dnis[1]]?.cargo || null) : null,
    zona_2:   paradas[1]?.zona_dest || null,
    lat_2:    dnis[1] ? (tripMap[dnis[1]]?.lat ? parseFloat(tripMap[dnis[1]].lat) : null) : null,
    lon_2:    dnis[1] ? (tripMap[dnis[1]]?.lng ? parseFloat(tripMap[dnis[1]].lng) : null) : null,
    dni_3:   dnis[2] || null,
    nombre_3: dnis[2] ? (tripMap[dnis[2]]?.nombre || null) : null,
    cargo_3:  dnis[2] ? (tripMap[dnis[2]]?.cargo || null) : null,
    zona_3:   paradas[2]?.zona_dest || null,
    lat_3:    dnis[2] ? (tripMap[dnis[2]]?.lat ? parseFloat(tripMap[dnis[2]].lat) : null) : null,
    lon_3:    dnis[2] ? (tripMap[dnis[2]]?.lng ? parseFloat(tripMap[dnis[2]].lng) : null) : null,
    dni_4:   dnis[3] || null,
    nombre_4: dnis[3] ? (tripMap[dnis[3]]?.nombre || null) : null,
    cargo_4:  dnis[3] ? (tripMap[dnis[3]]?.cargo || null) : null,
    zona_4:   paradas[3]?.zona_dest || null,
    lat_4:    dnis[3] ? (tripMap[dnis[3]]?.lat ? parseFloat(tripMap[dnis[3]].lat) : null) : null,
    lon_4:    dnis[3] ? (tripMap[dnis[3]]?.lng ? parseFloat(tripMap[dnis[3]].lng) : null) : null,
    zona_origen:    zona,
    tipo_servicio:  tipo,
    vuelo,
    franja_horaria: franja,
    parada_1: paradas[0]?.zona_dest || null, t_min_parada_1: tMin[0] || null,
    parada_2: paradas[1]?.zona_dest || null, t_min_parada_2: tMin[1] || null,
    parada_3: paradas[2]?.zona_dest || null, t_min_parada_3: tMin[2] || null,
    parada_4: paradas[3]?.zona_dest || null, t_min_parada_4: tMin[3] || null,
    parada_5: paradas[4]?.zona_dest || null, t_min_parada_5: tMin[4] || null,
    parada_6: paradas[5]?.zona_dest || null, t_min_parada_6: tMin[5] || null,
    observacion: obs.slice(0, 500),
  }
  filasHistorico.push(fila)
  cntNuevos++

  // Acumular pares para N0A y N0B
  if (dnis.length >= 1) {
    const acum = (dic, k, val) => {
      if (val < 3 || val > MAX_TIEMPO) return
      if (!dic[k]) dic[k] = []
      dic[k].push(Math.round(val * 10) / 10)
    }

    if (es === 'E') {
      if (dnis.length === 1 && tMin[0] > 0) {
        acum(dicN0A, `${dnis[0]}|AEROPUERTO|${diaNom}|${franja}|E`, tMin[0])
        acum(dicN0B, `${dnis[0]}|AEROPUERTO|${grupoD}|${franja}|E`, tMin[0])
      } else {
        for (let i = 0; i < dnis.length - 1; i++) {
          if (tMin[i] > 0) {
            acum(dicN0A, `${dnis[i]}|${dnis[i+1]}|${diaNom}|${franja}|E`, tMin[i])
            acum(dicN0B, `${dnis[i]}|${dnis[i+1]}|${grupoD}|${franja}|E`, tMin[i])
          }
        }
        const last = dnis.length - 1
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

  if (fi % 200 === 0) process.stdout.write(`\r  Procesando fila ${fi}/${rows.length}...`)
}
console.log()

log(`\nResumen:`)
log(`  Nuevos: ${cntNuevos} | Duplicados: ${cntDupl} | Sin DNI: ${cntSinDNI}`)
log(`  Pares N0A nuevos: ${Object.keys(dicN0A).length}`)
log(`  Pares N0B nuevos: ${Object.keys(dicN0B).length}`)

if (cntNuevos === 0) {
  log('\n⚠️  No hay registros nuevos para cargar.')
  process.exit(0)
}

// ── Guardar en Supabase ────────────────────────────────────────────────────────
log('\n📊 Guardando historico en Supabase...')
const r1 = await upsertLotes('historico', filasHistorico, 'id_servicio')
log(`  ✅ ${r1.ins} insertadas, ${r1.err} errores`)

// ── Actualizar N0A ─────────────────────────────────────────────────────────────
if (Object.keys(dicN0A).length > 0) {
  log('\n📊 Actualizando ETA_N0A...')

  // Cargar N0A existente para hacer merge
  const { data: n0aExist } = await supabase.from('eta_n0a')
    .select('dni_de,dni_a,dia,franja,es,minutos,n_reg')
  const n0aMap = {}
  ;(n0aExist||[]).forEach(r => {
    const k = `${r.dni_de}|${r.dni_a}|${r.dia}|${r.franja}|${r.es}`
    n0aMap[k] = (r.minutos||'').split(';').map(v => parseFloat(v)).filter(v => !isNaN(v))
  })

  // Merge con nuevos valores
  Object.entries(dicN0A).forEach(([k, vals]) => {
    if (!n0aMap[k]) n0aMap[k] = []
    n0aMap[k] = [...n0aMap[k], ...vals]
  })

  const filasN0A = Object.entries(n0aMap).map(([k, vals]) => {
    const p = k.split('|')
    return { dni_de: p[0], dni_a: p[1], dia: p[2], franja: p[3], es: p[4],
             minutos: vals.join(';'), n_reg: vals.length }
  })

  const r2 = await upsertLotes('eta_n0a', filasN0A, 'dni_de,dni_a,dia,franja,es')
  log(`  ✅ ${r2.ins} filas N0A actualizadas`)
}

// ── Actualizar N0B ─────────────────────────────────────────────────────────────
if (Object.keys(dicN0B).length > 0) {
  log('\n📊 Actualizando ETA_N0B...')

  const { data: n0bExist } = await supabase.from('eta_n0b')
    .select('dni_de,dni_a,grupo_dia,franja,es,minutos')
  const n0bMap = {}
  ;(n0bExist||[]).forEach(r => {
    const k = `${r.dni_de}|${r.dni_a}|${r.grupo_dia}|${r.franja}|${r.es}`
    n0bMap[k] = (r.minutos||'').split(';').map(v => parseFloat(v)).filter(v => !isNaN(v))
  })

  Object.entries(dicN0B).forEach(([k, vals]) => {
    if (!n0bMap[k]) n0bMap[k] = []
    n0bMap[k] = [...n0bMap[k], ...vals]
  })

  const filasN0B = Object.entries(n0bMap).map(([k, vals]) => {
    const p = k.split('|')
    return { dni_de: p[0], dni_a: p[1], grupo_dia: p[2], franja: p[3], es: p[4],
             minutos: vals.join(';'), n_reg: vals.length }
  })

  const r3 = await upsertLotes('eta_n0b', filasN0B, 'dni_de,dni_a,grupo_dia,franja,es')
  log(`  ✅ ${r3.ins} filas N0B actualizadas`)
}

log('\n🎉 Carga completada.')
log(`   Nuevos servicios: ${cntNuevos}`)
log(`   Sin DNI extraído: ${cntSinDNI}`)
