/**
 * cargar_eta_supabase.mjs
 * JetSmart — Carga inicial de tablas ETA e Histórico a Supabase
 *
 * USO:
 *   1. Copia este archivo a: C:\Users\anthony\Desktop\jetsmart-web\
 *   2. Copia el Excel a:      C:\Users\anthony\Desktop\jetsmart-web\SistemaJetSmart.xlsm
 *   3. En la terminal ejecuta:
 *        node cargar_eta_supabase.mjs
 *
 * PREREQUISITOS (ejecutar una sola vez):
 *   npm install xlsx @supabase/supabase-js
 */

import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Configuración ─────────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://boosebgyavjeoioppriu.supabase.co'
const SUPABASE_KEY  = 'sb_publishable_HiJaBpjGmKdyCCUCRt4jnA_7tvGbDXI'
const EXCEL_FILE    = join(__dirname, 'SistemaJetSmart.xlsm')
const BATCH_SIZE    = 500   // filas por lote (Supabase acepta hasta 1000)

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Helpers ───────────────────────────────────────────────────────────────────
function log(msg) { console.log(`[${new Date().toLocaleTimeString('es-PE')}] ${msg}`) }

async function upsertLotes(tabla, filas, conflictKey) {
  let insertadas = 0
  let errores = 0
  for (let i = 0; i < filas.length; i += BATCH_SIZE) {
    const lote = filas.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from(tabla)
      .upsert(lote, { onConflict: conflictKey, ignoreDuplicates: true })
    if (error) {
      console.error(`  ❌ Error en lote ${i}-${i+BATCH_SIZE}:`, error.message)
      errores += lote.length
    } else {
      insertadas += lote.length
    }
    process.stdout.write(`\r  → ${Math.min(i + BATCH_SIZE, filas.length)} / ${filas.length} filas...`)
  }
  console.log()
  return { insertadas, errores }
}

function limpiarNum(v) {
  if (v === null || v === undefined || v === '') return null
  const n = parseFloat(String(v).replace(',', '.'))
  return isNaN(n) ? null : n
}

