/**
 * reconstruir_eta.mjs
 * JetSmart — Reconstruye ETA_N0A y ETA_N0B desde BASE_HISTORICO_LIMPIO
 * Replica exactamente la función ActualizarTablasETA de la macro VBA
 *
 * USO:
 *   node reconstruir_eta.mjs
 *
 * PREREQUISITOS:
 *   npm install xlsx @supabase/supabase-js
 *   Archivo: SistemaJetSmart.xlsm en la misma carpeta
 */

import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://boosebgyavjeoioppriu.supabase.co'
const SUPABASE_KEY = 'sb_publishable_HiJaBpjGmKdyCCUCRt4jnA_7tvGbDXI'
const EXCEL_FILE   = join(__dirname, 'SistemaJetSmart.xlsm')
const BATCH_SIZE   = 500
const MAX_TIEMPO   = 90  // máximo minutos por tramo (igual que macro)

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function log(msg) { console.log(`[${new Date().toLocaleTimeString('es-PE')}] ${msg}`) }

// ── Helpers ────────────────────────────────────────────────────────────────────
function getDiaNombre(fechaStr) {
  // fechaStr = DD/MM/YYYY
  try {
    const [d, m, y] = fechaStr.split('/').map(Number)
    const fecha = new Date(y, m - 1, d)
    return ['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo'][
      (fecha.getDay() + 6) % 7  // lunes=0
    ]
  } catch { return 'Lunes' }
}

function getGrupoDia(fechaStr) {
  try {
    const [d, m, y] = fechaStr.split('/').map(Number)
    const fecha = new Date(y, m - 1, d)
    const wd = (fecha.getDay() + 6) % 7  // 0=lun, 1=mar...6=dom
    if (wd === 0) return 'LUN'
    if (wd >= 1 && wd <= 3) return 'MAR-JUE'
    if (wd === 4) return 'VIE'
    if (wd === 5) return 'SAB'
    return 'DOM'
  } catch { return 'MAR-JUE' }
}

function getFranja(horaStr) {
  if (!horaStr || !horaStr.includes(':')) return 'Valle'
  const h = parseInt(horaStr.split(':')[0])
  if (h >= 0  && h < 6)  return 'Valle'
  if (h >= 6  && h < 9)  return 'Punta AM'
  if (h >= 9  && h < 13) return 'Intermedio bajo'
  if (h >= 13 && h < 16) return 'Intermedio alto'
  return 'Punta PM'
}

function str(v) { if (v == null || v === '') return null; return String(v).trim() || null }
function num(v) { if (v == null || v === '') return null; const n = parseFloat(String(v).replace(',','.')); return isNaN(n) ? null : n }

function acumular(dic, k, val) {
  if (val < 5 || val > MAX_TIEMPO) return  // descartar valores imposibles
  if (dic[k] === undefined) dic[k] = []
  dic[k].push(Math.round(val * 10) / 10)
}

async function upsertLotes(tabla, filas, conflictKey) {
  let insertadas = 0, errores = 0
  for (let i = 0; i < filas.length; i += BATCH_SIZE) {
    const lote = filas.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from(tabla)
      .upsert(lote, { onConflict: conflictKey, ignoreDuplicates: false })
    if (error) {
      console.error(`\n  ❌ Error lote ${i}:`, error.message)
      errores += lote.length
    } else {
      insertadas += lote.length
    }
    process.stdout.write(`\r  → ${Math.min(i + BATCH_SIZE, filas.length)} / ${filas.length}...`)
  }
  console.log()
  return { insertadas, errores }
}

// ── Leer Excel ────────────────────────────────────────────────────────────────
log('Leyendo Excel...')
const wb = XLSX.read(readFileSync(EXCEL_FILE), { type: 'buffer', cellDates: false })
log(`Hojas: ${wb.SheetNames.join(', ')}`)

const wsHist = wb.Sheets['BASE_HISTORICO_LIMPIO']
if (!wsHist) { console.error('❌ No se encontró BASE_HISTORICO_LIMPIO'); process.exit(1) }

const rows = XLSX.utils.sheet_to_json(wsHist, { header: 1, defval: '' })
log(`BASE_HISTORICO_LIMPIO: ${rows.length - 1} filas de datos`)

// ── Columnas (índice 0-based) ─────────────────────────────────────────────────
// Col 1=ID_SERVICIO, 2=FECHA, 3=HORA_INICIO, 4=HORA_FIN, 5=TIEMPO_TOTAL_MIN
// Col 6=CANT_USUARIOS, 7=ENTRADA_SALIDA, 8=DNI_1..11=ZONA_1..13=DNI_2..
// Col 32=ZONA_ORIGEN, 34=VUELO, 35=FRANJA_HORARIA
// Col 37=T_MIN_PARADA_1, 39=T_MIN_PARADA_2, 41=T_MIN_PARADA_3...
const C = {
  FECHA:    1,  // DD/MM/YYYY
  H_INI:    2,  // HH:MM
  TMIN:     4,  // tiempo total min
  CANT:     5,  // cant usuarios
  ES:       6,  // E/S  ← COLUMNA 7 (índice 6)
  VUELO:    6,  // mismo campo — revisar abajo
  DNI1:     7,  // índice 7
  DNI2:     13,
  DNI3:     19,
  DNI4:     25,
  FRANJA:   34,
  T1:       36, // T_MIN_PARADA_1
  T2:       38,
  T3:       40,
  T4:       42,
  T5:       44,
  T6:       46,
}

