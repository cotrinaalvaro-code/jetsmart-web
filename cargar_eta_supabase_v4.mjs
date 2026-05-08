/**
 * cargar_eta_supabase_v4.mjs
 * JetSmart — Carga ETA v4 + TomTom + Histórico a Supabase
 *
 * USO:
 *   node cargar_eta_supabase_v4.mjs
 *
 * PREREQUISITOS:
 *   npm install xlsx @supabase/supabase-js
 *   Archivo Excel: SistemaJetSmart.xlsm en la misma carpeta
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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function log(msg) { console.log(`[${new Date().toLocaleTimeString('es-PE')}] ${msg}`) }

async function upsertLotes(tabla, filas, conflictKey) {
  let insertadas = 0, errores = 0
  for (let i = 0; i < filas.length; i += BATCH_SIZE) {
    const lote = filas.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from(tabla)
      .upsert(lote, { onConflict: conflictKey, ignoreDuplicates: false })
    if (error) {
      console.error(`\n  ❌ Error lote ${i}-${i+BATCH_SIZE}:`, error.message)
      errores += lote.length
    } else {
      insertadas += lote.length
    }
    process.stdout.write(`\r  → ${Math.min(i + BATCH_SIZE, filas.length)} / ${filas.length} filas...`)
  }
  console.log()
  return { insertadas, errores }
}

function str(v)  { if (v == null || v === '') return null; return String(v).trim() || null }
function num(v)  { if (v == null || v === '') return null; const n = parseFloat(String(v).replace(',','.')); return isNaN(n) ? null : n }

// ── Leer Excel ────────────────────────────────────────────────────────────────
log('Leyendo Excel...')
let wb
try {
  wb = XLSX.read(readFileSync(EXCEL_FILE), { type: 'buffer', cellDates: false })
} catch (e) {
  console.error('❌ No se pudo leer el Excel:', e.message)
  process.exit(1)
}
log(`Hojas: ${wb.SheetNames.join(', ')}`)

// ── 1. ETA_N0A ────────────────────────────────────────────────────────────────
log('\n📊 Cargando ETA_N0A...')
{
  const ws = wb.Sheets['ETA_N0A']
  if (!ws) { log('⚠️  Hoja ETA_N0A no encontrada') } else {
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    const filas = []
    for (let i = 3; i < rows.length; i++) {
      const r = rows[i]
      if (!r[0] && !r[1]) continue
      const minVal = str(r[5])
      if (!minVal) continue
      filas.push({
        dni_de:  str(r[0]),
        dni_a:   str(r[1]),
        dia:     str(r[2]),
        franja:  str(r[3]),
        es:      str(r[4]),
        minutos: minVal,   // puede ser "27.1" o "20.5;22.3;19.8"
        n_reg:   num(r[6]),
      })
    }
    log(`  ${filas.length} filas`)
    const { insertadas, errores } = await upsertLotes('eta_n0a', filas, 'dni_de,dni_a,dia,franja,es')
    log(`  ✅ ${insertadas} insertadas, ${errores} errores`)
  }
}

// ── 2. ETA_N0B ────────────────────────────────────────────────────────────────
log('\n📊 Cargando ETA_N0B...')
{
  const ws = wb.Sheets['ETA_N0B']
  if (!ws) { log('⚠️  Hoja ETA_N0B no encontrada') } else {
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    const filas = []
    for (let i = 3; i < rows.length; i++) {
      const r = rows[i]
      if (!r[0] && !r[1]) continue
      const minVal = str(r[5])
      if (!minVal) continue
      filas.push({
        dni_de:    str(r[0]),
        dni_a:     str(r[1]),
        grupo_dia: str(r[2]),
        franja:    str(r[3]),
        es:        str(r[4]),
        minutos:   minVal,
        n_reg:     num(r[6]),
      })
    }
    log(`  ${filas.length} filas`)
    const { insertadas, errores } = await upsertLotes('eta_n0b', filas, 'dni_de,dni_a,grupo_dia,franja,es')
    log(`  ✅ ${insertadas} insertadas, ${errores} errores`)
  }
}

// ── 3. ETA_N1 (sigue siendo ETA_N1 en v4) ────────────────────────────────────
log('\n📊 Cargando ETA_N1...')
{
  // En v4 ETA_N1 puede estar dentro de VEL_CALIBRADAS o seguir siendo ETA_N1
  // Intentamos ambas hojas
  const wsName = wb.SheetNames.includes('ETA_N1') ? 'ETA_N1' : null
  if (!wsName) { log('⚠️  Hoja ETA_N1 no encontrada, saltando') } else {
    const ws = wb.Sheets[wsName]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    const filas = []
    for (let i = 3; i < rows.length; i++) {
      const r = rows[i]
      if (!r[0]) continue
      const minVal = str(r[4])
      if (!minVal) continue
      filas.push({
        zona:    str(r[0]),
        franja:  str(r[1]),
        pax:     num(r[2]),
        es:      str(r[3]),
        minutos: minVal,
        n_reg:   num(r[5]),
      })
    }
    log(`  ${filas.length} filas`)
    const { insertadas, errores } = await upsertLotes('eta_n1', filas, 'zona,franja,pax,es')
    log(`  ✅ ${insertadas} insertadas, ${errores} errores`)
  }
}

// ── 4. ETA_N2 ─────────────────────────────────────────────────────────────────
log('\n📊 Cargando ETA_N2...')
{
  const wsName = wb.SheetNames.includes('ETA_N2') ? 'ETA_N2' : null
  if (!wsName) { log('⚠️  Hoja ETA_N2 no encontrada, saltando') } else {
    const ws = wb.Sheets[wsName]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    const filas = []
    for (let i = 3; i < rows.length; i++) {
      const r = rows[i]
      if (!r[0]) continue
      const minVal = str(r[3])
      if (!minVal) continue
      filas.push({
        zona:    str(r[0]),
        franja:  str(r[1]),
        es:      str(r[2]),
        minutos: minVal,
        n_reg:   num(r[4]),
      })
    }
    log(`  ${filas.length} filas`)
    const { insertadas, errores } = await upsertLotes('eta_n2', filas, 'zona,franja,es')
    log(`  ✅ ${insertadas} insertadas, ${errores} errores`)
  }
}

// ── 5. ETA_TOMTOM ─────────────────────────────────────────────────────────────
log('\n📊 Cargando ETA_TOMTOM...')
{
  const ws = wb.Sheets['ETA_TOMTOM']
  if (!ws) { log('⚠️  Hoja ETA_TOMTOM no encontrada, saltando') } else {
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    const filas = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r[0] || !r[1]) continue
      filas.push({
        dni_de:         str(r[0]),
        dni_a:          str(r[1]),
        franja:         str(r[2]),
        minutos:        num(r[3]),
        fecha_consulta: str(r[4]),
      })
    }
    log(`  ${filas.length} filas`)
    const { insertadas, errores } = await upsertLotes('eta_tomtom', filas, 'dni_de,dni_a,franja')
    log(`  ✅ ${insertadas} insertadas, ${errores} errores`)
  }
}

// ── 6. BASE_HISTORICO_LIMPIO ──────────────────────────────────────────────────
log('\n📊 Cargando BASE_HISTORICO_LIMPIO...')
{
  const ws = wb.Sheets['BASE_HISTORICO_LIMPIO']
  if (!ws) { log('⚠️  Hoja BASE_HISTORICO_LIMPIO no encontrada') } else {
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    const filas = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r[0]) continue
      filas.push({
        id_servicio:      str(r[0]),
        fecha:            str(r[1]),
        hora_inicio:      str(r[2]),
        hora_fin:         str(r[3]),
        tiempo_total_min: num(r[4]),
        cant_usuarios:    num(r[5]),
        entrada_salida:   str(r[6]),
        dni_1:            str(r[7]),
        nombre_1:         str(r[8]),
        cargo_1:          str(r[9]),
        zona_1:           str(r[10]),
        lat_1:            num(r[11]),
        lon_1:            num(r[12]),
        dni_2:            str(r[13]),
        nombre_2:         str(r[14]),
        cargo_2:          str(r[15]),
        zona_2:           str(r[16]),
        lat_2:            num(r[17]),
        lon_2:            num(r[18]),
        dni_3:            str(r[19]),
        nombre_3:         str(r[20]),
        cargo_3:          str(r[21]),
        zona_3:           str(r[22]),
        lat_3:            num(r[23]),
        lon_3:            num(r[24]),
        dni_4:            str(r[25]),
        nombre_4:         str(r[26]),
        cargo_4:          str(r[27]),
        zona_4:           str(r[28]),
        lat_4:            num(r[29]),
        lon_4:            num(r[30]),
        zona_origen:      str(r[31]),
        tipo_servicio:    str(r[32]),
        vuelo:            str(r[33]),
        franja_horaria:   str(r[34]),
        parada_1:         str(r[35]),
        t_min_parada_1:   num(r[36]),
        parada_2:         str(r[37]),
        t_min_parada_2:   num(r[38]),
        parada_3:         str(r[39]),
        t_min_parada_3:   num(r[40]),
        parada_4:         str(r[41]),
        t_min_parada_4:   num(r[42]),
        parada_5:         str(r[43]),
        t_min_parada_5:   num(r[44]),
        parada_6:         str(r[45]),
        t_min_parada_6:   num(r[46]),
        observacion:      str(r[47]),
      })
    }
    log(`  ${filas.length} filas`)
    const { insertadas, errores } = await upsertLotes('historico', filas, 'id_servicio')
    log(`  ✅ ${insertadas} insertadas, ${errores} errores`)
  }
}

log('\n🎉 Carga v4 completada.')