function limpiarStr(v) {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

// ── Leer Excel ────────────────────────────────────────────────────────────────
log('Leyendo Excel...')
let wb
try {
  const buf = readFileSync(EXCEL_FILE)
  wb = XLSX.read(buf, { type: 'buffer', cellDates: false })
} catch (e) {
  console.error('❌ No se pudo leer el Excel:', e.message)
  console.error('   Asegúrate de que el archivo se llama "SistemaJetSmart.xlsm" y está en la carpeta jetsmart-web')
  process.exit(1)
}

const hojas = wb.SheetNames
log(`Hojas encontradas: ${hojas.join(', ')}`)

// ── 1. ETA_N0A ────────────────────────────────────────────────────────────────
log('\n📊 Cargando ETA_N0A...')
{
  const ws = wb.Sheets['ETA_N0A']
  if (!ws) { log('⚠️  Hoja ETA_N0A no encontrada, saltando...') }
  else {
    // La hoja tiene 2 filas de título antes del header
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    // Fila 3 (índice 2) es el header: DNI_DE, DNI_A, DIA, FRANJA, E/S, MINUTOS, N_REG
    const filas = []
    for (let i = 3; i < rows.length; i++) {
      const r = rows[i]
      if (!r[0] && !r[1]) continue
      filas.push({
        dni_de:  limpiarStr(r[0]),
        dni_a:   limpiarStr(r[1]),
        dia:     limpiarStr(r[2]),
        franja:  limpiarStr(r[3]),
        es:      limpiarStr(r[4]),
        minutos: limpiarNum(r[5]),
        n_reg:   limpiarNum(r[6]),
      })
    }
    log(`  ${filas.length} filas leídas`)
    const { insertadas, errores } = await upsertLotes('eta_n0a', filas, 'dni_de,dni_a,dia,franja,es')
    log(`  ✅ ${insertadas} insertadas, ${errores} errores`)
  }
}

// ── 2. ETA_N0B ────────────────────────────────────────────────────────────────
log('\n📊 Cargando ETA_N0B...')
{
  const ws = wb.Sheets['ETA_N0B']
  if (!ws) { log('⚠️  Hoja ETA_N0B no encontrada, saltando...') }
  else {
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    const filas = []
    for (let i = 3; i < rows.length; i++) {
      const r = rows[i]
      if (!r[0] && !r[1]) continue
      filas.push({
        dni_de:     limpiarStr(r[0]),
        dni_a:      limpiarStr(r[1]),
        grupo_dia:  limpiarStr(r[2]),
        franja:     limpiarStr(r[3]),
        es:         limpiarStr(r[4]),
        minutos:    limpiarNum(r[5]),
        n_reg:      limpiarNum(r[6]),
      })
    }
    log(`  ${filas.length} filas leídas`)
    const { insertadas, errores } = await upsertLotes('eta_n0b', filas, 'dni_de,dni_a,grupo_dia,franja,es')
    log(`  ✅ ${insertadas} insertadas, ${errores} errores`)
  }
}

// ── 3. ETA_N1 ─────────────────────────────────────────────────────────────────
log('\n📊 Cargando ETA_N1...')
{
  const ws = wb.Sheets['ETA_N1']
  if (!ws) { log('⚠️  Hoja ETA_N1 no encontrada, saltando...') }
  else {
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    const filas = []
    for (let i = 3; i < rows.length; i++) {
      const r = rows[i]
      if (!r[0]) continue
      filas.push({
        zona:    limpiarStr(r[0]),
        franja:  limpiarStr(r[1]),
        pax:     limpiarNum(r[2]),
        es:      limpiarStr(r[3]),
        minutos: limpiarNum(r[4]),
        n_reg:   limpiarNum(r[5]),
      })
    }
    log(`  ${filas.length} filas leídas`)
    const { insertadas, errores } = await upsertLotes('eta_n1', filas, 'zona,franja,pax,es')
    log(`  ✅ ${insertadas} insertadas, ${errores} errores`)
  }
}

// ── 4. ETA_N2 ─────────────────────────────────────────────────────────────────
log('\n📊 Cargando ETA_N2...')
{
  const ws = wb.Sheets['ETA_N2']
  if (!ws) { log('⚠️  Hoja ETA_N2 no encontrada, saltando...') }
  else {
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    const filas = []
    for (let i = 3; i < rows.length; i++) {
      const r = rows[i]
      if (!r[0]) continue
      filas.push({
        zona:    limpiarStr(r[0]),
        franja:  limpiarStr(r[1]),
        es:      limpiarStr(r[2]),
        minutos: limpiarNum(r[3]),
        n_reg:   limpiarNum(r[4]),
      })
    }
    log(`  ${filas.length} filas leídas`)
    const { insertadas, errores } = await upsertLotes('eta_n2', filas, 'zona,franja,es')
    log(`  ✅ ${insertadas} insertadas, ${errores} errores`)
  }
}

// ── 5. BASE_HISTORICO_LIMPIO ──────────────────────────────────────────────────
log('\n📊 Cargando BASE_HISTORICO_LIMPIO...')
{
  const ws = wb.Sheets['BASE_HISTORICO_LIMPIO']
  if (!ws) { log('⚠️  Hoja BASE_HISTORICO_LIMPIO no encontrada, saltando...') }
  else {
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    const filas = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r[0]) continue
      filas.push({
        id_servicio:      limpiarStr(r[0]),
        fecha:            limpiarStr(r[1]),
        hora_inicio:      limpiarStr(r[2]),
        hora_fin:         limpiarStr(r[3]),
        tiempo_total_min: limpiarNum(r[4]),
        cant_usuarios:    limpiarNum(r[5]),
        entrada_salida:   limpiarStr(r[6]),
        dni_1:            limpiarStr(r[7]),
        nombre_1:         limpiarStr(r[8]),
        cargo_1:          limpiarStr(r[9]),
        zona_1:           limpiarStr(r[10]),
        lat_1:            limpiarNum(r[11]),
        lon_1:            limpiarNum(r[12]),
        dni_2:            limpiarStr(r[13]),
        nombre_2:         limpiarStr(r[14]),
        cargo_2:          limpiarStr(r[15]),
        zona_2:           limpiarStr(r[16]),
        lat_2:            limpiarNum(r[17]),
        lon_2:            limpiarNum(r[18]),
        dni_3:            limpiarStr(r[19]),
        nombre_3:         limpiarStr(r[20]),
        cargo_3:          limpiarStr(r[21]),
        zona_3:           limpiarStr(r[22]),
        lat_3:            limpiarNum(r[23]),
        lon_3:            limpiarNum(r[24]),
        dni_4:            limpiarStr(r[25]),
        nombre_4:         limpiarStr(r[26]),
        cargo_4:          limpiarStr(r[27]),
        zona_4:           limpiarStr(r[28]),
        lat_4:            limpiarNum(r[29]),
        lon_4:            limpiarNum(r[30]),
        zona_origen:      limpiarStr(r[31]),
        tipo_servicio:    limpiarStr(r[32]),
        vuelo:            limpiarStr(r[33]),
        franja_horaria:   limpiarStr(r[34]),
        parada_1:         limpiarStr(r[35]),
        t_min_parada_1:   limpiarNum(r[36]),
        parada_2:         limpiarStr(r[37]),
        t_min_parada_2:   limpiarNum(r[38]),
        parada_3:         limpiarStr(r[39]),
        t_min_parada_3:   limpiarNum(r[40]),
        parada_4:         limpiarStr(r[41]),
        t_min_parada_4:   limpiarNum(r[42]),
        parada_5:         limpiarStr(r[43]),
        t_min_parada_5:   limpiarNum(r[44]),
        parada_6:         limpiarStr(r[45]),
        t_min_parada_6:   limpiarNum(r[46]),
        observacion:      limpiarStr(r[47]),
      })
    }
    log(`  ${filas.length} filas leídas`)
    const { insertadas, errores } = await upsertLotes('historico', filas, 'id_servicio')
    log(`  ✅ ${insertadas} insertadas, ${errores} errores`)
  }
}

log('\n🎉 Carga inicial completada.')