// Verificar headers de fila 1
const headers = rows[0]
log('Headers verificados:')
log(`  Col 7(idx6): ${headers[6]} | Col 8(idx7): ${headers[7]} | Col 34(idx33): ${headers[33]} | Col 35(idx34): ${headers[34]}`)

// Ajustar según headers reales
const idxES    = headers.findIndex(h => String(h).trim() === 'ENTRADA_SALIDA')
const idxVuelo = headers.findIndex(h => String(h).trim() === 'VUELO')
const idxFranja= headers.findIndex(h => String(h).trim() === 'FRANJA_HORARIA')
const idxFecha = headers.findIndex(h => String(h).trim() === 'FECHA')
const idxHIni  = headers.findIndex(h => String(h).trim() === 'HORA_INICIO')
const idxCant  = headers.findIndex(h => String(h).trim() === 'CANT_USUARIOS')
const idxDNI1  = headers.findIndex(h => String(h).trim() === 'DNI_1')
const idxDNI2  = headers.findIndex(h => String(h).trim() === 'DNI_2')
const idxDNI3  = headers.findIndex(h => String(h).trim() === 'DNI_3')
const idxDNI4  = headers.findIndex(h => String(h).trim() === 'DNI_4')
const idxT1    = headers.findIndex(h => String(h).trim() === 'T_MIN_PARADA_1')
const idxT2    = headers.findIndex(h => String(h).trim() === 'T_MIN_PARADA_2')
const idxT3    = headers.findIndex(h => String(h).trim() === 'T_MIN_PARADA_3')
const idxT4    = headers.findIndex(h => String(h).trim() === 'T_MIN_PARADA_4')
const idxT5    = headers.findIndex(h => String(h).trim() === 'T_MIN_PARADA_5')
const idxT6    = headers.findIndex(h => String(h).trim() === 'T_MIN_PARADA_6')

log(`Índices: ES=${idxES} VUELO=${idxVuelo} FRANJA=${idxFranja} FECHA=${idxFecha} DNI1=${idxDNI1} T1=${idxT1}`)

// ── Construir diccionarios N0A y N0B ──────────────────────────────────────────
log('\nProcesando histórico para reconstruir N0A y N0B...')

const dicN0A = {}  // k → [val1, val2, ...]
const dicN0B = {}

let cntPares = 0, cntFilas = 0

for (let fi = 1; fi < rows.length; fi++) {
  const r = rows[fi]
  
  const vFecha  = str(r[idxFecha])
  const vHIni   = str(r[idxHIni])
  const vTMin   = num(r[idxT1 - 1])  // TIEMPO_TOTAL_MIN está en col 5 (idx 4)
  const vCant   = num(r[idxCant])
  const vES     = str(r[idxES])
  const vVuelo  = str(r[idxVuelo])
  
  if (!vFecha || !vHIni || !vES || !vCant) continue
  if (vCant < 1 || vCant > 4) continue
  
  const franja5 = getFranja(vHIni)
  if (!franja5) continue
  
  const diaNom  = getDiaNombre(vFecha)
  const grupoD  = getGrupoDia(vFecha)
  const esUp    = vES.toUpperCase().trim()
  
  // Recopilar DNIs en orden
  const dniIdxs = [idxDNI1, idxDNI2, idxDNI3, idxDNI4]
  const dnis = []
  for (const idx of dniIdxs) {
    if (idx < 0) continue
    const v = str(r[idx])
    if (v && v.length >= 6 && v.length <= 8 && /^\d+$/.test(v)) {
      dnis.push(v.toUpperCase())
    }
  }
  
  // Tiempos de parada
  const tIdxs = [idxT1, idxT2, idxT3, idxT4, idxT5, idxT6]
  const tTramo = tIdxs.map(i => i >= 0 ? (num(r[i]) || 0) : 0)
  
  if (dnis.length === 0) continue
  cntFilas++

  if (esUp === 'E') {
    // Tramos entre DNIs: DNI[0]→DNI[1], DNI[1]→DNI[2], ...
    for (let pi = 0; pi < dnis.length - 1; pi++) {
      const t = tTramo[pi]
      if (t > 0) {
        const kA = `${dnis[pi]}|${dnis[pi+1]}|${diaNom}|${franja5}|E`
        const kB = `${dnis[pi]}|${dnis[pi+1]}|${grupoD}|${franja5}|E`
        acumular(dicN0A, kA, t)
        acumular(dicN0B, kB, t)
        cntPares++
      }
    }
    // Último tramo: DNI[n-1] → AEROPUERTO
    const tUlt = tTramo[dnis.length - 1]
    if (tUlt > 0) {
      const kA = `${dnis[dnis.length-1]}|AEROPUERTO|${diaNom}|${franja5}|E`
      const kB = `${dnis[dnis.length-1]}|AEROPUERTO|${grupoD}|${franja5}|E`
      acumular(dicN0A, kA, tUlt)
      acumular(dicN0B, kB, tUlt)
      cntPares++
    }
  } else if (esUp === 'S') {
    // Primer tramo: AEROPUERTO → DNI[0]
    const tAero = tTramo[0]
    if (tAero > 0) {
      const kA = `AEROPUERTO|${dnis[0]}|${diaNom}|${franja5}|S`
      const kB = `AEROPUERTO|${dnis[0]}|${grupoD}|${franja5}|S`
      acumular(dicN0A, kA, tAero)
      acumular(dicN0B, kB, tAero)
      cntPares++
    }
    // Tramos entre DNIs: DNI[0]→DNI[1], ...
    for (let pi = 1; pi < dnis.length; pi++) {
      const t = tTramo[pi]
      if (t > 0) {
        const kA = `${dnis[pi-1]}|${dnis[pi]}|${diaNom}|${franja5}|S`
        const kB = `${dnis[pi-1]}|${dnis[pi]}|${grupoD}|${franja5}|S`
        acumular(dicN0A, kA, t)
        acumular(dicN0B, kB, t)
        cntPares++
      }
    }
  }
}

log(`  Procesadas ${cntFilas} filas, ${cntPares} pares de tramos`)

// ── Convertir diccionarios a filas para Supabase ──────────────────────────────
function dicToFilas(dic, tipo) {
  const filas = []
  for (const [k, vals] of Object.entries(dic)) {
    const partes = k.split('|')
    if (tipo === 'N0A' && partes.length === 5) {
      filas.push({
        dni_de:  partes[0],
        dni_a:   partes[1],
        dia:     partes[2],
        franja:  partes[3],
        es:      partes[4],
        minutos: vals.join(';'),
        n_reg:   vals.length,
      })
    } else if (tipo === 'N0B' && partes.length === 5) {
      filas.push({
        dni_de:    partes[0],
        dni_a:     partes[1],
        grupo_dia: partes[2],
        franja:    partes[3],
        es:        partes[4],
        minutos:   vals.join(';'),
        n_reg:     vals.length,
      })
    }
  }
  return filas
}

const filasN0A = dicToFilas(dicN0A, 'N0A')
const filasN0B = dicToFilas(dicN0B, 'N0B')
log(`\nN0A: ${filasN0A.length} pares únicos`)
log(`N0B: ${filasN0B.length} pares únicos`)

// ── Borrar y recargar en Supabase ─────────────────────────────────────────────
log('\n🗑️  Borrando eta_n0a...')
await supabase.from('eta_n0a').delete().neq('id', 0)

log('📊 Cargando ETA_N0A...')
const r1 = await upsertLotes('eta_n0a', filasN0A, 'dni_de,dni_a,dia,franja,es')
log(`  ✅ ${r1.insertadas} insertadas, ${r1.errores} errores`)

log('\n🗑️  Borrando eta_n0b...')
await supabase.from('eta_n0b').delete().neq('id', 0)

log('📊 Cargando ETA_N0B...')
const r2 = await upsertLotes('eta_n0b', filasN0B, 'dni_de,dni_a,grupo_dia,franja,es')
log(`  ✅ ${r2.insertadas} insertadas, ${r2.errores} errores`)

// ── También cargar ETA_TOMTOM del Excel ──────────────────────────────────────
log('\n📊 Cargando ETA_TOMTOM del Excel...')
const wsTT = wb.Sheets['ETA_TOMTOM']
if (wsTT) {
  const ttRows = XLSX.utils.sheet_to_json(wsTT, { header: 1, defval: '' })
  const ttHeaders = ttRows[0] || []
  log(`  Headers TomTom: ${ttHeaders.slice(0,6).join(', ')}`)
  
  const ttFilas = []
  for (let i = 1; i < ttRows.length; i++) {
    const r = ttRows[i]
    const dniDe = str(r[0])
    const dniA  = str(r[1])
    const franja = str(r[2])
    const mins   = num(r[3])
    if (!dniDe || !dniA || !franja || !mins) continue
    ttFilas.push({
      dni_de: dniDe.toUpperCase(),
      dni_a:  dniA.toUpperCase(),
      franja,
      minutos: mins,
      fecha_consulta: new Date().toISOString().slice(0,10)
    })
  }
  log(`  ${ttFilas.length} filas TomTom`)
  await supabase.from('eta_tomtom').delete().neq('id', 0)
  const r3 = await upsertLotes('eta_tomtom', ttFilas, 'dni_de,dni_a,franja')
  log(`  ✅ ${r3.insertadas} insertadas`)
}

log('\n🎉 Reconstrucción ETA completada.')
log('   Ahora prueba Calcular ETA en la web — deberías ver más Hist.exacto y Hist.agrupado.')
